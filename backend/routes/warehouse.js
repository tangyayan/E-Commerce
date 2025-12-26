const express = require('express');
const router = express.Router();
const warehouseController = require('../controllers/warehouseController');
const authMiddleware = require('../middleware/auth');

// 获取店铺的所有仓库
router.get('/shop/:shop_id', authMiddleware, warehouseController.getWarehousesByShop);

// 创建仓库
router.post('/', authMiddleware, warehouseController.createWarehouse);

// 更新仓库信息
router.put('/:code', authMiddleware, warehouseController.updateWarehouse);

// 删除仓库
router.delete('/:code', authMiddleware, warehouseController.deleteWarehouse);

// 获取仓库库存
router.get('/:code/stock', authMiddleware, warehouseController.getWarehouseStock);

// 更新库存（入库/出库）
router.put('/:code/stock/:sku_id', authMiddleware, warehouseController.updateStock);

// 批量入库
router.post('/:code/stock/batch', authMiddleware, warehouseController.batchUpdateStock);

module.exports = router;