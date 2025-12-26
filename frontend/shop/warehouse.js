/**
 * 仓库管理模块
 */

let currentWarehouseCode = null;
let currentShopIdForWarehouse = null;

/**
 * 初始化仓库管理（仅店主可见）
 * 需要修改逻辑（检查是否为店主）
 */
async function initWarehouseManagement(shopId) {
    currentShopIdForWarehouse = shopId;
    let isOwner = await checkOwnership_return();
    
    if (!isOwner) {
        document.getElementById('warehouse-section').style.display = 'none';
        return;
    }
    
    document.getElementById('warehouse-section').style.display = 'block';
    await loadWarehouses();
}

// 检查当前用户是否是店主
async function checkOwnership_return() {
    const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
    if (!token) {
        console.log('未登录用户');
        return false;
    }

    try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || sessionStorage.getItem('userInfo'));
        const response = await fetch(`${API_BASE_URL}/shop/user/${userInfo.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success && data.shop && data.shop.shop_id == shopId) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error('检查权限失败:', error);
        return false;
    }
}

/**
 * 加载仓库列表
 */
async function loadWarehouses() {
    try {
        const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
        
        const response = await fetch(`${API_BASE_URL}/warehouse/shop/${currentShopIdForWarehouse}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            renderWarehouses(result.warehouses);
        } else {
            document.getElementById('warehouse-list').innerHTML = 
                `<p class="error">${result.message}</p>`;
        }
    } catch (error) {
        console.error('加载仓库列表失败:', error);
        document.getElementById('warehouse-list').innerHTML = 
            '<p class="error">加载仓库列表失败</p>';
    }
}

/**
 * 渲染仓库列表
 */
function renderWarehouses(warehouses) {
    const container = document.getElementById('warehouse-list');
    
    if (warehouses.length === 0) {
        container.innerHTML = '<p class="no-data">暂无仓库，点击"添加仓库"创建</p>';
        return;
    }
    
    container.innerHTML = warehouses.map(warehouse => {
        // console.log(warehouse.address)
        const address = warehouse.address || {};
        
        const addressText = `${address.province || ''} ${address.city || ''} ${address.district || ''} ${address.detail || ''}`;
        
        return `
            <div class="warehouse-card">
                <div class="warehouse-card-header">
                    <span class="warehouse-code">
                        <i class="fas fa-warehouse"></i> 仓库 #${warehouse.code}
                    </span>
                </div>
                
                <div class="warehouse-address">
                    <i class="fas fa-map-marker-alt"></i> ${addressText}
                </div>
                
                <div class="warehouse-stats">
                    <div class="warehouse-stat">
                        <span class="warehouse-stat-label">SKU 种类</span>
                        <span class="warehouse-stat-value">${warehouse.sku_count || 0}</span>
                    </div>
                    <div class="warehouse-stat">
                        <span class="warehouse-stat-label">总库存</span>
                        <span class="warehouse-stat-value">${warehouse.total_stock || 0}</span>
                    </div>
                </div>
                
                <div class="warehouse-actions">
                    <button class="btn-stock" onclick="openStockManagement(${warehouse.code}, '仓库#${warehouse.code}')">
                        <i class="fas fa-boxes"></i> 库存管理
                    </button>
                    <button class="btn-edit-warehouse" onclick="openEditWarehouseDialog(${warehouse.code}, ${JSON.stringify(address).replace(/"/g, '&quot;')})">
                        <i class="fas fa-edit"></i> 编辑
                    </button>
                    <button class="btn-delete-warehouse" onclick="deleteWarehouse(${warehouse.code})">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * 打开添加仓库对话框
 */
function openAddWarehouseDialog() {
    document.getElementById('warehouseFormTitle').textContent = '添加仓库';
    document.getElementById('warehouseCode').value = '';
    document.getElementById('province').value = '';
    document.getElementById('city').value = '';
    document.getElementById('district').value = '';
    document.getElementById('detail').value = '';
    
    document.getElementById('warehouseFormModal').style.display = 'block';
}

/**
 * 打开编辑仓库对话框
 */
function openEditWarehouseDialog(code, address) {
    document.getElementById('warehouseFormTitle').textContent = '编辑仓库';
    document.getElementById('warehouseCode').value = code;
    document.getElementById('province').value = address.province || '';
    document.getElementById('city').value = address.city || '';
    document.getElementById('district').value = address.district || '';
    document.getElementById('detail').value = address.detail || '';
    
    document.getElementById('warehouseFormModal').style.display = 'block';
}

/**
 * 关闭仓库表单对话框
 */
function closeWarehouseFormModal() {
    document.getElementById('warehouseFormModal').style.display = 'none';
}

/**
 * 保存仓库
 */
async function saveWarehouse() {
    const code = document.getElementById('warehouseCode').value;
    const province = document.getElementById('province').value.trim();
    const city = document.getElementById('city').value.trim();
    const district = document.getElementById('district').value.trim();
    const detail = document.getElementById('detail').value.trim();
    
    if (!province || !city || !detail) {
        alert('请填写省份、城市和详细地址');
        return;
    }
    
    const address = { province, city, district, detail };
    
    try {
        const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
        
        const url = code 
            ? `${API_BASE_URL}/warehouse/${code}`
            : `${API_BASE_URL}/warehouse`;
        
        const method = code ? 'PUT' : 'POST';
        
        const body = code 
            ? { address }
            : { shop_id: currentShopIdForWarehouse, address };
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(result.message);
            closeWarehouseFormModal();
            await loadWarehouses();
        } else {
            alert('操作失败: ' + result.message);
        }
    } catch (error) {
        console.error('保存仓库失败:', error);
        alert('保存失败: ' + error.message);
    }
}

/**
 * 删除仓库
 */
async function deleteWarehouse(code) {
    if (!confirm('确定删除此仓库吗？删除后库存数据也将被清空！')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
        
        const response = await fetch(`${API_BASE_URL}/warehouse/${code}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(result.message);
            await loadWarehouses();
        } else {
            alert('删除失败: ' + result.message);
        }
    } catch (error) {
        console.error('删除仓库失败:', error);
        alert('删除失败: ' + error.message);
    }
}

