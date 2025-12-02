const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticate = require('../middleware/auth');

// 所有路由都需要认证
router.use(authenticate);

// 用户信息相关
router.get('/profile', userController.getUserProfile);           // 获取用户信息
router.put('/profile', userController.updateUserProfile);        // 更新用户信息
router.post('/change-password', userController.changePassword);  // 修改密码

// 收货地址相关
router.get('/addresses', userController.getUserAddresses);       // 获取收货地址列表
router.post('/addresses', userController.addUserAddress);        // 添加收货地址
router.delete('/addresses/:address_id', userController.deleteUserAddress); // 删除收货地址

module.exports = router;