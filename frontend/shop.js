// 解析 URL 参数 ?id=xxx
const params = new URLSearchParams(window.location.search);
const shopId = params.get('id');
const API_BASE_URL = "http://localhost:3000/api";

if (!shopId) {
    alert('缺少店铺ID');
    throw new Error('No shop id');
}

let isOwner = false; // 是否是店主

// 请求店铺详情（公开接口）
fetch(`${API_BASE_URL}/shop/${shopId}`)
    .then(res => res.json())
    .then(data => {
        if (!data.success) {
            alert(data.message || '获取店铺失败');
            return;
        }

        const shop = data.shop;
        console.log('Shop data:', shop);

        document.getElementById('shop-name').innerText = shop.shop_name;
        document.getElementById('shop-desc').innerText = shop.shop_description || '暂无描述';
        document.getElementById('shop-owner').innerText = shop.owner_name;
        document.getElementById('product-count').innerText = shop.product_count;

        // 检查是否是店主
        checkOwnership();
    })
    .catch(err => {
        console.error(err);
        alert('服务器错误');
    });

// 检查当前用户是否是店主
async function checkOwnership() {
    const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
    if (!token) {
        document.getElementById('edit-shop-btn').style.display = 'none';
        isOwner = false;
        loadProducts();
        return;
    }

    try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || sessionStorage.getItem('userInfo'));
        const response = await fetch(`${API_BASE_URL}/shop/user/${userInfo.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success && data.shop && data.shop.shop_id == shopId) {
            isOwner = true;
        } else {
            document.getElementById('edit-shop-btn').style.display = 'none';
            isOwner = false;
        }
    } catch (error) {
        console.error('检查权限失败:', error);
        document.getElementById('edit-shop-btn').style.display = 'none';
        isOwner = false;
    }

    loadProducts();
}

// 加载店铺商品
async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/products?shop_id=${shopId}`);
        const data = await response.json();

        if (data.success && data.products) {
            renderProducts(data.products);
        } else {
            document.getElementById('products').innerHTML = '<p class="no-products">暂无商品</p>';
        }
    } catch (error) {
        console.error('加载商品失败:', error);
        document.getElementById('products').innerHTML = '<p class="error">加载商品失败</p>';
    }
}

// 渲染商品列表为表格
function renderProducts(products) {
    const tbody = document.getElementById('products-tbody');
    const addBtn = document.getElementById('add-product-btn');
    const actionsColumn = document.querySelector('.actions-column');
    
    tbody.innerHTML = '';

    // 根据是否是店主显示操作列和添加按钮
    if (isOwner) {
        addBtn.style.display = 'inline-flex';
        actionsColumn.style.display = 'table-cell';
    } else {
        addBtn.style.display = 'none';
        actionsColumn.style.display = 'none';
    }

    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-products">暂无商品</td></tr>';
        return;
    }

    products.forEach(product => {
        const tr = document.createElement('tr');
        tr.className = isOwner ? '' : 'clickable-row';
        
        tr.innerHTML = `
            <td class="img-cell">
                <img src="${product.image_url || 'img/default-product.jpg'}" alt="${product.name}">
            </td>
            <td class="name-cell">${product.name}</td>
            <td class="desc-cell">${product.description || '暂无描述'}</td>
            <td class="actions-cell">
                ${isOwner ? `
                    <button class="btn-edit-small" onclick="event.stopPropagation(); editProduct(${product.spu_id}, '${escapeHtml(product.name)}', '${escapeHtml(product.description || '')}', ${product.now_price || 0}, ${product.total_stock || 0}, '${product.image_url || ''}')">
                        <i class="fas fa-edit"></i> 编辑
                    </button>
                    <button class="btn-delete-small" onclick="event.stopPropagation(); deleteProduct(${product.spu_id})">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                ` : ''}
            </td>
        `;

        // 非店主点击整行跳转
        if (!isOwner) {
            tr.onclick = () => {
                window.location.href = `contentDetails.html?id=${product.spu_id}`;
            };
        }

        tbody.appendChild(tr);
    });
}

