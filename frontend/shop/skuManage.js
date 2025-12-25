/**
 * SKU管理模块
 */

// 渲染SKU表格
function renderSKUs() {
    const tbody = document.getElementById('sku-tbody');
    const thead = document.querySelector('#sku-table thead tr');
    
    tbody.innerHTML = '';
    
    // 完全重建表头
    thead.innerHTML = `
        <th style="width: 80px; min-width: 80px;">SKU ID</th>
    `;

    // 添加属性列头
    currentAttributes.forEach(attr => {
        const th = document.createElement('th');
        th.textContent = attr.attr_name;
        th.style.width = '120px';
        th.style.minWidth = '120px';
        thead.appendChild(th);
    });

    // 添加固定列头
    const fixedHeaders = [
        { text: '原价', width: '100px' },
        { text: '现价', width: '100px' },
        { text: '库存', width: '80px' },
        { text: '条形码', width: '150px' },
        { text: '操作', width: '80px' }
    ];

    fixedHeaders.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header.text;
        th.style.width = header.width;
        th.style.minWidth = header.width;
        thead.appendChild(th);
    });

    if (currentSKUs.length === 0) {
        const colspan = 6 + currentAttributes.length;
        tbody.innerHTML = `<tr><td colspan="${colspan}" class="no-data">暂无SKU，点击"生成SKU组合"创建</td></tr>`;
        return;
    }

    currentSKUs.forEach((sku, index) => {
        const tr = document.createElement('tr');
        
        // SKU ID
        const tdId = document.createElement('td');
        tdId.style.width = '80px';
        tdId.style.minWidth = '80px';
        tdId.textContent = sku.sku_id || '新增';
        tr.appendChild(tdId);
        
        // 属性值下拉选择
        if (sku.attributes) {
            sku.attributes.forEach((attrValue, attrIndex) => {
                const td = document.createElement('td');
                td.style.width = '120px';
                td.style.minWidth = '120px';
                
                const attr = currentAttributes.find(a => a.attr_id === attrValue.attr_id);
                if (attr) {
                    const select = document.createElement('select');
                    select.className = 'sku-select';
                    select.onchange = () => updateSKUAttribute(index, attrIndex, select.value);
                    
                    attr.values.forEach(v => {
                        const option = document.createElement('option');
                        const vText = typeof v === 'string' ? v : v.value;
                        const vId = typeof v === 'string' ? null : v.value_id;
                        option.value = vId;
                        option.textContent = vText;
                        if (vId === attrValue.value_id || vText === attrValue.value) {
                            option.selected = true;
                        }
                        select.appendChild(option);
                    });
                    
                    td.appendChild(select);
                } else {
                    td.textContent = attrValue.value;
                }
                
                tr.appendChild(td);
            });
        } else {
            // 如果没有属性值,填充空列
            currentAttributes.forEach(() => {
                const td = document.createElement('td');
                td.style.width = '120px';
                td.style.minWidth = '120px';
                td.textContent = '-';
                tr.appendChild(td);
            });
        }
        
        // 原价
        const tdOriginPrice = document.createElement('td');
        tdOriginPrice.style.width = '100px';
        tdOriginPrice.style.minWidth = '100px';
        const inputOriginPrice = document.createElement('input');
        inputOriginPrice.type = 'number';
        inputOriginPrice.className = 'sku-input';
        inputOriginPrice.step = '0.01';
        inputOriginPrice.min = '0';
        inputOriginPrice.value = sku.origin_price || '';
        inputOriginPrice.placeholder = '原价';
        inputOriginPrice.onchange = () => updateSKUField(index, 'origin_price', inputOriginPrice.value);
        tdOriginPrice.appendChild(inputOriginPrice);
        tr.appendChild(tdOriginPrice);
        
        // 现价
        const tdNowPrice = document.createElement('td');
        tdNowPrice.style.width = '100px';
        tdNowPrice.style.minWidth = '100px';
        const inputNowPrice = document.createElement('input');
        inputNowPrice.type = 'number';
        inputNowPrice.className = 'sku-input';
        inputNowPrice.step = '0.01';
        inputNowPrice.min = '0';
        inputNowPrice.value = sku.now_price || '';
        inputNowPrice.placeholder = '现价';
        inputNowPrice.onchange = () => updateSKUField(index, 'now_price', inputNowPrice.value);
        tdNowPrice.appendChild(inputNowPrice);
        tr.appendChild(tdNowPrice);
        
        // 库存
        const tdStock = document.createElement('td');
        tdStock.style.width = '80px';
        tdStock.style.minWidth = '80px';
        const inputStock = document.createElement('input');
        inputStock.type = 'number';
        inputStock.className = 'sku-input';
        inputStock.min = '0';
        inputStock.value = sku.stock || '';
        inputStock.placeholder = '库存';
        inputStock.onchange = () => updateSKUField(index, 'stock', inputStock.value);
        tdStock.appendChild(inputStock);
        tr.appendChild(tdStock);
        
        // 条形码
        const tdBarcode = document.createElement('td');
        tdBarcode.style.width = '150px';
        tdBarcode.style.minWidth = '150px';
        const inputBarcode = document.createElement('input');
        inputBarcode.type = 'text';
        inputBarcode.className = 'sku-input';
        inputBarcode.value = sku.barcode || '';
        inputBarcode.placeholder = '条形码';
        inputBarcode.onchange = () => updateSKUField(index, 'barcode', inputBarcode.value);
        tdBarcode.appendChild(inputBarcode);
        tr.appendChild(tdBarcode);
        
        // 操作
        const tdAction = document.createElement('td');
        tdAction.style.width = '80px';
        tdAction.style.minWidth = '80px';
        const btnDelete = document.createElement('button');
        btnDelete.type = 'button';
        btnDelete.className = 'btn-delete-small';
        btnDelete.innerHTML = '<i class="fas fa-trash"></i>';
        btnDelete.onclick = () => deleteSKU(index);
        tdAction.appendChild(btnDelete);
        const btnCommit = document.createElement('button');
        btnCommit.type = 'button';
        btnCommit.className = 'btn-save-small';
        btnCommit.innerHTML = '<i class="fas fa-check"></i>';
        btnCommit.onclick = () => saveSKU();
        tdAction.appendChild(btnCommit);
        tr.appendChild(tdAction);
        
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
        sku.isModified = true;
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
    currentSKUs[index].isModified = true;
}

// 删除SKU
async function deleteSKU(index) {
    const sku = currentSKUs[index];
    
    if (!confirm('确定删除此SKU吗？')) {
        return;
    }
    
    if (sku.sku_id) {
        const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
        const spuId = document.getElementById('editSpuId').value;
        
        try {
            const response = await fetch(`${API_BASE_URL}/products/${spuId}/skus/${sku.sku_id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const result = await response.json();
            
            if (!result.success) {
                alert('删除失败: ' + (result.message || '未知错误'));
                return;
            }
        } catch (error) {
            console.error('删除SKU失败:', error);
            alert('删除失败: ' + error.message);
            return;
        }
    }
    
    currentSKUs.splice(index, 1);
    renderSKUs();
}

// 保存所有SKU修改
async function saveSKU() {
    const spuId = document.getElementById('editSpuId').value;
    const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
    
    const invalidSKUs = currentSKUs.filter(sku => {
        return !sku.origin_price || !sku.now_price || sku.now_price > sku.origin_price;
    });
    
    if (invalidSKUs.length > 0) {
        alert('请检查SKU数据:\n1. 原价和现价不能为空\n2. 现价不能大于原价');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/products/${spuId}/skus`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ skus: currentSKUs })
        });
        
        const result = await response.json();
        console.log('保存SKU结果:', result);
        
        if (result.success) {
            alert('SKU保存成功！');
            await loadAttributesAndSKUs(spuId);
        } else {
            alert('保存失败: ' + (result.message || '未知错误'));
        }
    } catch (error) {
        console.error('保存SKU失败:', error);
        alert('保存失败: ' + error.message);
    }
}