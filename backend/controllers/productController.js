const pool = require('../config/database');

/**
 * 获取所有商品（SPU + SKU）
 */
exports.getAllProducts = async (req, res) => {
    try {
        const { category, minPrice, maxPrice, shop_id } = req.query;
        
        let query = `
            SELECT 
                s.spu_id,
                s.name,
                s.description,
                s.shop_id,
                s.image_url,
                sh.shop_name,
                MIN(k.now_price) as now_price,
                MIN(k.origin_price) as origin_price,
                SUM(ws.stock) as total_stock
            FROM SPU s
            LEFT JOIN SKU k ON s.spu_id = k.spu_id
            LEFT JOIN Shop sh ON s.shop_id = sh.shop_id
            LEFT JOIN WarehouseStock ws ON k.sku_id = ws.sku_id
            WHERE 1=1
        `;
        
        const params = [];
        let paramIndex = 1;
        
        // 添加过滤条件
        if (shop_id) {
            query += ` AND s.shop_id = $${paramIndex}`;
            params.push(shop_id);
            paramIndex++;
        }
        
        query += `
            GROUP BY s.spu_id, s.name, s.description, s.shop_id, sh.shop_name, s.image_url
        `;
        //以后可以增加排序
        
        const result = await pool.query(query, params);
        
        res.json({
            success: true,
            products: result.rows,
            total: result.rows.length
        });
    } catch (error) {
        console.error('获取商品列表错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
};

/**
 * 获取单个商品详情
 */
exports.getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        
        // 获取 SPU 基本信息
        const spuResult = await pool.query(`
            SELECT 
                s.*,
                sh.shop_name,
                sh.shop_id
            FROM SPU s
            LEFT JOIN Shop sh ON s.shop_id = sh.shop_id
            WHERE s.spu_id = $1
        `, [id]);
        
        if (spuResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '商品不存在'
            });
        }
        
        const spu = spuResult.rows[0];
        
        // 获取所有 SKU
        // CTE: 使用 CTE 优化查询，避免重复计算库存和属性
        const skuResult = await pool.query(`
            WITH stock_summary AS (
                -- 先计算每个 SKU 的库存汇总（避免重复）
                SELECT 
                    ws.sku_id,
                    COALESCE(SUM(ws.stock), 0) as total_stock,
                    -- 库存最多的仓库地址
                    (
                        SELECT w2.address
                        FROM WarehouseStock ws2
                        JOIN Warehouse w2 ON w2.code = ws2.code
                        WHERE ws2.sku_id = ws.sku_id
                        ORDER BY ws2.stock DESC NULLS LAST
                        LIMIT 1
                    ) as max_stock_address,
                    -- 最大库存数量
                    MAX(ws.stock) as max_stock
                FROM WarehouseStock ws
                LEFT JOIN Warehouse w ON w.code = ws.code
                GROUP BY ws.sku_id
            ),
            attribute_summary AS (
                -- 再计算每个 SKU 的属性（避免重复）
                SELECT 
                    skuv.sku_id,
                    json_agg(
                        json_build_object(
                            'attr_id', v.attr_id,
                            'attr_name', ak.attr_name,
                            'value_id', v.value_id,
                            'value', v.value
                        ) ORDER BY v.attr_id
                    ) FILTER (WHERE v.value_id IS NOT NULL) as attributes
                FROM skuattributevalue skuv
                LEFT JOIN attributevalue v ON v.value_id = skuv.value_id
                LEFT JOIN attributekey ak ON ak.attr_id = v.attr_id
                GROUP BY skuv.sku_id
            )
            SELECT 
                k.sku_id,
                k.spu_id,
                k.origin_price,
                k.now_price,
                k.barcode,
                COALESCE(ss.total_stock, 0) as stock,
                ss.max_stock_address,
                ss.max_stock,
                ats.attributes
            FROM SKU k
            LEFT JOIN stock_summary ss ON ss.sku_id = k.sku_id
            LEFT JOIN attribute_summary ats ON ats.sku_id = k.sku_id
            WHERE k.spu_id = $1
            ORDER BY k.sku_id
        `, [id]);
        
        // 获取属性
        const attrResult = await pool.query(`
            SELECT 
                ak.attr_id,
                ak.attr_name,
                json_agg(json_build_object(
                    'value_id', av.value_id,
                    'value', av.value
                )) as values
            FROM AttributeKey ak
            LEFT JOIN AttributeValue av ON ak.attr_id = av.attr_id
            WHERE ak.spu_id = $1
            GROUP BY ak.attr_id, ak.attr_name
        `, [id]);
        
        res.json({
            success: true,
            product: {
                ...spu,
                skus: skuResult.rows,
                attributes: attrResult.rows,
            }
        });
    } catch (error) {
        console.error('获取商品详情错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
};

/**
 * 创建新商品（需要登录且有店铺）
 */
exports.createProduct = async (req, res) => {
    try {
        const { name, description, skus, attributes } = req.body;
        const shopId = req.user.shopId;  // 从 JWT 中获取
        
        if (!shopId) {
            return res.status(403).json({
                success: false,
                message: '您没有店铺权限'
            });
        }
        
        // 开始事务
        await pool.query('BEGIN');
        
        // 1. 创建 SPU
        const spuResult = await pool.query(
            'INSERT INTO SPU (name, description, shop_id) VALUES ($1, $2, $3) RETURNING spu_id',
            [name, description, shopId]
        );
        
        const spuId = spuResult.rows[0].spu_id;
        
        // 2. 创建 SKU
        for (const sku of skus) {
            const skuResult = await pool.query(
                'INSERT INTO SKU (spu_id, origin_price, now_price, barcode) VALUES ($1, $2, $3, $4) RETURNING sku_id',
                [spuId, sku.origin_price, sku.now_price, sku.barcode]
            );
            
            const skuId = skuResult.rows[0].sku_id;
            
            // 3. 关联 SKU 属性
            if (sku.attributes) {
                for (const attrValueId of sku.attributes) {
                    await pool.query(
                        'INSERT INTO SKUAttributeValue (sku_id, value_id) VALUES ($1, $2)',
                        [skuId, attrValueId]
                    );
                }
            }
        }
        
        // 4. 创建属性（如果需要）
        if (attributes) {
            for (const attr of attributes) {
                const attrResult = await pool.query(
                    'INSERT INTO AttributeKey (attr_name, spu_id) VALUES ($1, $2) RETURNING attr_id',
                    [attr.name, spuId]
                );
                
                const attrId = attrResult.rows[0].attr_id;
                
                for (const value of attr.values) {
                    await pool.query(
                        'INSERT INTO AttributeValue (attr_id, value) VALUES ($1, $2)',
                        [attrId, value]
                    );
                }
            }
        }
        
        await pool.query('COMMIT');
        
        res.status(201).json({
            success: true,
            message: '商品创建成功',
            spu_id: spuId
        });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('创建商品错误:', error);
        res.status(500).json({
            success: false,
            message: '创建商品失败'
        });
    }
};