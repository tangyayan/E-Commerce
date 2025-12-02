const pool = require('../config/database');

/**
 * 获取用户个人信息
 */
exports.getUserProfile = async (req, res) => {
    try {
        const userId = req.user.id; // 从 JWT token 中获取用户 ID
        
        const result = await pool.query(`
            SELECT 
                account_id,
                username,
                email,
                have_shop,
                created_at
            FROM Account
            WHERE account_id = $1
        `, [userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }
        
        const user = result.rows[0];
        
        res.json({
            success: true,
            user: {
                account_id: user.account_id,
                username: user.username,
                email: user.email,
                have_shop: user.have_shop,
                created_at: user.created_at
            }
        });
    } catch (error) {
        console.error('获取用户信息错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
};

/**
 * 更新用户信息
 */
exports.updateUserProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { username, email } = req.body;
        
        // 验证输入
        if (!username && !email) {
            return res.status(400).json({
                success: false,
                message: '请提供要更新的信息'
            });
        }
        
        // 检查用户名或邮箱是否已被占用
        if (username) {
            const usernameCheck = await pool.query(
                'SELECT account_id FROM Account WHERE username = $1 AND account_id != $2',
                [username, userId]
            );
            
            if (usernameCheck.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: '用户名已被使用'
                });
            }
        }
        
        if (email) {
            const emailCheck = await pool.query(
                'SELECT account_id FROM Account WHERE email = $1 AND account_id != $2',
                [email, userId]
            );
            
            if (emailCheck.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: '邮箱已被使用'
                });
            }
        }
        
        // 更新用户信息
        const result = await pool.query(`
            UPDATE Account
            SET 
                username = COALESCE($1, username),
                email = COALESCE($2, email)
            WHERE account_id = $3
            RETURNING account_id, username, email, have_shop, created_at
        `, [username, email, userId]);
        
        res.json({
            success: true,
            message: '用户信息更新成功',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('更新用户信息错误:', error);
        res.status(500).json({
            success: false,
            message: '更新失败'
        });
    }
};

/**
 * 修改密码
 */
exports.changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { oldPassword, newPassword } = req.body;
        
        // 验证输入
        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: '请提供旧密码和新密码'
            });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: '新密码长度至少为6位'
            });
        }
        
        // 获取用户当前密码
        const userResult = await pool.query(
            'SELECT password FROM Account WHERE account_id = $1',
            [userId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }
        
        const user = userResult.rows[0];
        
        // 验证旧密码
        const bcrypt = require('bcrypt');
        const isValidPassword = await bcrypt.compare(oldPassword, user.password);
        
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: '旧密码错误'
            });
        }
        
        // 加密新密码
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // 更新密码
        await pool.query(
            'UPDATE Account SET password = $1 WHERE account_id = $2',
            [hashedPassword, userId]
        );
        
        res.json({
            success: true,
            message: '密码修改成功'
        });
    } catch (error) {
        console.error('修改密码错误:', error);
        res.status(500).json({
            success: false,
            message: '修改密码失败'
        });
    }
};

/**
 * 获取用户的收货地址列表
 */
exports.getUserAddresses = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const result = await pool.query(`
            SELECT 
                address_id,
                address,
                phone_number,
                recipient_name
            FROM shipping_address
            WHERE account_id = $1
            ORDER BY address_id DESC
        `, [userId]);
        
        res.json({
            success: true,
            addresses: result.rows
        });
    } catch (error) {
        console.error('获取收货地址错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
};

/**
 * 添加收货地址
 */
exports.addUserAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const { address, phone_number, recipient_name } = req.body;
        
        // 验证输入
        if (!address || !phone_number || !recipient_name) {
            return res.status(400).json({
                success: false,
                message: '请提供完整的地址信息'
            });
        }
        
        const result = await pool.query(`
            INSERT INTO shipping_address (account_id, address, phone_number, recipient_name)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [userId, JSON.stringify(address), phone_number, recipient_name]);
        
        res.status(201).json({
            success: true,
            message: '收货地址添加成功',
            address: result.rows[0]
        });
    } catch (error) {
        console.error('添加收货地址错误:', error);
        res.status(500).json({
            success: false,
            message: '添加失败'
        });
    }
};

/**
 * 删除收货地址
 */
exports.deleteUserAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const { address_id } = req.params;
        
        // 验证地址所有权
        const checkResult = await pool.query(
            'SELECT account_id FROM shipping_address WHERE address_id = $1',
            [address_id]
        );
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '地址不存在'
            });
        }
        
        if (checkResult.rows[0].account_id !== userId) {
            return res.status(403).json({
                success: false,
                message: '无权删除此地址'
            });
        }
        
        await pool.query('DELETE FROM shipping_address WHERE address_id = $1', [address_id]);
        
        res.json({
            success: true,
            message: '地址删除成功'
        });
    } catch (error) {
        console.error('删除收货地址错误:', error);
        res.status(500).json({
            success: false,
            message: '删除失败'
        });
    }
};