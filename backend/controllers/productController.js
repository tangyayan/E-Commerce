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
        const skuResult = await pool.query(`
            SELECT 
                k.*,
                COALESCE(SUM(ws.stock), 0) as stock,
                json_agg(json_build_object(
                        'attr_id', v.attr_id,
                        'value_id', v.value_id,
                        'value', v.value
                    )) as attributes
            FROM SKU k
            LEFT JOIN WarehouseStock ws ON k.sku_id = ws.sku_id
            LEFT JOIN skuattributevalue skuv ON skuv.sku_id = k.sku_id
            LEFT JOIN attributevalue v on v.value_id=skuv.value_id
            WHERE k.spu_id = $1
            GROUP BY k.sku_id
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
                attributes: attrResult.rows
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