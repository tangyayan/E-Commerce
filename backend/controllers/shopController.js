const pool = require('../config/database');

/**
 * 根据用户ID获取店铺
 */
exports.getShopByUserId = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (req.user.id !== parseInt(user_id)) {
      return res.status(403).json({
        success: false,
        message: '无权访问此店铺'
      });
    }

    const result = await pool.query(`
      SELECT
        s.*,
        COUNT(sp.spu_id) AS product_count
      FROM shop s
      LEFT JOIN spu sp ON s.shop_id = sp.shop_id
      WHERE s.account_id = $1
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
        s.shop_id,
        s.shop_name,
        s.shop_description,
        s.created_at,
        a.username AS owner_name,
        COUNT(sp.spu_id) AS product_count
      FROM shop s
      JOIN account a ON s.account_id = a.account_id
      LEFT JOIN spu sp ON s.shop_id = sp.shop_id
      WHERE s.shop_id = $1
      GROUP BY s.shop_id, a.username
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
    const { shop_name, shop_description } = req.body;
    const userId = req.user.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '未登录或 token 无效'
      });
    }

    console.log('createShop userId:', userId);

    // 检查是否已有店铺
    const existing = await pool.query(
      'SELECT shop_id FROM shop WHERE account_id = $1',
      [userId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: '您已经拥有一个店铺'
      });
    }

    // 检查是否有description列，如果没有则添加
    const hasDescriptionColumn = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'shop' AND column_name = 'shop_description'
    `);

    if (hasDescriptionColumn.rows.length === 0) {
      await pool.query(`
        ALTER TABLE shop
        ADD COLUMN shop_description TEXT
      `);
    }

    // 创建店铺
    const result = await pool.query(
      `INSERT INTO shop (shop_name, account_id, shop_description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [shop_name, userId, shop_description]
    );

    res.status(201).json({
      success: true,
      shop: result.rows[0]
    });

  } catch (err) {
    console.error('创建店铺错误:', err.message);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * 更新店铺信息
 */
exports.updateShop = async (req, res) => {
  try {
    const { shop_id } = req.params;
    const { shop_name, shop_description } = req.body;
    const userId = req.user.id;

    const shopCheck = await pool.query(
      'SELECT account_id FROM shop WHERE shop_id = $1',
      [shop_id]
    );

    if (shopCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '店铺不存在'
      });
    }

    if (shopCheck.rows[0].account_id !== userId) {
      return res.status(403).json({
        success: false,
        message: '无权修改此店铺'
      });
    }

    console.log('shop_description to update:', shop_description);
    const result = await pool.query(`
      UPDATE shop
      SET shop_name = COALESCE($1, shop_name),
          shop_description = COALESCE($2, shop_description)
      WHERE shop_id = $3
      RETURNING *
    `, [shop_name, shop_description, shop_id]);

    console.log('update rowCount:', result.rowCount);
    console.log('updated rows:', result.rows);

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
        a.username AS owner_name,
        COUNT(sp.spu_id) AS product_count
      FROM shop s
      LEFT JOIN account a ON s.account_id = a.account_id
      LEFT JOIN spu sp ON s.shop_id = sp.shop_id
      GROUP BY s.shop_id, a.username
      ORDER BY s.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await pool.query('SELECT COUNT(*) FROM shop');

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
