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
        const colspan = 5 + currentAttributes.length;
        tbody.innerHTML = `<tr><td colspan="${colspan}" class="no-data">暂无SKU</td></tr>`;
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
            currentAttributes.forEach((attr, attrIndex) => {
                const td = document.createElement('td');
                td.style.width = '120px';
                td.style.minWidth = '120px';
                
                // 在 SKU 的属性中查找对应的属性值
                let skuAttr = null;
                let skuAttrIndex = -1;
                
                if (sku.attributes && sku.attributes.length > 0) {
                    skuAttrIndex = sku.attributes.findIndex(a => a.attr_id === attr.attr_id);
                    if (skuAttrIndex !== -1) {
                        skuAttr = sku.attributes[skuAttrIndex];
                    }
                }
                
                // 如果找到了对应的属性值，渲染下拉框
                if (attr.values && attr.values.length > 0) {
                    const select = document.createElement('select');
                    select.className = 'sku-select';
                    select.onchange = () => updateSKUAttribute(index, attrIndex, select.value);
                    
                    attr.values.forEach(v => {
                        const option = document.createElement('option');
                        const vText = typeof v === 'string' ? v : v.value;
                        const vId = typeof v === 'string' ? null : v.value_id;
                        
                        option.value = vId || '';
                        option.textContent = vText;
                        
                        // 匹配当前选中的值
                        if (skuAttr) {
                            if (vId && skuAttr.value_id && vId == skuAttr.value_id) {
                                option.selected = true;
                            } else if (!vId && !skuAttr.value_id && vText === skuAttr.value) {
                                option.selected = true;
                            }
                        }
                        
                        select.appendChild(option);
                    });
                    
                    // 如果没有选中项，默认选择第一个
                    if (select.selectedIndex === -1) {
                        select.selectedIndex = 0;
                        
                        // 同步更新 SKU 数据
                        const firstValue = attr.values[0];
                        const firstValueId = typeof firstValue === 'string' ? null : firstValue.value_id;
                        const firstValueText = typeof firstValue === 'string' ? firstValue : firstValue.value;
                        
                        // 如果 SKU 没有这个属性，添加它
                        if (!skuAttr) {
                            if (!sku.attributes) {
                                sku.attributes = [];
                            }
                            sku.attributes.push({
                                attr_id: attr.attr_id,
                                attr_name: attr.attr_name,
                                value_id: firstValueId,
                                value: firstValueText
                            });
                        } else {
                            // 更新现有属性
                            skuAttr.value_id = firstValueId;
                            skuAttr.value = firstValueText;
                        }
                    }
                    
                    td.appendChild(select);
                } else {
                    // 如果属性没有可选值，显示文本
                    td.textContent = skuAttr ? skuAttr.value : '-';
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
        btnCommit.onclick = () => saveSKU(index);
        tdAction.appendChild(btnCommit);
        tr.appendChild(tdAction);
        
        tbody.appendChild(tr);
    });
}

// 更新SKU属性值
function updateSKUAttribute(skuIndex, attrIndex, valueId) {
    console.log('更新SKU属性:', { skuIndex, attrIndex, valueId });
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

/**
 * 检查属性组合是否重复
 * @param {number} currentIndex - 当前SKU的索引
 * @returns {boolean} - 如果重复返回true
 */
function checkDuplicateAttributes(currentIndex) {
    const currentSKU = currentSKUs[currentIndex];
    
    // 如果没有属性，不检查
    if (!currentSKU.attributes || currentSKU.attributes.length === 0) {
        return false;
    }
    
    // 生成当前SKU的属性组合签名
    const currentSignature = generateAttributeSignature(currentSKU.attributes);
    
    // 检查其他SKU是否有相同的属性组合
    for (let i = 0; i < currentSKUs.length; i++) {
        // 跳过自己
        if (i === currentIndex) {
            continue;
        }
        
        const otherSKU = currentSKUs[i];
        
        // 如果其他SKU没有属性，跳过
        if (!otherSKU.attributes || otherSKU.attributes.length === 0) {
            continue;
        }
        
        // 生成其他SKU的属性组合签名
        const otherSignature = generateAttributeSignature(otherSKU.attributes);
        
        // 如果签名相同，说明属性组合重复
        if (currentSignature === otherSignature) {
            console.log('发现重复的属性组合:', {
                current: currentSKU.attributes,
                duplicate: otherSKU.attributes
            });
            return true;
        }
    }
    
    return false;
}

/**
 * 生成属性组合的唯一签名
 * @param {Array} attributes - 属性数组
 * @returns {string} - 属性组合的签名字符串
 */
function generateAttributeSignature(attributes) {
    // 按 attr_id 排序，确保顺序一致
    const sortedAttrs = [...attributes].sort((a, b) => a.attr_id - b.attr_id);
    
    // 生成签名：attr_id:value_id|attr_id:value_id|...
    const signature = sortedAttrs.map(attr => {
        const valueId = attr.value_id || attr.value || '';
        return `${attr.attr_id}:${valueId}`;
    }).join('|');
    
    return signature;
}

// 保存单个SKU修改
async function saveSKU(index) {
    const sku = currentSKUs[index];
    console.log('保存SKU数据:', sku);
    const spuId = document.getElementById('editSpuId').value;
    const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');

    // 验证当前SKU数据
    if (!sku.origin_price || !sku.now_price) {
        alert('请填写原价和现价');
        return;
    }

    // if (sku.now_price > sku.origin_price) {
    //     alert('现价不能大于原价');
    //     return;
    // }
    // 检查属性组合是否重复
    const isDuplicate = checkDuplicateAttributes(index);
    if (isDuplicate) {
        alert('该属性组合已存在，请修改后再保存');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/products/${spuId}/skus/${sku.sku_id || ''}`, {
            method: sku.sku_id ? 'PUT' : 'POST', // 如果有sku_id则更新，否则创建
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(sku)
        });

        const result = await response.json();
        console.log('保存单个SKU结果:', result);

        if (result.success) {
            alert('SKU保存成功！');
            // 更新SKU ID（如果是新建的）
            if (!sku.sku_id) {
                sku.sku_id = result.sku.sku_id;
            }
            renderSKUs(); // 重新渲染表格
        } else {
            alert('保存失败: ' + (result.message || '未知错误'));
        }
    } catch (error) {
        console.error('保存SKU失败:', error);
        alert('保存失败: ' + error.message);
    }
}

/**
 * 添加一个新的SKU行
 */
function addSKUs() {
    // 检查是否有属性
    if (currentAttributes.length === 0) {
        alert('请先添加商品属性后再添加SKU');
        return;
    }
    
    // 检查每个属性是否至少有一个值
    const emptyAttributes = currentAttributes.filter(attr => {
        return !attr.values || attr.values.length === 0;
    });
    
    if (emptyAttributes.length > 0) {
        const attrNames = emptyAttributes.map(attr => attr.attr_name).join('、');
        alert(`以下属性没有可选值,请先添加属性值:\n${attrNames}`);
        return;
    }
    
    console.log('当前属性:', currentAttributes);

    // 创建一个新的SKU对象
    const newSKU = {
        sku_id: null, // 新增的SKU没有ID
        origin_price: 0,
        now_price: 0,
        stock: 0,
        barcode: '',
        attributes: currentAttributes.map(attr => ({
            attr_id: attr.attr_id,
            value_id: attr.values[0].value_id,
            value: attr.values[0].value
        })),
        isNew: true // 标记为新增
    };

    // 将新SKU添加到currentSKUs数组
    currentSKUs.push(newSKU);

    // 重新渲染表格
    renderSKUs();
}