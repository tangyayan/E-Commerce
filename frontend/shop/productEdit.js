/**
 * 商品编辑模块
 */

let currentAttributes = []; // 当前编辑的属性
let currentSKUs = []; // 当前编辑的SKU

// 编辑商品
async function editProduct(spuId, name, desc, imageUrl) {
    document.getElementById('editSpuId').value = spuId;
    document.getElementById('productName').value = name;
    document.getElementById('productDesc').value = desc;
    document.getElementById('productImage').value = imageUrl;
    document.getElementById('modalTitle').textContent = '编辑商品';
    
    // 加载属性和SKU数据
    await loadAttributesAndSKUs(spuId);
    
    document.getElementById('editProductModal').style.display = 'block';
}

// 加载属性和SKU数据
async function loadAttributesAndSKUs(spuId) {
    const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
    
    try {
        const response = await fetch(`${API_BASE_URL}/products/${spuId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        console.log("获取属性结果:", data);

        if (!data.success) {
            throw new Error('获取商品详情失败');
        }

        currentAttributes = data.product.attributes || [];
        currentSKUs = data.product.skus || [];
        
        renderAttributes();
        renderSKUs();
    } catch (error) {
        console.error('加载数据失败:', error);
        alert('加载数据失败');
    }
}

// 保存SPU基本信息
async function saveSpuChanges() {
    const spuId = document.getElementById('editSpuId').value;
    const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');

    const params = new URLSearchParams(window.location.search);
    const shop_id = Number(params.get('id'));
    
    const spuData = {
        name: document.getElementById('productName').value.trim(),
        description: document.getElementById('productDesc').value.trim(),
        image_url: document.getElementById('productImage').value.trim(),
        shop_id: shop_id
    };

    if (!spuData.name) {
        alert('商品名称不能为空');
        return;
    }

    try {
        console.log("保存SPU数据:", spuData);
        const response = await fetch(`${API_BASE_URL}/products/${spuId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(spuData)
        });

        const result = await response.json();
        console.log("保存SPU结果:", result);
        
        if (result.success) {
            alert('基本信息保存成功');
            loadProducts();
        } else {
            alert('保存失败: ' + (result.message || '未知错误'));
        }
    } catch (error) {
        console.error('保存失败:', error);
        alert('保存失败: ' + error.message);
    }
}

// 关闭编辑模态框
function closeEditModal() {
    document.getElementById('editProductModal').style.display = 'none';
    document.getElementById('editProductForm').reset();

    currentAttributes = [];
    currentSKUs = [];

    renderAttributes();
    renderSKUs();
    
    const addAttrButton = document.querySelector('.btn-add-attribute');
    if (addAttrButton) {
        addAttrButton.disabled = false;
    }
}

// 显示添加商品模态框
function showAddProductModal() {
    document.getElementById('editSpuId').value = '';
    document.getElementById('editProductForm').reset();
    document.getElementById('modalTitle').textContent = '添加商品';
    document.getElementById('editProductModal').style.display = 'block';
}

// 点击模态框外部关闭
window.onclick = function(event) {
    const modal = document.getElementById('editProductModal');
    if (event.target === modal) {
        closeEditModal();
    }
};