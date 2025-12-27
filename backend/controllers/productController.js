const pool = require('../config/database');

/**
 * 获取所有商品（SPU + SKU），增加 attr_text 字段用于前端属性筛选
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
                MIN(k.now_price)    AS now_price,
                MIN(k.origin_price) AS origin_price,
                SUM(ws.stock)       AS total_stock,
                -- 把该 SPU 下所有 SKU 的属性拼成一个字符串，例如 "颜色:黑色; 尺码:XL"
                COALESCE(
                    string_agg(
                        DISTINCT ak.attr_name || ':' || av.value,
                        '; '
                    ),
                    ''
                ) AS attr_text
            FROM SPU s
            LEFT JOIN SKU k ON s.spu_id = k.spu_id
            LEFT JOIN Shop sh ON s.shop_id = sh.shop_id
            LEFT JOIN WarehouseStock ws ON k.sku_id = ws.sku_id
            -- 属性相关表：通过 SKU → SKUAttributeValue → AttributeValue → AttributeKey
            LEFT JOIN SKUAttributeValue sav ON sav.sku_id = k.sku_id
            LEFT JOIN AttributeValue av ON av.value_id = sav.value_id
            LEFT JOIN AttributeKey ak ON ak.attr_id = av.attr_id
            WHERE 1=1
        `;

        const params = [];
        let paramIndex = 1;

        // 保留你原来的过滤逻辑：按店铺过滤
        if (shop_id) {
            query += ` AND s.shop_id = $${paramIndex}`;
            params.push(shop_id);
            paramIndex++;
        }

        // 若以后要加价格过滤，可在这里按 minPrice / maxPrice 拼条件

        query += `
            GROUP BY
                s.spu_id,
                s.name,
                s.description,
                s.shop_id,
                sh.shop_name,
                s.image_url
            ORDER BY s.spu_id DESC
        `;

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
 * 根据SPU获取所有SKU及其详情
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
 * 更新SPU基本信息
 */
exports.updateProductSpu = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, image_url } = req.body;

      // 验证权限：检查商品是否属于该用户的店铺
      const checkResult = await pool.query(
        'SELECT s.shop_id FROM SPU s WHERE s.spu_id = $1',
        [id]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: '商品不存在' });
      }

      const productShopId = checkResult.rows[0].shop_id;

      // 获取用户的店铺ID
      const userShopResult = await pool.query(
        'SELECT shop_id FROM Shop WHERE account_id = $1',
        [req.user.id]
      );

      if (userShopResult.rows.length === 0 || userShopResult.rows[0].shop_id !== productShopId) {
        return res.status(403).json({ success: false, message: '无权限修改此商品' });
      }

      // 更新SPU
      const result = await pool.query(
        'UPDATE SPU SET name = $1, description = $2, image_url = $3 WHERE spu_id = $4 RETURNING *',
        [name, description, image_url, id]
      );

      res.json({
        success: true,
        message: '更新成功',
        product: result.rows[0]
      });
    } catch (error) {
      console.error('更新商品失败:', error);
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  };

/**
 * 创建SPU基本信息
 */
exports.createProductSpu = async (req, res) => {
    try {
      const { name, description, image_url, shop_id } = req.body;

      // 获取用户的店铺ID
      const userShopResult = await pool.query(
        'SELECT shop_id FROM Shop WHERE account_id = $1',
        [req.user.id]
      );

      if (userShopResult.rows.length === 0 || userShopResult.rows[0].shop_id !== shop_id) {
        return res.status(403).json({ success: false, message: '无权限修改此商品' });
      }

      // 更新SPU
      const result = await pool.query(
        'INSERT INTO SPU(name, description, image_url, shop_id) VALUES($1, $2, $3, $4) RETURNING *',
        [name, description, image_url, shop_id]
      );

      res.json({
        success: true,
        message: '插入成功',
        product: result.rows[0]
      });
    } catch (error) {
      console.error('插入商品失败:', error);
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  };

/**
 * 根据店铺ID获取所有SPU（商品列表）
 */
exports.getProductsByShopId = async (req, res) => {
    try {
        const { shop_id } = req.params;

        if (!shop_id) {
            return res.status(400).json({
                success: false,
                message: '缺少店铺ID'
            });
        }

        // 验证店铺是否存在
        const shopCheck = await pool.query(
            `SELECT shop_id, shop_name FROM Shop WHERE shop_id = $1`,
            [shop_id]
        );

        if (shopCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '店铺不存在'
            });
        }

        // 获取店铺的所有SPU及统计信息
        const query = `
            SELECT
                s.spu_id,
                s.name,
                s.description,
                s.image_url,
                s.shop_id,
                sh.shop_name
            FROM SPU s
            LEFT JOIN Shop sh ON s.shop_id = sh.shop_id
            WHERE s.shop_id = $1
            GROUP BY s.spu_id, s.name, s.description, s.image_url, s.shop_id, sh.shop_name
            ORDER BY s.spu_id DESC
        `;

        const result = await pool.query(query, [shop_id]);

        console.log(`获取店铺 ${shop_id} 的商品列表，共 ${result.rows.length} 个商品`);

        res.json({
            success: true,
            shop: shopCheck.rows[0],
            products: result.rows,
            total: result.rows.length
        });
    } catch (error) {
        console.error('获取店铺商品列表错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: error.message
        });
    }
};

