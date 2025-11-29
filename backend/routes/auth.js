//认证路由
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
//用来保护需要认证的路由

// 注册
router.post('/register', authController.register);

// 登录
router.post('/login', authController.login);

// 获取当前用户信息 (需要认证)
router.get('/me', authMiddleware, authController.getCurrentUser);

module.exports = router;