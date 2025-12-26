// 已废弃，请使用 shop/
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
        
        // 属性名称（可编辑）
        const attrNameDiv = document.createElement('div');
        attrNameDiv.className = 'attr-display-name';
        attrNameDiv.innerHTML = `
            <label>属性名称</label>
            <div class="editable-field" onclick="makeAttrNameEditable(${index}, this)">
                <span class="attr-name-text">${escapeHtml(attr.attr_name)}</span>
                <i class="fas fa-edit edit-icon"></i>
            </div>
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
                valueTag.className = 'attr-value-tag editable-tag';
                valueTag.innerHTML = `
                    <span class="value-text" onclick="makeValueEditable(${index}, ${valueIndex}, this)">${escapeHtml(valueText)}</span>
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
                           oninput="updateAttributeName(${index}, this.value)"
                           autofocus>
                </div>
                <div class="attr-display-values">
                    <label>属性值 <span class="required">*</span></label>
                    <div class="attr-values-container">
                        <div class="add-value-container">
                            <input type="text" 
                                   class="attr-name-input-new" 
                                   id="new-value-${index}" 
                                   placeholder="至少输入一个属性值"
                                   oninput="updateAttributeValues(${index}, this.value)"
                                   >
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
async function confirmNewAttribute(index) {
    const attr = currentAttributes[index];
    const nameInput = document.getElementById(`new-attr-name-${index}`);
    const attrName = nameInput ? nameInput.value.trim() : '';
    
    console.log('确认新建属性:', { index, attrName, values: attr.values });
    
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
        alert('请至少添加一个属性值！\n提示:在输入框输入值,用逗号分隔多个值');
        const valueInput = document.getElementById(`new-value-${index}`);
        if (valueInput) valueInput.focus();
        return;
    }
    
    // 保存到数据库
    const spuId = document.getElementById('editSpuId').value;
    const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
    
    try {
        const response = await fetch(`${API_BASE_URL}/products/${spuId}/attributes/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                attr_name: attrName,
                values: attr.values
            })
        });
        
        const result = await response.json();
        console.log('保存属性结果:', result);
        
        if (!result.success) {
            alert('保存属性失败: ' + (result.message || '未知错误'));
            return;
        }
        
        // 更新本地数据(添加 attr_id 和 value_id)
        attr.attr_id = result.attr_id;
        attr.attr_name = attrName;
        attr.values = result.values.map(v => ({
            value_id: v.value_id,
            value: v.value
        }));
        delete attr.isNew;
        
        console.log('属性确认成功:', attr);
        
        // 重新渲染
        renderAttributes();
        const addAttrButton = document.querySelector('.btn-add-attribute');
        if (addAttrButton) {
            addAttrButton.disabled = false;
        }
        
        alert('属性添加成功！');
        
    } catch (error) {
        console.error('保存属性失败:', error);
        alert('保存属性失败: ' + error.message);
    }
}

// 实时更新新建属性的名称
function updateAttributeName(index, value) {
    currentAttributes[index].attr_name = value.trim();
    // console.log('属性名称:', currentAttributes[index].attr_name);
}

// 实时更新新建属性的值
function updateAttributeValues(index, value) {
    const values = value.split(',')
        .map(v => v.trim())
        .filter(v => v);
    
    currentAttributes[index].values = values;
    // console.log('属性值:', currentAttributes[index].values);
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
async function addNewAttributeValue(attrIndex) {
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
    
    // 保存到数据库
    const spuId = document.getElementById('editSpuId').value;
    const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
    
    try {
        const response = await fetch(`${API_BASE_URL}/products/${spuId}/attributes/${attr.attr_id}/values`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ value: newValue })
        });
        
        const result = await response.json();
        console.log('添加属性值结果:', result);
        
        if (result.success) {
            // 添加到本地数据
            attr.values.push({
                value_id: result.value_id,
                value: newValue
            });
            
            input.value = '';
            
            // 重新渲染
            renderAttributes();
        } else {
            alert('添加失败: ' + (result.message || '未知错误'));
        }
    } catch (error) {
        console.error('添加属性值失败:', error);
        alert('添加失败: ' + error.message);
    }
}

// 删除属性值
async function removeAttributeValue(attrIndex, valueIndex) {
    const attr = currentAttributes[attrIndex];
    const value = attr.values[valueIndex];
    const valueText = typeof value === 'string' ? value : (value.value || '');
    const valueId = typeof value === 'string' ? null : (value.value_id || null);
    
    if (!confirm(`确定删除属性值"${valueText}"吗？`)) {
        return;
    }
    
    if (!valueId) {
        alert('无法获取属性值ID');
        return;
    }
    
    // 从数据库删除
    const spuId = document.getElementById('editSpuId').value;
    const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
    
    try {
        const response = await fetch(`${API_BASE_URL}/products/${spuId}/attributes/${attr.attr_id}/values/${valueId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            // 删除本地数据
            attr.values.splice(valueIndex, 1);
            
            // 重新渲染
            renderAttributes();
        } else {
            alert('删除失败: ' + (result.message || '未知错误'));
        }
    } catch (error) {
        console.error('删除失败:', error);
        alert('删除失败: ' + error.message);
    }
}