/**
 * 根据店铺ID获取所有SKU（用于批量入库等操作）
 */
exports.getSkusByShopId = async (req, res) => {
    try {
        const { shop_id } = req.params;

        if (!shop_id) {
            return res.status(400).json({
                success: false,
                message: '缺少店铺ID'
            });
        }

        // 验证店铺是否存在
        const shopCheck = await pool.query(
            'SELECT shop_id, shop_name FROM Shop WHERE shop_id = $1',
            [shop_id]
        );

        if (shopCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '店铺不存在'
            });
        }

        // 验证权限：确保是店主或有权限的用户
        if (req.user) {
            const userShopResult = await pool.query(
                'SELECT shop_id FROM Shop WHERE account_id = $1',
                [req.user.id]
            );

            if (userShopResult.rows.length === 0 ||
                userShopResult.rows[0].shop_id != shop_id) {
                return res.status(403).json({
                    success: false,
                    message: '无权限访问该店铺的SKU信息'
                });
            }
        }

        // 获取店铺的所有SKU及其属性
        const query = `
            SELECT
                k.sku_id,
                k.spu_id,
                k.origin_price,
                k.now_price,
                k.barcode,
                s.name as product_name,
                s.description as product_description,
                s.image_url,
                -- 获取当前SKU的总库存
                COALESCE(SUM(ws.stock), 0) as total_stock,
                -- 获取属性（JSON格式）
                (
                    SELECT json_agg(
                        json_build_object(
                            'attr_id', ak.attr_id,
                            'attr_name', ak.attr_name,
                            'value_id', av.value_id,
                            'value', av.value
                        ) ORDER BY ak.attr_id
                    )
                    FROM SKUAttributeValue skuv
                    JOIN AttributeValue av ON av.value_id = skuv.value_id
                    JOIN AttributeKey ak ON ak.attr_id = av.attr_id
                    WHERE skuv.sku_id = k.sku_id
                ) as attributes
            FROM SKU k
            JOIN SPU s ON s.spu_id = k.spu_id
            LEFT JOIN WarehouseStock ws ON ws.sku_id = k.sku_id
            WHERE s.shop_id = $1
            GROUP BY k.sku_id, k.spu_id, k.origin_price, k.now_price, k.barcode,
                     s.name, s.description, s.image_url
            ORDER BY k.spu_id, k.sku_id
        `;

        const result = await pool.query(query, [shop_id]);

        console.log(`获取店铺 ${shop_id} 的SKU列表，共 ${result.rows.length} 个SKU`);

        res.json({
            success: true,
            shop: shopCheck.rows[0],
            skus: result.rows,
            total: result.rows.length
        });
    } catch (error) {
        console.error('获取店铺SKU列表错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: error.message
        });
    }
};

/**
 * 删除商品（按 SPU 删除）
 * 顺序：
 * 1. 删与该 SPU 相关的 AttributeValue / AttributeKey
 * 2. 删 SPU（SKU 有 ON DELETE CASCADE，会连带 SKU / SKUAttributeValue / WarehouseStock 等）
 */
exports.deleteProduct = async (req, res) => {
    const { id } = req.params;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 0. 检查是否存在
        const checkRes = await client.query(
            'SELECT spu_id FROM SPU WHERE spu_id = $1',
            [id]
        );
        if (checkRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: '商品不存在'
            });
        }

        // 1. 找到该 SPU 下的所有属性键 attr_id
        const attrKeyRes = await client.query(
            'SELECT attr_id FROM AttributeKey WHERE spu_id = $1',
            [id]
        );
        const attrIds = attrKeyRes.rows.map(r => r.attr_id);

        if (attrIds.length > 0) {
            // 2. 找到这些属性键下的所有属性值 value_id
            const attrValueRes = await client.query(
                `
                SELECT value_id
                FROM AttributeValue
                WHERE attr_id = ANY($1::int[])
                `,
                [attrIds]
            );
            const valueIds = attrValueRes.rows.map(r => r.value_id);

            if (valueIds.length > 0) {
                // 3. 删 SKUAttributeValue 中引用这些属性值的记录
                await client.query(
                    `
                    DELETE FROM SKUAttributeValue
                    WHERE value_id = ANY($1::int[])
                    `,
                    [valueIds]
                );

                // 4. 删 AttributeValue
                await client.query(
                    `
                    DELETE FROM AttributeValue
                    WHERE value_id = ANY($1::int[])
                    `,
                    [valueIds]
                );
            }

            // 5. 删 AttributeKey
            await client.query(
                `
                DELETE FROM AttributeKey
                WHERE attr_id = ANY($1::int[])
                `,
                [attrIds]
            );
        }

        // 6. 最后删除 SPU（会级联删除相关 SKU、SKUAttributeValue、WarehouseStock 等）
        await client.query(
            'DELETE FROM SPU WHERE spu_id = $1',
            [id]
        );

        await client.query('COMMIT');

        return res.json({
            success: true,
            message: '删除成功'
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('删除商品错误:', error);
        return res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    } finally {
        client.release();
    }
};