/**
 * 打开库存管理
 */
async function openStockManagement(code, name) {
    currentWarehouseCode = code;
    document.getElementById('stockWarehouseName').textContent = name;
    document.getElementById('stockModal').style.display = 'block';
    
    await loadWarehouseStock(code);
}

/**
 * 关闭库存管理
 */
function closeStockModal() {
    document.getElementById('stockModal').style.display = 'none';
    currentWarehouseCode = null;
}

/**
 * 加载仓库库存
 */
async function loadWarehouseStock(code) {
    try {
        const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
        
        const response = await fetch(`${API_BASE_URL}/warehouse/${code}/stock`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            renderWarehouseStock(result.stock);
        } else {
            document.getElementById('stockTableBody').innerHTML = 
                `<tr><td colspan="7" class="error">${result.message}</td></tr>`;
        }
    } catch (error) {
        console.error('加载库存失败:', error);
        document.getElementById('stockTableBody').innerHTML = 
            '<tr><td colspan="7" class="error">加载库存失败</td></tr>';
    }
}

/**
 * 渲染仓库库存
 */
function renderWarehouseStock(stock) {
    const tbody = document.getElementById('stockTableBody');
    
    if (stock.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="no-data">暂无库存，点击"批量入库"添加</td></tr>';
        return;
    }
    
    tbody.innerHTML = stock.map(item => {
        const attributes = Array.isArray(item.attributes) 
            ? item.attributes.map(attr => `${attr.attr_name}: ${attr.value}`).join(', ')
            : '无属性';
        
        return `
            <tr>
                <td>
                    <img src="${item.image_url || 'img/default-product.jpg'}" 
                         alt="${item.product_name}" 
                         class="product-image-small"
                         onerror="this.src='img/default-product.jpg'">
                </td>
                <td>${item.product_name || '未知商品'}</td>
                <td>${attributes}</td>
                <td>${item.barcode || '-'}</td>
                <td>¥${parseFloat(item.now_price || 0).toFixed(2)}</td>
                <td><strong>${item.stock || 0}</strong></td>
                <td>
                    <div class="stock-input-group">
                        <input type="number" 
                               class="stock-input" 
                               id="stock-input-${item.sku_id}" 
                               min="0" 
                               value="0" 
                               placeholder="数量">
                        <button class="btn-stock-action btn-in" 
                                onclick="updateStock(${item.sku_id}, 'add')">
                            <i class="fas fa-plus"></i> 入库
                        </button>
                        <button class="btn-stock-action btn-out" 
                                onclick="updateStock(${item.sku_id}, 'subtract')">
                            <i class="fas fa-minus"></i> 出库
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * 更新库存
 */
async function updateStock(skuId, operation) {
    const input = document.getElementById(`stock-input-${skuId}`);
    const stock = parseInt(input.value) || 0;
    
    if (stock <= 0) {
        alert('请输入有效的数量');
        return;
    }
    
    try {
        const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
        
        const response = await fetch(`${API_BASE_URL}/warehouse/${currentWarehouseCode}/stock/${skuId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ stock , operation })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(result.message);
            input.value = '0';
            await loadWarehouseStock(currentWarehouseCode);
            await loadWarehouses(); // 更新仓库统计
        } else {
            alert('操作失败: ' + result.message);
        }
    } catch (error) {
        console.error('更新库存失败:', error);
        alert('更新失败: ' + error.message);
    }
}

