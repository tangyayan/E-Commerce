//用户认证控制器
const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 用户注册
exports.register = async (req, res) => {
    try {
        const { username, email, password, have_shop } = req.body;

        // 检查用户是否已存在
        const userExists = await pool.query(
            'SELECT * FROM Account WHERE email = $1 OR username = $2',
            [email, username]
        );

        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: '用户名或邮箱已存在' });
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);

        // 插入新用户
        const result = await pool.query(
            'INSERT INTO Account (username, password, email, have_shop) VALUES ($1, $2, $3, $4) RETURNING account_id, username, email, have_shop',
            [username, hashedPassword, email, have_shop]
        );
        // 增加购物车
        await pool.query(
            'INSERT INTO Cart (account_id) VALUES ($1)',
            [result.rows[0].account_id]
        );

        const user = result.rows[0];

        // 生成 JWT Token
        const token = jwt.sign(
            { account_id: user.account_id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );

        res.status(201).json({
            success: true,
            token,
            user: {
                account_id: user.account_id,
                username: user.username,
                email: user.email,
                have_shop: user.have_shop
            }
        });
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
};

// 用户登录
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // 查找用户
        const result = await pool.query(
            'SELECT * FROM Account WHERE username = $1 OR email = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ message: '用户名或密码错误' });
        }

        const user = result.rows[0];

        // 验证密码
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: '用户名或密码错误' });
        }

        // 生成 JWT Token
        const token = jwt.sign(
            { id: user.account_id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );

        res.json({
            success: true,
            token,
            userInfo: {
                id: user.account_id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
};

// 获取当前用户信息
exports.getCurrentUser = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, email, created_at FROM Account WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: '用户未找到' });
        }

        res.json({ success: true, user: result.rows[0] });
    } catch (error) {
        console.error('获取用户信息错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
};