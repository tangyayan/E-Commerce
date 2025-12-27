const pool = require('../config/database');

/**
 * 添加收藏（按 SKU）
 * POST /api/user/favorites
 * body: { sku_id }
 */
exports.addFavorite = async (req, res) => {
    try {
        const accountId = req.user.id;   // 登录中间件写入的用户 id
        const { sku_id } = req.body;

        if (!sku_id) {
            return res.status(400).json({ success: false, message: '缺少 sku_id' });
        }

        // 确认 SKU 存在（可选，防止脏数据）
        const skuCheck = await pool.query(
            'SELECT 1 FROM SKU WHERE sku_id = $1::int',
            [sku_id]
        );
        if (skuCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'SKU 不存在' });
        }

        // 插入收藏（如果已存在则忽略）
        await pool.query(
            `
            INSERT INTO favorite (account_id, sku_id)
            SELECT $1::int, $2::int
            WHERE NOT EXISTS (
                SELECT 1 FROM favorite WHERE account_id = $1::int AND sku_id = $2::int
            )
            `,
            [accountId, sku_id]
        );

        res.json({ success: true, message: '已加入收藏' });
    } catch (err) {
        console.error('添加收藏失败:', err);
        res.status(500).json({ success: false, message: '添加收藏失败' });
    }
};

/**
 * 取消收藏
 * DELETE /api/user/favorites/:sku_id
 */
exports.removeFavorite = async (req, res) => {
    try {
        const accountId = req.user.id;
        const { sku_id } = req.params;

        await pool.query(
            `
            DELETE FROM favorite
            WHERE account_id = $1::int AND sku_id = $2::int
            `,
            [accountId, sku_id]
        );

        res.json({ success: true, message: '已取消收藏' });
    } catch (err) {
        console.error('取消收藏失败:', err);
        res.status(500).json({ success: false, message: '取消收藏失败' });
    }
};

/**
 * 获取当前用户的收藏列表（返回 SKU 及其基本信息）
 * GET /api/user/favorites
 */
exports.getFavorites = async (req, res) => {
    try {
        const accountId = req.user.id;

        const result = await pool.query(
            `
            SELECT f.sku_id,
                   s.spu_id,
                   spu.name       AS spu_name,
                   spu.image_url,
                   s.now_price,
                   s.origin_price,
                   f.created_at
            FROM favorite f
            JOIN SKU s   ON s.sku_id = f.sku_id
            JOIN SPU spu ON spu.spu_id = s.spu_id
            WHERE f.account_id = $1::int
            ORDER BY f.created_at DESC
            `,
            [accountId]
        );

        res.json({ success: true, favorites: result.rows });
    } catch (err) {
        console.error('获取收藏列表失败:', err);
        res.status(500).json({ success: false, message: '获取收藏列表失败' });
    }
};

// 检查某个 SKU 是否已被当前用户收藏
exports.checkFavorite = async (req, res) => {
    try {
        const accountId = req.user.id;
        const { sku_id } = req.params;

        if (!sku_id) {
            return res.status(400).json({ success: false, message: '缺少 sku_id' });
        }

        const result = await pool.query(
            `
            SELECT 1
            FROM favorite
            WHERE account_id = $1::int AND sku_id = $2::int
            `,
            [accountId, sku_id]
        );

        const isFavorite = result.rows.length > 0;
        res.json({ success: true, isFavorite });
    } catch (err) {
        console.error('检查收藏状态失败:', err);
        res.status(500).json({ success: false, message: '检查收藏状态失败' });
    }
};