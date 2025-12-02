const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');
const authenticate = require('../middleware/auth');

// 公开路由（无需登录）
router.get('/:shop_id', shopController.getShopById);           // 获取店铺详情
router.get('/', shopController.getAllShops);                   // 获取所有店铺列表

// 需要认证的路由
router.get('/user/:user_id', authenticate, shopController.getShopByUserId);  // 获取用户的店铺
router.post('/', authenticate, shopController.createShop);                    // 创建店铺
router.put('/:shop_id', authenticate, shopController.updateShop);            // 更新店铺信息
// router.delete('/:shop_id', authenticate, shopController.deleteShop);         // 删除店铺

module.exports = router;