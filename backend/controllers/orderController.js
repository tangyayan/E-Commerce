const pool = require('../config/database');

// 获取用户订单详细信息
exports.getOrders = async (req, res) => {
    try {
        const userId = req.user.id; 
        
        // 1. 先查询该用户的所有订单
        const result = await pool.query(
            `SELECT * FROM Orders WHERE account_id = $1 ORDER BY created_at DESC`,
            [userId]
        );
        const orders = result.rows;

        // 2. 遍历每个订单，查询对应的商品详情 (包含图片)
        for (let order of orders) {
            const itemsResult = await pool.query(
                `SELECT oi.*, s.image_url 
                 FROM OrderItem oi
                 LEFT JOIN SKU k ON oi.sku_id = k.sku_id
                 LEFT JOIN SPU s ON k.spu_id = s.spu_id
                 WHERE oi.order_id = $1`,
                [order.order_id]
            );
            // 将查询到的商品列表挂载到 order 对象上
            order.items = itemsResult.rows;
        }

        res.json({ success: true, orders: orders });
    } catch (error) {
        console.error('获取订单失败:', error);
        res.status(500).json({ success: false, message: '获取订单失败' });
    }
};

// 创建订单
exports.createOrder = async (req, res) => {
    const client = await pool.connect();
    try {
        const userId = req.user.id;
        const { address_id } = req.body; // 收货地址ID

        await client.query('BEGIN'); // 开启事务

        // 获取购物车商品
        const cartItemsResult = await client.query(
            `SELECT ci.*, k.now_price, k.spu_id, s.name AS spu_name 
             FROM CartItem ci
             JOIN Cart c ON c.cart_id = ci.cart_id
             JOIN SKU k ON k.sku_id = ci.sku_id
             JOIN SPU s ON s.spu_id = k.spu_id
             WHERE c.account_id = $1`,
            [userId]
        );

        const cartItems = cartItemsResult.rows;
        if (cartItems.length === 0) {
            throw new Error('购物车为空，无法创建订单');
        }

        // 计算订单总金额
        const totalAmount = cartItems.reduce((sum, item) => sum + item.now_price * item.quantity, 0);

        // 获取收货地址快照
        const addressResult = await client.query(
            `SELECT address FROM shipping_address WHERE address_id = $1 AND account_id = $2`,
            [address_id, userId]
        );
        const addressSnapshot = addressResult.rows[0]?.address;
        if (!addressSnapshot) {
            throw new Error('收货地址不存在');
        }

        // 插入订单表
        const orderResult = await client.query(
            `INSERT INTO Orders (account_id, total_amount, status, created_at) 
             VALUES ($1, $2, 'PENDING', CURRENT_TIMESTAMP) RETURNING order_id`,
            [userId, totalAmount]
        );
        const orderId = orderResult.rows[0].order_id;

        // 插入订单项
        for (const item of cartItems) {
            await client.query(
                `INSERT INTO OrderItem (order_id, sku_id, quantity, price_snapshot, shipping_address_snapshot, spu_name_snapshot) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [orderId, item.sku_id, item.quantity, item.now_price, addressSnapshot, item.spu_name]
            );
        }

        // 清空购物车
        await client.query(
            `DELETE FROM CartItem WHERE cart_id = (SELECT cart_id FROM Cart WHERE account_id = $1)`,
            [userId]
        );

        await client.query('COMMIT'); // 提交事务
        res.status(201).json({ success: true, orderId });
    } catch (error) {
        await client.query('ROLLBACK'); // 回滚事务
        console.error('创建订单失败:', error);
        res.status(500).json({ success: false, message: error.message || '创建订单失败' });
    } finally {
        client.release();
    }
};

// 取消订单
exports.cancelOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const orderId = req.params.orderId;

        // 检查订单状态
        const orderResult = await pool.query(
            `SELECT * FROM Orders WHERE order_id = $1 AND account_id = $2`,
            [orderId, userId]
        );
        const order = orderResult.rows[0];
        if (!order) {
            return res.status(404).json({ success: false, message: '订单不存在' });
        }
        if (order.status !== 'PENDING') {
            return res.status(400).json({ success: false, message: '订单无法取消' });
        }

        // 更新订单状态为取消
        await pool.query(
            `UPDATE Orders SET status = 'CANCELLED' WHERE order_id = $1`,
            [orderId]
        );

        res.json({ success: true, message: '订单已取消' });
    } catch (error) {
        console.error('取消订单失败:', error);
        res.status(500).json({ success: false, message: '取消订单失败' });
    }
};