// 使属性名称可编辑
function makeAttrNameEditable(attrIndex, element) {
    const attr = currentAttributes[attrIndex];
    const currentName = attr.attr_name;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'inline-edit-input';
    input.value = currentName;
    
    const saveEdit = async () => {
        const newName = input.value.trim();
        
        if (!newName) {
            alert('属性名称不能为空');
            input.focus();
            return;
        }
        
        if (newName === currentName) {
            renderAttributes();
            return;
        }
        
        // 检查重名
        const exists = currentAttributes.some((a, i) => 
            i !== attrIndex && a.attr_name === newName
        );
        
        if (exists) {
            alert('该属性名称已存在！');
            input.focus();
            return;
        }
        
        // 保存到数据库
        const spuId = document.getElementById('editSpuId').value;
        const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
        
        try {
            const response = await fetch(`${API_BASE_URL}/products/${spuId}/attributes/${attr.attr_id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ attr_name: newName })
            });
            
            const result = await response.json();
            
            if (result.success) {
                attr.attr_name = newName;
                renderAttributes();
            } else {
                alert('保存失败: ' + (result.message || '未知错误'));
            }
        } catch (error) {
            console.error('保存失败:', error);
            alert('保存失败: ' + error.message);
        }
    };
    
    input.onblur = saveEdit;
    input.onkeypress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveEdit();
        } else if (e.key === 'Escape') {
            renderAttributes();
        }
    };
    
    element.innerHTML = '';
    element.appendChild(input);
    input.focus();
    input.select();
}

// 使属性值可编辑
function makeValueEditable(attrIndex, valueIndex, element) {
    const attr = currentAttributes[attrIndex];
    const value = attr.values[valueIndex];
    const currentValue = typeof value === 'string' ? value : (value.value || '');
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'inline-edit-input';
    input.value = currentValue;
    
    const saveEdit = async () => {
        const newValue = input.value.trim();
        
        if (!newValue) {
            alert('属性值不能为空');
            input.focus();
            return;
        }
        
        if (newValue === currentValue) {
            renderAttributes();
            return;
        }
        
        // 检查重复
        const exists = attr.values.some((v, i) => {
            if (i === valueIndex) return false;
            const existingValue = typeof v === 'string' ? v : (v.value || '');
            return existingValue === newValue;
        });
        
        if (exists) {
            alert('该属性值已存在！');
            input.focus();
            return;
        }
        
        // 保存到数据库
        const spuId = document.getElementById('editSpuId').value;
        const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
        const valueId = typeof value === 'string' ? null : (value.value_id || null);
        
        if (!valueId) {
            alert('无法获取属性值ID');
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/products/${spuId}/attributes/${attr.attr_id}/values/${valueId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ value: newValue })
            });
            
            const result = await response.json();
            
            if (result.success) {
                if (typeof attr.values[valueIndex] === 'string') {
                    attr.values[valueIndex] = newValue;
                } else {
                    attr.values[valueIndex].value = newValue;
                }
                
                renderAttributes();
            } else {
                alert('保存失败: ' + (result.message || '未知错误'));
            }
        } catch (error) {
            console.error('保存失败:', error);
            alert('保存失败: ' + error.message);
        }
    };
    
    input.onblur = saveEdit;
    input.onkeypress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveEdit();
        } else if (e.key === 'Escape') {
            renderAttributes();
        }
    };
    
    element.innerHTML = '';
    element.appendChild(input);
    input.focus();
    input.select();
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
        let cells = `<td style="width: 80px;">${sku.sku_id || '新增'}</td>`;
        
        // 属性值 - 改为下拉选择
        if (sku.attributes) {
            sku.attributes.forEach((attrValue, attrIndex) => {
                const attr = currentAttributes.find(a => a.attr_id === attrValue.attr_id);
                if (attr) {
                    cells += `
                        <td style="width: 120px;">
                            <select class="sku-select" onchange="updateSKUAttribute(${index}, ${attrIndex}, this.value)">
                                ${attr.values.map(v => {
                                    const vText = typeof v === 'string' ? v : v.value;
                                    const vId = typeof v === 'string' ? null : v.value_id;
                                    const selected = vId === attrValue.value_id || vText === attrValue.value ? 'selected' : '';
                                    return `<option value="${vId}" ${selected}>${escapeHtml(vText)}</option>`;
                                }).join('')}
                            </select>
                        </td>
                    `;
                } else {
                    cells += `<td style="width: 120px;">${attrValue.value}</td>`;
                }
            });
        } else {
            // 如果没有属性值,填充空列
            currentAttributes.forEach(() => {
                cells += `<td style="width: 120px;">-</td>`;
            });
        }
        
        // 价格和库存 - 添加固定宽度
        cells += `
            <td style="width: 100px;">
                <input type="number" class="sku-input" step="0.01" min="0"
                       value="${sku.origin_price || ''}" 
                       onchange="updateSKUField(${index}, 'origin_price', this.value)"
                       placeholder="原价">
            </td>
            <td style="width: 100px;">
                <input type="number" class="sku-input" step="0.01" min="0"
                       value="${sku.now_price || ''}" 
                       onchange="updateSKUField(${index}, 'now_price', this.value)"
                       placeholder="现价">
            </td>
            <td style="width: 80px;">
                <input type="number" class="sku-input" min="0"
                       value="${sku.stock || ''}" 
                       onchange="updateSKUField(${index}, 'stock', this.value)"
                       placeholder="库存">
            </td>
            <td style="width: 150px;">
                <input type="text" class="sku-input"
                       value="${sku.barcode || ''}" 
                       onchange="updateSKUField(${index}, 'barcode', this.value)"
                       placeholder="条形码">
            </td>
            <td style="width: 80px;">
                <button type="button" class="btn-delete-small" onclick="deleteSKU(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tr.innerHTML = cells;
        tbody.appendChild(tr);
    });
}

// 更新SKU属性值
function updateSKUAttribute(skuIndex, attrIndex, valueId) {
    const sku = currentSKUs[skuIndex];
    if (!sku.attributes || !sku.attributes[attrIndex]) return;
    
    const attr = currentAttributes.find(a => a.attr_id === sku.attributes[attrIndex].attr_id);
    if (!attr) return;
    
    const selectedValue = attr.values.find(v => {
        const vId = typeof v === 'string' ? null : v.value_id;
        return vId == valueId;
    });
    
    if (selectedValue) {
        sku.attributes[attrIndex].value_id = typeof selectedValue === 'string' ? null : selectedValue.value_id;
        sku.attributes[attrIndex].value = typeof selectedValue === 'string' ? selectedValue : selectedValue.value;
        sku.isModified = true; // 标记为已修改
    }
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

// 保存spu更改
async function saveSpuChanges() {
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

    try {
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
            loadProducts(); // 刷新商品列表
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