/**
 * 打开批量入库对话框
 */
async function openBatchStockDialog() {
    try {
        const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
        
        // 获取店铺所有商品的SKU
        const response = await fetch(`${API_BASE_URL}/products/shop/${currentShopIdForWarehouse}/skus`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (result.success && result.skus) {
            renderBatchStockList(result.skus);
            document.getElementById('batchStockModal').style.display = 'block';
        } else {
            alert('获取商品列表失败');
        }
    } catch (error) {
        console.error('获取商品列表失败:', error);
        alert('获取商品列表失败');
    }
}

/**
 * 渲染批量入库列表
 */
function renderBatchStockList(skus) {
    const container = document.getElementById('batchStockList');
    
    if (skus.length === 0) {
        container.innerHTML = '<p class="no-data">暂无可入库的商品</p>';
        return;
    }
    
    container.innerHTML = skus.map(sku => {
        const attributes = Array.isArray(sku.attributes) 
            ? sku.attributes.map(attr => `${attr.attr_name}: ${attr.value}`).join(', ')
            : '无属性';
        
        return `
            <div class="batch-stock-item">
                <img src="${sku.image_url || 'img/default-product.jpg'}" 
                     alt="${sku.product_name}" 
                     class="product-image-small"
                     onerror="this.src='img/default-product.jpg'">
                <div class="batch-stock-info">
                    <h4>${sku.product_name}</h4>
                    <p>${attributes}</p>
                    <p>条形码: ${sku.barcode || '-'}</p>
                </div>
                <input type="number" 
                       class="stock-input batch-stock-input" 
                       id="batch-stock-${sku.sku_id}" 
                       min="0" 
                       value="0" 
                       placeholder="入库数量">
            </div>
        `;
    }).join('');
}

/**
 * 关闭批量入库对话框
 */
function closeBatchStockModal() {
    document.getElementById('batchStockModal').style.display = 'none';
}

/**
 * 提交批量入库
 */
async function submitBatchStock() {
    const inputs = document.querySelectorAll('.batch-stock-input');
    const items = [];
    
    inputs.forEach(input => {
        const skuId = input.id.replace('batch-stock-', '');
        const stock = parseInt(input.value) || 0;
        
        if (stock > 0) {
            items.push({ sku_id: parseInt(skuId), stock });
        }
    });
    
    if (items.length === 0) {
        alert('请至少输入一个商品的入库数量');
        return;
    }
    
    try {
        const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
        
        const response = await fetch(`${API_BASE_URL}/warehouse/${currentWarehouseCode}/stock/batch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ items })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(result.message);
            closeBatchStockModal();
            await loadWarehouseStock(currentWarehouseCode);
            await loadWarehouses();
        } else {
            alert('入库失败: ' + result.message);
        }
    } catch (error) {
        console.error('批量入库失败:', error);
        alert('批量入库失败: ' + error.message);
    }
}

// 点击模态框外部关闭
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};