//jwt认证中间件
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
        // 从 header 中获取 token
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: '未提供认证令牌' });
        }

        // 验证 token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // console.log('认证通过的用户:', decoded);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: '无效的认证令牌' });
    }
};