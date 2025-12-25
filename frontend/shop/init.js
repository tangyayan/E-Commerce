/**
 * 初始化模块
 */

document.addEventListener('DOMContentLoaded', () => {
    // 初始化店铺编辑事件
    initShopEditEvents();
    
    // 添加商品按钮
    const addProductBtn = document.getElementById('add-product-btn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', showAddProductModal);
    }
});