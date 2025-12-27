const pool = require('../config/database');

/**
 * 获取店铺的所有仓库
 */
exports.getWarehousesByShop = async (req, res) => {
    try {
        const { shop_id } = req.params;

        // 验证权限
        const shopCheck = await pool.query(
            'SELECT account_id FROM Shop WHERE shop_id = $1',
            [shop_id]
        );

        if (shopCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: '店铺不存在' });
        }

        if (shopCheck.rows[0].account_id !== req.user.id) {
            return res.status(403).json({ success: false, message: '无权限访问' });
        }

        const result = await pool.query(
            `SELECT
                w.code,
                w.shop_id,
                w.address,
                COUNT(DISTINCT ws.sku_id) as sku_count,
                COALESCE(SUM(ws.stock), 0) as total_stock
            FROM warehouse w
            LEFT JOIN WarehouseStock ws ON ws.code = w.code
            WHERE w.shop_id = $1
            GROUP BY w.code, w.shop_id
            ORDER BY w.code`,
            [shop_id]
        );

        res.json({
            success: true,
            warehouses: result.rows
        });
    } catch (error) {
        console.error('获取仓库列表失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
};

/**
 * 创建仓库
 */
exports.createWarehouse = async (req, res) => {
    const client = await pool.connect();
    try {
        const { shop_id, address } = req.body;

        // 验证权限
        const shopCheck = await client.query(
            'SELECT account_id FROM Shop WHERE shop_id = $1',
            [shop_id]
        );

        if (shopCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: '店铺不存在' });
        }

        if (shopCheck.rows[0].account_id !== req.user.id) {
            return res.status(403).json({ success: false, message: '无权限操作' });
        }

        // 验证地址格式
        if (!address || !address.province || !address.city || !address.detail) {
            return res.status(400).json({
                success: false,
                message: '地址信息不完整，需要包含省、市、详细地址'
            });
        }

        await client.query('BEGIN');

        const result = await client.query(
            `INSERT INTO warehouse (shop_id, address)
             VALUES ($1, $2)
             RETURNING *`,
            [shop_id, JSON.stringify(address)]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: '仓库创建成功',
            warehouse: result.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('创建仓库失败:', error);
        res.status(500).json({ success: false, message: '创建仓库失败' });
    } finally {
        client.release();
    }
};

/**
 * 更新仓库信息
 */
exports.updateWarehouse = async (req, res) => {
    const client = await pool.connect();
    try {
        const { code } = req.params;
        const { address } = req.body;

        // 验证权限
        const warehouseCheck = await client.query(
            `SELECT w.shop_id, s.account_id
             FROM warehouse w
             JOIN Shop s ON s.shop_id = w.shop_id
             WHERE w.code = $1`,
            [code]
        );

        if (warehouseCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: '仓库不存在' });
        }

        if (warehouseCheck.rows[0].account_id !== req.user.id) {
            return res.status(403).json({ success: false, message: '无权限操作' });
        }

        await client.query('BEGIN');

        const result = await client.query(
            `UPDATE warehouse
             SET address = $1
             WHERE code = $2
             RETURNING *`,
            [JSON.stringify(address), code]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: '仓库信息更新成功',
            warehouse: result.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('更新仓库失败:', error);
        res.status(500).json({ success: false, message: '更新仓库失败' });
    } finally {
        client.release();
    }
};

/**
 * 删除仓库
 */
exports.deleteWarehouse = async (req, res) => {
    const client = await pool.connect();
    try {
        const { code } = req.params;

        // 验证权限
        const warehouseCheck = await client.query(
            `SELECT w.shop_id, s.account_id
             FROM warehouse w
             JOIN Shop s ON s.shop_id = w.shop_id
             WHERE w.code = $1`,
            [code]
        );

        if (warehouseCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: '仓库不存在' });
        }

        if (warehouseCheck.rows[0].account_id !== req.user.id) {
            return res.status(403).json({ success: false, message: '无权限操作' });
        }

        await client.query('BEGIN');

        // 删除仓库（会级联删除库存记录）
        await client.query('DELETE FROM warehouse WHERE code = $1', [code]);

        await client.query('COMMIT');

        res.json({
            success: true,
            message: '仓库删除成功'
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('删除仓库失败:', error);
        res.status(500).json({ success: false, message: '删除仓库失败' });
    } finally {
        client.release();
    }
};

/**
 * 获取仓库库存
 */
