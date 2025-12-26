const pool = require('../config/database');

/**
 * 创建SKU
 */
exports.createSKU = async (req, res) => {
    const client = await pool.connect();
    try {
        const { spu_id } = req.params;
        const { origin_price, now_price, barcode, attributes } = req.body;

        // 验证数据
        if (!origin_price || !now_price) {
            return res.status(400).json({ success: false, message: '原价和现价不能为空' });
        }
        // if (now_price > origin_price) {
        //     return res.status(400).json({ success: false, message: '现价不能大于原价' });
        // }

        await client.query('BEGIN');

        // 创建SKU
        const insertResult = await client.query(
            `INSERT INTO SKU (spu_id, origin_price, now_price, barcode)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [spu_id, origin_price, now_price, barcode]
        );

        const newSKU = insertResult.rows[0];

        // 插入SKU属性
        if (attributes && Array.isArray(attributes)) {
            for (const attr of attributes) {
                await client.query(
                    'INSERT INTO SKUAttributeValue (sku_id, value_id) VALUES ($1, $2)',
                    [newSKU.sku_id, attr.value_id]
                );
            }
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'SKU创建成功',
            sku: newSKU
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('创建SKU失败:', error);
        res.status(500).json({ success: false, message: '创建SKU失败: ' + error.message });
    } finally {
        client.release();
    }
};

/**
 * 更新SKU
 */
exports.updateSKU = async (req, res) => {
    const client = await pool.connect();
    try {
        const { spu_id, sku_id } = req.params;
        const { origin_price, now_price, barcode, attributes } = req.body;

        // 验证数据
        if (!origin_price || !now_price) {
            return res.status(400).json({ success: false, message: '原价和现价不能为空' });
        }

        await client.query('BEGIN');

        // 更新SKU
        const updateResult = await client.query(
            `UPDATE SKU 
             SET origin_price = $1, now_price = $2, barcode = $3
             WHERE sku_id = $4 AND spu_id = $5
             RETURNING *`,
            [origin_price, now_price, barcode, sku_id, spu_id]
        );

        if (updateResult.rows.length === 0) {
            throw new Error('SKU更新失败或SKU不存在');
        }

        const updatedSKU = updateResult.rows[0];

        // 更新SKU属性
        if (attributes && Array.isArray(attributes)) {
            // 删除旧的属性值
            await client.query(
                'DELETE FROM SKUAttributeValue WHERE sku_id = $1',
                [sku_id]
            );

            // 插入新的属性值
            for (const attr of attributes) {
                await client.query(
                    'INSERT INTO SKUAttributeValue (sku_id, value_id) VALUES ($1, $2)',
                    [sku_id, attr.value_id]
                );
            }
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'SKU更新成功',
            sku: updatedSKU
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('更新SKU失败:', error);
        res.status(500).json({ success: false, message: '更新SKU失败: ' + error.message });
    } finally {
        client.release();
    }
};

/**
 * 删除SKU
 */
exports.deleteSKU = async (req, res) => {
    const client = await pool.connect();
    try {
        const { spu_id, sku_id } = req.params;

        // 验证权限：检查商品是否属于该用户的店铺
        const checkResult = await client.query(
            'SELECT shop_id FROM SPU WHERE spu_id = $1',
            [spu_id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: '商品不存在' });
        }

        const productShopId = checkResult.rows[0].shop_id;

        // 验证用户是否有权限操作
        const userShopResult = await client.query(
            'SELECT shop_id FROM Shop WHERE account_id = $1',
            [req.user.id]
        );

        if (userShopResult.rows.length === 0 || userShopResult.rows[0].shop_id !== productShopId) {
            return res.status(403).json({ success: false, message: '无权限操作此商品' });
        }

        // 检查SKU是否存在
        const skuCheckResult = await client.query(
            'SELECT sku_id FROM SKU WHERE sku_id = $1 AND spu_id = $2',
            [sku_id, spu_id]
        );

        if (skuCheckResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'SKU不存在' });
        }

        // 检查SKU是否在订单中被使用
        // const orderCheckResult = await client.query(
        //     'SELECT order_item_id FROM OrderItem WHERE sku_id = $1',
        //     [sku_id]
        // );

        // if (orderCheckResult.rows.length > 0) {
        //     return res.status(400).json({ 
        //         success: false, 
        //         message: '该SKU已被订单使用，无法删除。建议将库存设置为0。' 
        //     });
        // }

        // 检查SKU是否在购物车中被使用 set null
        // const cartCheckResult = await client.query(
        //     'SELECT cart_item_id FROM CartItem WHERE sku_id = $1',
        //     [sku_id]
        // );

        // if (cartCheckResult.rows.length > 0) {
        //     // 从购物车中删除该SKU
        //     await client.query(
        //         'DELETE FROM CartItem WHERE sku_id = $1',
        //         [sku_id]
        //     );
        // }

        await client.query('BEGIN');

        // 删除SKU属性关联（由于外键设置了 ON DELETE CASCADE，会自动删除）
        // 但为了明确，这里显式删除
        await client.query(
            'DELETE FROM SKUAttributeValue WHERE sku_id = $1',
            [sku_id]
        );

        // 删除仓库库存记录
        await client.query(
            'DELETE FROM WarehouseStock WHERE sku_id = $1',
            [sku_id]
        );

        // 删除SKU
        const deleteResult = await client.query(
            'DELETE FROM SKU WHERE sku_id = $1 AND spu_id = $2 RETURNING *',
            [sku_id, spu_id]
        );

        if (deleteResult.rows.length === 0) {
            throw new Error('SKU删除失败');
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'SKU删除成功',
            deleted_sku: deleteResult.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('删除SKU失败:', error);
        res.status(500).json({ success: false, message: '删除SKU失败: ' + error.message });
    } finally {
        client.release();
    }
};