// HTML转义函数
function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

let currentAttributes = []; // 当前编辑的属性
let currentSKUs = []; // 当前编辑的SKU

// 编辑商品
async function editProduct(spuId, name, desc, price, stock, imageUrl) {
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
        // 加载属性
        const Response = await fetch(`${API_BASE_URL}/products/${spuId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const Data = await Response.json();
        console.log("获取属性结果:", Data);

        if (!Data.success) {
            throw new Error('获取商品详情失败');
        }

        currentAttributes = Data.product.attributes || [];
        currentSKUs = Data.product.skus || [];
        
        renderAttributes();
        renderSKUs();
    } catch (error) {
        console.error('加载数据失败:', error);
        alert('加载数据失败');
    }
}

// 渲染属性列表
function renderAttributes() {
    const container = document.getElementById('attributesContainer');
    container.innerHTML = '';

    if (currentAttributes.length === 0) {
        container.innerHTML = '<p class="no-data">暂无属性，点击"添加属性"开始配置</p>';
        return;
    }

    currentAttributes.forEach((attr, index) => {
        const attrDiv = document.createElement('div');
        attrDiv.className = 'attribute-display-row';
        
        // 属性名称（只读显示）
        const attrNameDiv = document.createElement('div');
        attrNameDiv.className = 'attr-display-name';
        attrNameDiv.innerHTML = `
            <label>属性名称</label>
            <div class="attr-name-display">${escapeHtml(attr.attr_name)}</div>
        `;
        attrDiv.appendChild(attrNameDiv);
        
        // 属性值列表（标签形式显示，可删除）
        const attrValuesDiv = document.createElement('div');
        attrValuesDiv.className = 'attr-display-values';
        attrValuesDiv.innerHTML = `<label>属性值</label>`;
        
        const valuesContainer = document.createElement('div');
        valuesContainer.className = 'attr-values-container';
        
        // 渲染现有属性值
        if (attr.values && attr.values.length > 0) {
            attr.values.forEach((value, valueIndex) => {
                const valueText = typeof value === 'string' ? value : (value.value || '');
                const valueTag = document.createElement('span');
                valueTag.className = 'attr-value-tag';
                valueTag.innerHTML = `
                    ${escapeHtml(valueText)}
                    <button type="button" class="remove-value-btn" onclick="removeAttributeValue(${index}, ${valueIndex})" title="删除">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                valuesContainer.appendChild(valueTag);
            });
        }
        
        // 添加新值的输入框
        const addValueDiv = document.createElement('div');
        addValueDiv.className = 'add-value-container';
        addValueDiv.innerHTML = `
            <input type="text" 
                   class="add-value-input" 
                   id="new-value-${index}" 
                   placeholder="输入新属性值"
                   onkeypress="if(event.key === 'Enter') { event.preventDefault(); addNewAttributeValue(${index}); }">
            <button type="button" class="btn-add-value" onclick="addNewAttributeValue(${index})" title="添加属性值">
                <i class="fas fa-plus"></i>
            </button>
        `;
        valuesContainer.appendChild(addValueDiv);
        
        attrValuesDiv.appendChild(valuesContainer);
        attrDiv.appendChild(attrValuesDiv);
        
        container.appendChild(attrDiv);
    });
}