exports.getWarehouseStock = async (req, res) => {
    try {
        const { code } = req.params;

        // 验证权限
        const warehouseCheck = await pool.query(
            `SELECT w.shop_id, s.account_id
             FROM warehouse w
             JOIN Shop s ON s.shop_id = w.shop_id
             WHERE w.code = $1`,
            [code]
        );

        if (warehouseCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: '仓库不存在' });
        }

        if (warehouseCheck.rows[0].account_id !== req.user.id) {
            return res.status(403).json({ success: false, message: '无权限访问' });
        }

        const result = await pool.query(
            `SELECT
                ws.sku_id,
                ws.stock,
                k.barcode,
                k.now_price,
                k.origin_price,
                spu.name as product_name,
                spu.image_url,
                json_agg(
                    json_build_object(
                        'attr_name', ak.attr_name,
                        'value', av.value
                    )
                ) FILTER (WHERE av.value_id IS NOT NULL) as attributes
            FROM WarehouseStock ws
            LEFT JOIN SKU k ON k.sku_id = ws.sku_id
            LEFT JOIN SPU spu ON spu.spu_id = k.spu_id
            LEFT JOIN SKUAttributeValue sav ON sav.sku_id = k.sku_id
            LEFT JOIN AttributeValue av ON av.value_id = sav.value_id
            LEFT JOIN AttributeKey ak ON ak.attr_id = av.attr_id
            WHERE ws.code = $1
            GROUP BY ws.sku_id, ws.stock, k.barcode, k.now_price, k.origin_price, spu.name, spu.image_url
            ORDER BY spu.name, ws.sku_id`,
            [code]
        );

        res.json({
            success: true,
            stock: result.rows
        });
    } catch (error) {
        console.error('获取仓库库存失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
};

/**
 * 更新库存
 */
exports.updateStock = async (req, res) => {
    const client = await pool.connect();
    try {
        const { code, sku_id } = req.params;
        const { stock, operation } = req.body;

        if (stock < 0) {
            return res.status(400).json({ success: false, message: '库存不能为负数' });
        }

        let op_stock = stock;
        if (operation === 'subtract') op_stock = -stock;

        // 验证权限
        const warehouseCheck = await client.query(
            `SELECT w.shop_id, s.account_id
             FROM warehouse w
             JOIN Shop s ON s.shop_id = w.shop_id
             WHERE w.code = $1`,
            [code]
        );

        if (warehouseCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: '仓库不存在' });
        }

        if (warehouseCheck.rows[0].account_id !== req.user.id) {
            return res.status(403).json({ success: false, message: '无权限操作' });
        }

        await client.query('BEGIN');

        // 1) 先尝试 UPDATE
        const updateResult = await client.query(
            `
            UPDATE warehousestock
            SET stock = GREATEST(stock + $3::int, 0)
            WHERE code = $1::int AND sku_id = $2::int
            RETURNING code, sku_id, stock
            `,
            [code, sku_id, op_stock]
        );

        let row;

        if (updateResult.rows.length > 0) {
            // 已存在记录，更新成功
            row = updateResult.rows[0];
        } else {
            // 2) 不存在记录，执行 INSERT
            const insertResult = await client.query(
                `
                INSERT INTO warehousestock (code, sku_id, stock)
                VALUES ($1::int, $2::int, GREATEST($3::int, 0))
                RETURNING code, sku_id, stock
                `,
                [code, sku_id, op_stock]
            );
            row = insertResult.rows[0];
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: '库存更新成功',
            stock: row
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('更新库存失败:', error);
        res.status(500).json({ success: false, message: '更新库存失败' });
    } finally {
        client.release();
    }
};

/**
 * 批量更新库存
 */
exports.batchUpdateStock = async (req, res) => {
    const client = await pool.connect();
    try {
        const { code } = req.params;
        const { items } = req.body; // [{ sku_id, stock }, ...]

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: '无效的入库数据' });
        }

        // 验证权限
        const warehouseCheck = await client.query(
            `SELECT w.shop_id, s.account_id
             FROM warehouse w
             JOIN Shop s ON s.shop_id = w.shop_id
             WHERE w.code = $1`,
            [code]
        );

        if (warehouseCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: '仓库不存在' });
        }

        if (warehouseCheck.rows[0].account_id !== req.user.id) {
            return res.status(403).json({ success: false, message: '无权限操作' });
        }

        await client.query('BEGIN');

        for (const item of items) {
            // 简单校验一下
            if (!item || typeof item.sku_id === 'undefined' || typeof item.stock !== 'number') {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, message: '入库数据格式错误' });
            }
            if (item.stock <= 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, message: '入库数量必须为正数' });
            }

            // 1) 先 UPDATE
            const updateResult = await client.query(
                `
                UPDATE warehousestock
                SET stock = GREATEST(stock + $3::int, 0)
                WHERE code = $1::int AND sku_id = $2::int
                RETURNING code, sku_id, stock
                `,
                [code, item.sku_id, item.stock]
            );

            if (updateResult.rows.length === 0) {
                // 2) 不存在则 INSERT
                await client.query(
                    `
                    INSERT INTO warehousestock (code, sku_id, stock)
                    VALUES ($1::int, $2::int, GREATEST($3::int, 0))
                    `,
                    [code, item.sku_id, item.stock]
                );
            }
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: `成功入库 ${items.length} 个商品`
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('批量入库失败:', error);
        res.status(500).json({ success: false, message: '批量入库失败' });
    } finally {
        client.release();
    }
};