const pool = require('../config/database');

/**
 * 获取用户购物车
 */
exports.getCart = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const result = await pool.query(`
            SELECT c.cart_id, ci.*
            FROM cart c
            LEFT JOIN cartitem ci on ci.cart_id=c.cart_id
            WHERE c.account_id=$1
        `, [userId]);
        
        res.json({
            success: true,
            cart: result.rows,
            total: result.rows.length
        });
    } catch (error) {
        console.error('获取购物车错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
};

/**
 * 添加商品到购物车
 */
exports.addToCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { sku_id, quantity = 1 } = req.body;

        // 验证参数
        if (!sku_id) {
            return res.status(400).json({
                success: false,
                message: '缺少 SKU ID'
            });
        }
        
        if (quantity < 1) {
            return res.status(400).json({
                success: false,
                message: '数量必须大于 0'
            });
        }
        
        // 检查 SKU 是否存在
        const skuCheck = await pool.query(
            'SELECT sku_id FROM SKU WHERE sku_id = $1',
            [sku_id]
        );
        
        if (skuCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'SKU 不存在'
            });
        }
        
        // 检查库存
        const stockResult = await pool.query(`
            SELECT COALESCE(SUM(stock), 0) as total_stock
            FROM WarehouseStock
            WHERE sku_id = $1
        `, [sku_id]);
        
        const availableStock = parseInt(stockResult.rows[0].total_stock) || 0;
        
        if (availableStock < quantity) {
            return res.status(400).json({
                success: false,
                message: `库存不足，当前库存: ${availableStock}`
            });
        }
        
        // 检查购物车中是否已有该商品
        const existingCart = await pool.query(
            `SELECT c.cart_id, ci.quantity
            FROM cart c
            LEFT JOIN cartitem ci on ci.cart_id=c.cart_id
            WHERE c.account_id=$1 and ci.sku_id=$2`,
            [userId, sku_id]
        );
        // 查找用户的购物车ID
        const account_Cart = await pool.query(
            `SELECT c.cart_id  FROM cart c
            WHERE c.account_id=$1 `,
            [userId]
        );
        const cart_id = account_Cart.rows[0].cart_id;
        
        if (existingCart.rows.length > 0) {
            // 更新数量
            const newQuantity = existingCart.rows[0].quantity + quantity;
            
            if (availableStock < newQuantity) {
                return res.status(400).json({
                    success: false,
                    message: `库存不足，当前库存: ${availableStock}，购物车已有: ${existingCart.rows[0].quantity}`
                });
            }
            
            await pool.query(
                'UPDATE cartitem SET quantity = $1 WHERE cart_id = $2 AND sku_id = $3',
                [newQuantity, cart_id, sku_id]
            );
            
            res.json({
                success: true,
                message: '已更新购物车数量',
                cart_id: cart_id,
                quantity: newQuantity
            });
        } else {
            // 新增购物车项
            await pool.query(
                'INSERT INTO cartitem (cart_id, sku_id, quantity) VALUES ($1, $2, $3)',
                [cart_id, sku_id, quantity]
            );
            
            res.status(201).json({
                success: true,
                message: '已添加到购物车',
                cart_id: cart_id,
                quantity: quantity,
            });
        }
    } catch (error) {
        console.error('添加到购物车错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误: ' + error.message
        });
    }
};

/**
 * 更新购物车商品数量

exports.updateCartQuantity = async (req, res) => {
    try {
        const userId = req.user.id;
        const { cart_id, quantity } = req.body;
        
        if (!cart_id || quantity < 1) {
            return res.status(400).json({
                success: false,
                message: '参数错误'
            });
        }
        
        // 检查购物车项是否属于该用户
        const cartCheck = await pool.query(
            'SELECT c.sku_id FROM Cart c WHERE c.cart_id = $1 AND c.user_id = $2',
            [cart_id, userId]
        );
        
        if (cartCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '购物车项不存在'
            });
        }
        
        const skuId = cartCheck.rows[0].sku_id;
        
        // 检查库存
        const stockResult = await pool.query(`
            SELECT COALESCE(SUM(stock), 0) as total_stock
            FROM WarehouseStock
            WHERE sku_id = $1
        `, [skuId]);
        
        const availableStock = parseInt(stockResult.rows[0].total_stock) || 0;
        
        if (availableStock < quantity) {
            return res.status(400).json({
                success: false,
                message: `库存不足，当前库存: ${availableStock}`
            });
        }
        
        // 更新数量
        await pool.query(
            'UPDATE Cart SET quantity = $1 WHERE cart_id = $2',
            [quantity, cart_id]
        );
        
        res.json({
            success: true,
            message: '已更新数量',
            quantity: quantity
        });
    } catch (error) {
        console.error('更新购物车数量错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
};
 */

/**
 * 从购物车删除商品
 */
exports.removeFromCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { cart_id } = req.params;
        
        // 检查购物车项是否属于该用户
        const cartCheck = await pool.query(
            'SELECT cart_id FROM Cart WHERE cart_id = $1 AND user_id = $2',
            [cart_id, userId]
        );
        
        if (cartCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '购物车项不存在'
            });
        }
        
        // 删除购物车项
        await pool.query(
            'DELETE FROM Cart WHERE cart_id = $1',
            [cart_id]
        );
        
        res.json({
            success: true,
            message: '已从购物车删除'
        });
    } catch (error) {
        console.error('删除购物车项错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
};

/**
 * 清空购物车
 */
exports.clearCart = async (req, res) => {
    try {
        const userId = req.user.id;
        
        await pool.query('DELETE FROM Cart WHERE user_id = $1', [userId]);
        
        res.json({
            success: true,
            message: '购物车已清空'
        });
    } catch (error) {
        console.error('清空购物车错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
};