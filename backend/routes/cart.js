const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const authenticate = require('../middleware/auth');

// 所有购物车路由都需要认证
router.use(authenticate);

// 获取购物车
router.get('/', cartController.getCart);

// 添加商品到购物车
router.post('/', cartController.addToCart);

// 更新购物车商品数量
// router.put('/quantity', cartController.updateCartQuantity);

// 删除购物车商品
router.delete('/:cart_id', cartController.removeFromCart);

// 清空购物车
router.delete('/', cartController.clearCart);

module.exports = router;