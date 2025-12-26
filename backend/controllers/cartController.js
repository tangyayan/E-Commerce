const pool = require('../config/database');

/**
 * 获取用户购物车数量
 */
exports.getCartCount = async (req, res) => {
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
 * 获取用户购物车详细信息
 */
exports.getCart = async (req, res) => {
    //图片，店铺，库存，单价，数量，总数，属性
    try {
        const userId = req.user.id;
        
        // const result = await pool.query(`
        //     WITH cart_items AS (
        //         -- 获取用户的购物车项
        //         SELECT 
        //             ci.cart_item_id,
        //             ci.cart_id,
        //             ci.sku_id,
        //             ci.quantity,
        //             ci.price_snapshot
        //         FROM Cart c
        //         INNER JOIN CartItem ci ON ci.cart_id = c.cart_id
        //         WHERE c.account_id = $1
        //     ),
        //     stock_summary AS (
        //         -- 计算每个 SKU 的库存汇总
        //         SELECT 
        //             ws.sku_id,
        //             w.shop_id,
        //             COALESCE(SUM(ws.stock), 0) as total_stock
        //         FROM WarehouseStock ws
        //         LEFT JOIN Warehouse w ON w.code = ws.code
        //         WHERE ws.sku_id IN (SELECT sku_id FROM cart_items)
        //         GROUP BY ws.sku_id, w.shop_id
        //     ),
        //     attribute_summary AS (
        //         -- 计算每个 SKU 的属性
        //         SELECT 
        //             skuv.sku_id,
        //             json_agg(
        //                 json_build_object(
        //                     'attr_name', ak.attr_name,
        //                     'value', v.value
        //                 ) ORDER BY ak.attr_id
        //             ) FILTER (WHERE v.value_id IS NOT NULL) as attributes
        //         FROM SKUAttributeValue skuv
        //         LEFT JOIN AttributeValue v ON v.value_id = skuv.value_id
        //         LEFT JOIN AttributeKey ak ON ak.attr_id = v.attr_id
        //         WHERE skuv.sku_id IN (SELECT sku_id FROM cart_items)
        //         GROUP BY skuv.sku_id
        //     )
        //     SELECT 
        //         ci.cart_item_id,
        //         ci.cart_id,
        //         ci.sku_id,
        //         ci.quantity,
        //         ci.price_snapshot,                        -- 加入购物车时的价格
        //         k.now_price,                              -- 当前价格
        //         k.origin_price,                           -- 原价
        //         k.barcode,
        //         spu.spu_id,
        //         spu.name as product_name,
        //         spu.image_url,
        //         spu.description,
        //         shop.shop_id,
        //         shop.shop_name,
        //         COALESCE(ss.total_stock, 0) as stock,    -- 库存
        //         COALESCE(ats.attributes, '[]'::json) as attributes  -- 属性
        //     FROM cart_items ci
        //     INNER JOIN SKU k ON k.sku_id = ci.sku_id
        //     INNER JOIN SPU spu ON spu.spu_id = k.spu_id
        //     INNER JOIN Shop shop ON shop.shop_id = spu.shop_id
        //     LEFT JOIN stock_summary ss ON ss.sku_id = k.sku_id
        //     LEFT JOIN attribute_summary ats ON ats.sku_id = k.sku_id
        //     ORDER BY shop.shop_id
        // `, [userId]);
        const result = await pool.query(`
            WITH cart_items AS (
                SELECT 
                    ci.cart_item_id,
                    ci.cart_id,
                    ci.sku_id,
                    ci.quantity,
                    ci.price_snapshot
                FROM Cart c
                INNER JOIN CartItem ci ON ci.cart_id = c.cart_id
                WHERE c.account_id = $1
            ),
            stock_summary AS (
                SELECT 
                    ws.sku_id,
                    w.shop_id,
                    COALESCE(SUM(ws.stock), 0) as total_stock
                FROM WarehouseStock ws
                LEFT JOIN Warehouse w ON w.code = ws.code
                WHERE ws.sku_id IN (SELECT sku_id FROM cart_items WHERE sku_id IS NOT NULL)
                GROUP BY ws.sku_id, w.shop_id
            ),
            attribute_summary AS (
                SELECT 
                    skuv.sku_id,
                    json_agg(
                        json_build_object(
                            'attr_name', ak.attr_name,
                            'value', v.value
                        ) ORDER BY ak.attr_id
                    ) FILTER (WHERE v.value_id IS NOT NULL) as attributes
                FROM SKUAttributeValue skuv
                LEFT JOIN AttributeValue v ON v.value_id = skuv.value_id
                LEFT JOIN AttributeKey ak ON ak.attr_id = v.attr_id
                WHERE skuv.sku_id IN (SELECT sku_id FROM cart_items WHERE sku_id IS NOT NULL)
                GROUP BY skuv.sku_id
            )
            SELECT 
                ci.cart_item_id,
                ci.cart_id,
                ci.sku_id,
                ci.quantity,
                ci.price_snapshot,
                COALESCE(k.now_price, 0) as now_price,
                COALESCE(k.origin_price, 0) as origin_price,
                k.barcode,
                spu.spu_id,
                spu.name as product_name,
                spu.image_url,
                spu.description,
                shop.shop_id,
                shop.shop_name,
                COALESCE(ss.total_stock, 0) as stock,
                COALESCE(ats.attributes, '[]'::json) as attributes,
                CASE 
                    WHEN ci.sku_id IS NULL OR k.sku_id IS NULL THEN true
                    ELSE false
                END as is_invalid
            FROM cart_items ci
            LEFT JOIN SKU k ON k.sku_id = ci.sku_id
            LEFT JOIN SPU spu ON spu.spu_id = k.spu_id
            LEFT JOIN Shop shop ON shop.shop_id = spu.shop_id
            LEFT JOIN stock_summary ss ON ss.sku_id = k.sku_id
            LEFT JOIN attribute_summary ats ON ats.sku_id = k.sku_id
            ORDER BY 
                CASE WHEN ci.sku_id IS NULL OR k.sku_id IS NULL THEN 1 ELSE 0 END,
                shop.shop_id
        `, [userId]);

        res.json({
            success: true,
            cart: result.rows,
            total: result.rows.length
        });
    } catch (error) {
        console.error('获取购物车详细信息错误:', error);
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
        const { sku_id, quantity = 1 , price} = req.body;
        console.log("price in cartController:", sku_id, price);

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
                'INSERT INTO cartitem (cart_id, sku_id, quantity, price_snapshot) VALUES ($1, $2, $3, $4)',
                [cart_id, sku_id, quantity, price]
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
*/
exports.updateCartQuantity = async (req, res) => {
    try {
        const userId = req.user.id;
        const { cart_item_id, quantity } = req.body;
        
        if (!cart_item_id || quantity < 1) {
            return res.status(400).json({
                success: false,
                message: '参数错误'
            });
        }
        
        // 检查购物车项是否属于该用户
        const cartCheck = await pool.query(
            `SELECT ci.sku_id
            FROM cartitem ci JOIN cart c ON c.cart_id = ci.cart_id
            WHERE ci.cart_item_id = $1 AND c.account_id = $2`,
            [cart_item_id, userId]
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
            'UPDATE cartitem SET quantity = $1 WHERE cart_item_id = $2',
            [quantity, cart_item_id]
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


/**
 * 从购物车删除商品
 */
exports.removeFromCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { cart_item_id } = req.params;
        
        // 检查购物车项是否属于该用户
        const cartCheck = await pool.query(
            `SELECT ci.sku_id
            FROM cartitem ci JOIN cart c ON c.cart_id = ci.cart_id
            WHERE ci.cart_item_id = $1 AND c.account_id = $2`,
            [cart_item_id, userId]
        );
        
        if (cartCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '购物车项不存在'
            });
        }
        
        // 删除购物车项
        await pool.query(
            'DELETE FROM cartitem WHERE cart_item_id = $1',
            [cart_item_id]
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
