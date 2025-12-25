const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/auth');

// 公开路由（无需登录）
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

// 需要登录的路由
router.post('/', authMiddleware, productController.createProduct);
router.put('/:id', authMiddleware, productController.updateProductSpu);
// router.delete('/:id', authMiddleware, productController.deleteProduct);

// 属性相关路由
router.post('/:spu_id/attributes/add', authMiddleware, productController.addProductAttribute); // 添加新属性
router.put('/:spu_id/attributes/:attr_id', authMiddleware, productController.updateAttributeName); // 更新属性名称
router.post('/:spu_id/attributes/:attr_id/values', authMiddleware, productController.addAttributeValue); // 添加属性值
router.put('/:spu_id/attributes/:attr_id/values/:value_id', authMiddleware, productController.updateAttributeValue); // 更新属性值
router.delete('/:spu_id/attributes/:attr_id/values/:value_id', authMiddleware, productController.deleteAttributeValue); // 删除属性值

module.exports = router;