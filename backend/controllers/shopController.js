const pool = require('../config/database');

/**
 * 根据用户ID获取店铺
 */
exports.getShopByUserId = async (req, res) => {
    try {
        const { user_id } = req.params;
        
        if (req.user.userId !== parseInt(user_id)) {
            return res.status(403).json({
                success: false,
                message: '无权访问此店铺'
            });
        }
        
        const result = await pool.query(`
            SELECT 
                s.*,
                COUNT(sp.spu_id) as product_count
            FROM Shop s
            LEFT JOIN SPU sp ON s.shop_id = sp.shop_id
            WHERE s.owner_id = $1
            GROUP BY s.shop_id
        `, [user_id]);
        
        if (result.rows.length === 0) {
            return res.json({
                success: true,
                shop: null,
                message: '用户尚未创建店铺'
            });
        }
        
        res.json({
            success: true,
            shop: result.rows[0]
        });
    } catch (error) {
        console.error('获取用户店铺错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
};

/**
 * 根据店铺ID获取店铺详情（公开）
 */
exports.getShopById = async (req, res) => {
    try {
        const { shop_id } = req.params;
        
        const result = await pool.query(`
            SELECT 
                s.*,
                u.username as owner_name,
                COUNT(sp.spu_id) as product_count
            FROM Shop s
            LEFT JOIN Account u ON s.owner_id = u.account_id
            LEFT JOIN SPU sp ON s.shop_id = sp.shop_id
            WHERE s.shop_id = $1
            GROUP BY s.shop_id, u.username
        `, [shop_id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '店铺不存在'
            });
        }
        
        res.json({
            success: true,
            shop: result.rows[0]
        });
    } catch (error) {
        console.error('获取店铺详情错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
};

/**
 * 创建店铺
 */
exports.createShop = async (req, res) => {
    try {
        const { shop_name, description } = req.body;
        const userId = req.user.userId;
        
        // 检查用户是否已有店铺
        const existingShop = await pool.query(
            'SELECT shop_id FROM Shop WHERE owner_id = $1',
            [userId]
        );
        
        if (existingShop.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: '您已经拥有一个店铺'
            });
        }
        
        // 创建店铺
        const result = await pool.query(`
            INSERT INTO Shop (shop_name, description, owner_id)
            VALUES ($1, $2, $3)
            RETURNING *
        `, [shop_name, description, userId]);
        
        res.status(201).json({
            success: true,
            message: '店铺创建成功',
            shop: result.rows[0]
        });
    } catch (error) {
        console.error('创建店铺错误:', error);
        res.status(500).json({
            success: false,
            message: '创建店铺失败'
        });
    }
};

/**
 * 更新店铺信息
 */
exports.updateShop = async (req, res) => {
    try {
        const { shop_id } = req.params;
        const { shop_name, description } = req.body;
        const userId = req.user.userId;
        
        // 验证店铺所有权
        const shopCheck = await pool.query(
            'SELECT owner_id FROM Shop WHERE shop_id = $1',
            [shop_id]
        );
        
        if (shopCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '店铺不存在'
            });
        }
        
        if (shopCheck.rows[0].owner_id !== userId) {
            return res.status(403).json({
                success: false,
                message: '无权修改此店铺'
            });
        }
        
        // 更新店铺信息
        const result = await pool.query(`
            UPDATE Shop
            SET shop_name = COALESCE($1, shop_name),
                description = COALESCE($2, description)
            WHERE shop_id = $3
            RETURNING *
        `, [shop_name, description, shop_id]);
        
        res.json({
            success: true,
            message: '店铺信息更新成功',
            shop: result.rows[0]
        });
    } catch (error) {
        console.error('更新店铺错误:', error);
        res.status(500).json({
            success: false,
            message: '更新店铺失败'
        });
    }
};

/**
 * 获取所有店铺列表
 */
exports.getAllShops = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;
        
        const result = await pool.query(`
            SELECT 
                s.*,
                u.username as owner_name,
                COUNT(sp.spu_id) as product_count
            FROM Shop s
            LEFT JOIN Account u ON s.owner_id = u.account_id
            LEFT JOIN SPU sp ON s.shop_id = sp.shop_id
            GROUP BY s.shop_id, u.username
            ORDER BY s.created_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);
        
        const countResult = await pool.query('SELECT COUNT(*) FROM Shop');
        
        res.json({
            success: true,
            shops: result.rows,
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error('获取店铺列表错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
};