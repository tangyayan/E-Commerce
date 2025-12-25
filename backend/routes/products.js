const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/auth');

// 公开路由（无需登录）
router.get('/', productController.getAllProducts);           // 获取商品列表
router.get('/:id', productController.getProductById);        // 获取商品详情

// 需要登录的路由
router.post('/', authMiddleware, productController.createProduct);        // 创建商品
// router.put('/:id', authMiddleware, productController.updateProduct);      // 更新商品
// router.delete('/:id', authMiddleware, productController.deleteProduct);   // 删除商品
// router.get('/recommended', authMiddleware, productController.getRecommendedProducts); //推荐接口
router.get('/:spu_id/attributes', authMiddleware, productController.getProductAttributes);
router.get('/:spu_id/skus', authMiddleware, productController.getProductSKUs);
router.put('/:spu_id/complete', authMiddleware, productController.updateProductComplete);

module.exports = router;