function addAttributeRow() {
    // 创建临时索引
    const tempIndex = currentAttributes.length;
    
    // 添加临时属性(属性名为空,等待用户输入)
    currentAttributes.push({
        attr_id: null,
        attr_name: '',
        values: [],
        isNew: true // 标记为新建
    });
    
    renderAttributesWithNewRow(tempIndex);
}
// 渲染属性列表(包含新建行)
function renderAttributesWithNewRow(newIndex) {
    const container = document.getElementById('attributesContainer');
    container.innerHTML = '';

    const addAttrButton = document.querySelector('.btn-add-attribute');
    if (addAttrButton) {
        addAttrButton.disabled = true; // 禁用添加按钮，防止多次点击
    }

    currentAttributes.forEach((attr, index) => {
        const attrDiv = document.createElement('div');
        attrDiv.className = 'attribute-display-row';
        
        // 如果是新建的属性,显示输入框
        if (attr.isNew && index === newIndex) {
            attrDiv.innerHTML = `
                <div class="attr-display-name">
                    <label>属性名称 <span class="required">*</span></label>
                    <input type="text" 
                           class="attr-name-input-new" 
                           id="new-attr-name-${index}" 
                           placeholder="例如：颜色、尺寸"
                           autofocus>
                </div>
                <div class="attr-display-values">
                    <label>属性值 <span class="required">*</span></label>
                    <div class="attr-values-container">
                        <div class="add-value-container">
                            <input type="text" 
                                   class="attr-name-input-new" 
                                   id="new-value-${index}" 
                                   placeholder="输入属性值后按回车添加"
                                   onkeypress="if(event.key === 'Enter') { event.preventDefault(); addNewAttributeValue(${index}); }">
                            <button type="button" class="btn-add-value" onclick="addNewAttributeValue(${index})" title="添加属性值">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="new-attr-actions">
                    <button type="button" class="btn-confirm-attr" onclick="confirmNewAttribute(${index})" title="确认">
                        <i class="fas fa-check"></i>
                    </button>
                    <button type="button" class="btn-cancel-attr" onclick="cancelNewAttribute(${index})" title="取消">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        } else {
            // 正常显示已有属性
            const attrNameDiv = document.createElement('div');
            attrNameDiv.className = 'attr-display-name';
            attrNameDiv.innerHTML = `
                <label>属性名称</label>
                <div class="attr-name-display">${escapeHtml(attr.attr_name)}</div>
            `;
            attrDiv.appendChild(attrNameDiv);
            
            const attrValuesDiv = document.createElement('div');
            attrValuesDiv.className = 'attr-display-values';
            attrValuesDiv.innerHTML = `<label>属性值</label>`;
            
            const valuesContainer = document.createElement('div');
            valuesContainer.className = 'attr-values-container';
            
            // 渲染现有属性值
            if (attr.values && attr.values.length > 0) {
                attr.values.forEach((value, valueIndex) => {
                    const valueText = typeof value === 'string' ? value : (value.value || '');
                    const valueTag = document.createElement('span');
                    valueTag.className = 'attr-value-tag';
                    valueTag.innerHTML = `
                        ${escapeHtml(valueText)}
                    `;
                    valuesContainer.appendChild(valueTag);
                });
            }
            
            attrValuesDiv.appendChild(valuesContainer);
            attrDiv.appendChild(attrValuesDiv);
        }
        
        container.appendChild(attrDiv);
    });
}

// 确认新建属性
function confirmNewAttribute(index) {
    const attr = currentAttributes[index];
    const nameInput = document.getElementById(`new-attr-name-${index}`);
    const attrName = nameInput ? nameInput.value.trim() : '';
    
    // 验证属性名
    if (!attrName) {
        alert('属性名称不能为空！');
        nameInput.focus();
        return;
    }
    
    // 检查是否已存在同名属性(排除自身)
    const exists = currentAttributes.some((a, i) => 
        i !== index && a.attr_name === attrName
    );
    
    if (exists) {
        alert('该属性名称已存在！');
        nameInput.focus();
        return;
    }
    
    // 验证至少有一个属性值
    if (!attr.values || attr.values.length === 0) {
        alert('请至少添加一个属性值！');
        const valueInput = document.getElementById(`new-value-${index}`);
        if (valueInput) valueInput.focus();
        return;
    }
    
    // 保存属性名
    attr.attr_name = attrName;
    delete attr.isNew;
    
    // 重新渲染
    renderAttributes();
    const addAttrButton = document.querySelector('.btn-add-attribute');
    if (addAttrButton) {
        addAttrButton.disabled = false;
    }
}

// 取消新建属性
function cancelNewAttribute(index) {
    currentAttributes.splice(index, 1);
    renderAttributes();
    const addAttrButton = document.querySelector('.btn-add-attribute');
    if (addAttrButton) {
        addAttrButton.disabled = false;
    }
}

// 添加新的属性值
function addNewAttributeValue(attrIndex) {
    const input = document.getElementById(`new-value-${attrIndex}`);
    const newValue = input ? input.value.trim() : '';
    
    if (!newValue) {
        alert('请输入属性值');
        return;
    }
    
    const attr = currentAttributes[attrIndex];
    
    // 检查是否已存在该值
    const exists = attr.values.some(v => {
        const existingValue = typeof v === 'string' ? v : (v.value || '');
        return existingValue === newValue;
    });
    
    if (exists) {
        alert('该属性值已存在！');
        input.value = '';
        return;
    }
    
    // 添加新值
    attr.values.push({ value: newValue });
    input.value = '';
    
    // 如果是新建属性,重新渲染带输入框的视图
    if (attr.isNew) {
        renderAttributesWithNewRow(attrIndex);
    } else {
        // 重新渲染
        renderAttributes();
        
        // 如果已有SKU，提示需要重新生成
        if (currentSKUs.length > 0) {
            if (confirm('添加属性值后需要重新生成SKU组合，是否继续？')) {
                generateSKUs();
            }
        }
    }
}

// 删除属性值
function removeAttributeValue(attrIndex, valueIndex) {
    const attr = currentAttributes[attrIndex];
    const value = attr.values[valueIndex];
    const valueText = typeof value === 'string' ? value : (value.value || '');
    
    if (!confirm(`确定删除属性值"${valueText}"吗？`)) {
        return;
    }
    
    // 删除该值
    attr.values.splice(valueIndex, 1);
    
    // 重新渲染
    renderAttributes();
    
    // 如果已有SKU，提示需要重新生成
    if (currentSKUs.length > 0) {
        if (confirm('删除属性值后需要重新生成SKU组合，是否继续？')) {
            generateSKUs();
        }
    }
}

// 更新属性名称
function updateAttributeName(index, name) {
    currentAttributes[index].attr_name = name.trim();
}

// 更新属性值
function updateAttributeValues(index, valuesStr) {
    const values = valuesStr.split(',').map(v => v.trim()).filter(v => v);
    currentAttributes[index].values = values;
    
    // 如果修改了属性值，提示需要重新生成SKU
    if (currentSKUs.length > 0) {
        const regenerate = confirm('修改属性值后需要重新生成SKU组合，是否继续？');
        if (regenerate) {
            generateSKUs();
        }
    }
}

// 添加属性
function addAttribute(index) {
}

// 生成SKU组合
function generateSKUs() {
    // 过滤有效属性
    const validAttrs = currentAttributes.filter(attr => 
        attr.attr_name && attr.values && attr.values.length > 0
    );

    if (validAttrs.length === 0) {
        alert('请先添加至少一个属性');
        return;
    }

    // 生成笛卡尔积
    const combinations = cartesianProduct(validAttrs.map(attr => attr.values));
    
    // 创建SKU
    currentSKUs = combinations.map((combo, index) => {
        // 检查是否已存在相同组合的SKU
        const existing = currentSKUs.find(sku => {
            if (!sku.attributes) return false;
            return JSON.stringify(sku.attributes) === JSON.stringify(combo);
        });

        if (existing) {
            return existing;
        }

        // 创建新SKU
        return {
            sku_id: null, // 新SKU
            attributes: combo,
            origin_price: 0,
            now_price: 0,
            stock: 0,
            barcode: ''
        };
    });

    renderSKUs();
}

// 笛卡尔积函数
function cartesianProduct(arrays) {
    if (arrays.length === 0) return [[]];
    if (arrays.length === 1) return arrays[0].map(v => [v]);
    
    const result = [];
    const rest = cartesianProduct(arrays.slice(1));
    
    arrays[0].forEach(value => {
        rest.forEach(combination => {
            result.push([value, ...combination]);
        });
    });
    
    return result;
}

// 渲染SKU表格
function renderSKUs() {
    const tbody = document.getElementById('sku-tbody');
    const attrHeaders = document.getElementById('sku-attr-headers');
    
    tbody.innerHTML = '';
    attrHeaders.innerHTML = '';

    // 渲染属性列头
    currentAttributes.forEach(attr => {
        const th = document.createElement('th');
        th.textContent = attr.attr_name;
        attrHeaders.appendChild(th);
    });

    if (currentSKUs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="20" class="no-data">暂无SKU，点击"生成SKU组合"创建</td></tr>';
        return;
    }

    currentSKUs.forEach((sku, index) => {
        const tr = document.createElement('tr');
        
        // SKU ID
        let cells = `<td>${sku.sku_id || '新增'}</td>`;
        
        // 属性值
        if (sku.attributes) {
            sku.attributes.forEach(attrValue => {
                cells += `<td>${attrValue}</td>`;
            });
        }
        
        // 价格和库存
        cells += `
            <td>
                <input type="number" class="sku-input" step="0.01" min="0"
                       value="${sku.origin_price || ''}" 
                       onchange="updateSKUField(${index}, 'origin_price', this.value)">
            </td>
            <td>
                <input type="number" class="sku-input" step="0.01" min="0"
                       value="${sku.now_price || ''}" 
                       onchange="updateSKUField(${index}, 'now_price', this.value)">
            </td>
            <td>
                <input type="number" class="sku-input" min="0"
                       value="${sku.stock || ''}" 
                       onchange="updateSKUField(${index}, 'stock', this.value)">
            </td>
            <td>
                <input type="text" class="sku-input"
                       value="${sku.barcode || ''}" 
                       onchange="updateSKUField(${index}, 'barcode', this.value)">
            </td>
            <td>
                <button type="button" class="btn-delete-small" onclick="deleteSKU(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tr.innerHTML = cells;
        tbody.appendChild(tr);
    });
}

// 更新SKU字段
function updateSKUField(index, field, value) {
    if (field === 'origin_price' || field === 'now_price') {
        currentSKUs[index][field] = parseFloat(value) || 0;
    } else if (field === 'stock') {
        currentSKUs[index][field] = parseInt(value) || 0;
    } else {
        currentSKUs[index][field] = value;
    }
}

// 删除SKU
function deleteSKU(index) {
    if (confirm('确定删除此SKU吗？')) {
        currentSKUs.splice(index, 1);
        renderSKUs();
    }
}

// 保存所有更改
async function saveAllChanges() {
    const spuId = document.getElementById('editSpuId').value;
    const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
    
    // 验证数据
    const spuData = {
        name: document.getElementById('productName').value.trim(),
        description: document.getElementById('productDesc').value.trim(),
        image_url: document.getElementById('productImage').value.trim()
    };

    if (!spuData.name) {
        alert('商品名称不能为空');
        return;
    }

    // 验证属性
    const validAttrs = currentAttributes.filter(attr => attr.attr_name && attr.values.length > 0);
    
    // 验证SKU
    for (const sku of currentSKUs) {
        if (!sku.now_price || sku.now_price <= 0) {
            alert('请填写所有SKU的现价');
            return;
        }
    }

    try {
        // 1. 更新SPU信息
        const spuResponse = await fetch(`${API_BASE_URL}/products/${spuId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(spuData)
        });

        if (!spuResponse.ok) throw new Error('更新SPU失败');

        // 2. 保存属性和SKU
        const saveResponse = await fetch(`${API_BASE_URL}/products/${spuId}/complete`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                attributes: validAttrs,
                skus: currentSKUs
            })
        });

        const result = await saveResponse.json();
        
        if (result.success) {
            alert('保存成功');
            closeEditModal();
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

    currentAttributes = []
    currentSKUs = []

    renderAttributes();
    renderSKUs();
    const addAttrButton = document.querySelector('.btn-add-attribute');
    if (addAttrButton) {
        addAttrButton.disabled = false;
    }
}

// 保存商品
async function saveProduct(event) {
    event.preventDefault();
    
    const spuId = document.getElementById('editSpuId').value;
    const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
    
    const payload = {
        name: document.getElementById('productName').value.trim(),
        description: document.getElementById('productDesc').value.trim(),
        now_price: parseFloat(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productStock').value),
        image_url: document.getElementById('productImage').value.trim()
    };

    if (!payload.name) {
        alert('商品名称不能为空');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/products/${spuId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (data.success) {
            alert('保存成功');
            closeEditModal();
            loadProducts();
        } else {
            alert('保存失败: ' + (data.message || '未知错误'));
        }
    } catch (error) {
        console.error('保存商品失败:', error);
        alert('保存失败');
    }
}

// 删除商品
async function deleteProduct(spuId) {
    if (!confirm('确定要删除这个商品吗？')) return;

    const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
    try {
        const response = await fetch(`${API_BASE_URL}/products/${spuId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        if (data.success) {
            alert('删除成功');
            loadProducts();
        } else {
            alert('删除失败: ' + (data.message || '未知错误'));
        }
    } catch (error) {
        console.error('删除商品失败:', error);
        alert('删除失败');
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

document.addEventListener('DOMContentLoaded', () => {
    const editBtn = document.getElementById('edit-shop-btn');
    const form = document.getElementById('edit-shop-form');
    const cancelBtn = document.getElementById('cancel-shop-btn');
    const saveBtn = document.getElementById('save-shop-btn');

    if (editBtn && form) {
        editBtn.addEventListener('click', () => {
            const curName = document.getElementById('shop-name')?.textContent || '';
            const curDesc = document.getElementById('shop-desc')?.textContent || '';
            document.getElementById('edit-shop-name').value = curName;
            document.getElementById('edit-shop-desc').value = curDesc;
            form.style.display = 'block';
            editBtn.style.display = 'none';
        });
    }

    if (cancelBtn && form && editBtn) {
        cancelBtn.addEventListener('click', () => {
            form.style.display = 'none';
            editBtn.style.display = 'inline-block';
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const id = new URLSearchParams(location.search).get('id') || '';
            const payload = {
                shop_name: document.getElementById('edit-shop-name').value.trim(),
                shop_description: document.getElementById('edit-shop-desc').value.trim()
            };
            if (!payload.shop_name) {
                alert('店铺名称不能为空');
                return;
            }

            const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
            if (!token) {
                alert('请先登录');
                return;
            }

            try {
                const res = await fetch(`${API_BASE_URL}/shop/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) throw new Error(await res.text());

                const data = await res.json();
                if (data.success && data.shop) {
                    document.getElementById('shop-name').textContent = data.shop.shop_name || payload.shop_name;
                    document.getElementById('shop-desc').textContent = data.shop.shop_description || payload.shop_description;
                    form.style.display = 'none';
                    editBtn.style.display = 'inline-block';
                    alert('保存成功');
                } else {
                    alert('保存失败: ' + (data.message || '未知错误'));
                }
            } catch (e) {
                alert('保存失败: ' + e.message);
                console.log('保存失败:', e);
            }
        });
    }

    // 添加商品按钮
    const addProductBtn = document.getElementById('add-product-btn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', showAddProductModal);
    }
});
