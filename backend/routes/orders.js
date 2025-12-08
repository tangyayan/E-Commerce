const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authenticate = require('../middleware/auth');

router.use(authenticate);

router.get('/', orderController.getOrders); // 获取订单详细信息
router.post('/', orderController.createOrder); // 创建订单
router.delete('/:orderId', orderController.cancelOrder); // 取消订单

module.exports = router;