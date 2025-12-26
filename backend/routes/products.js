const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const productController_attr = require('../controllers/productController_attr');
const productController_sku = require('../controllers/productController_sku');
const authMiddleware = require('../middleware/auth');

// 公开路由（无需登录）
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.get('/shop/:shop_id', productController.getProductsByShopId);

// 需要登录的路由
// router.post('/', authMiddleware, productController.createProduct);
router.put('/:id', authMiddleware, productController.updateProductSpu);
// router.delete('/:id', authMiddleware, productController.deleteProduct);
router.get('/shop/:shop_id/skus', authMiddleware, productController.getSkusByShopId); // 获取店铺所有SKUs

// 属性相关路由
router.post('/:spu_id/attributes/add', authMiddleware, productController_attr.addProductAttribute); // 添加新属性
router.put('/:spu_id/attributes/:attr_id', authMiddleware, productController_attr.updateAttributeName); // 更新属性名称
router.post('/:spu_id/attributes/:attr_id/values', authMiddleware, productController_attr.addAttributeValue); // 添加属性值
router.put('/:spu_id/attributes/:attr_id/values/:value_id', authMiddleware, productController_attr.updateAttributeValue); // 更新属性值
router.delete('/:spu_id/attributes/:attr_id/values/:value_id', authMiddleware, productController_attr.deleteAttributeValue); // 删除属性值

// SKU相关路由
router.post('/:spu_id/skus', authMiddleware, productController_sku.createSKU);// 创建SKU
router.put('/:spu_id/skus/:sku_id', authMiddleware, productController_sku.updateSKU);// 更新SKU
router.delete('/:spu_id/skus/:sku_id', authMiddleware, productController_sku.deleteSKU); // 删除SKU
module.exports = router;