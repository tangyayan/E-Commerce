/**
 * 属性管理模块
 */

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
        
        // 属性值列表
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

// 添加属性行
function addAttributeRow() {
    const tempIndex = currentAttributes.length;
    
    currentAttributes.push({
        attr_id: null,
        attr_name: '',
        values: [],
        isNew: true
    });
    
    renderAttributesWithNewRow(tempIndex);
}

// 渲染包含新建行的属性列表
function renderAttributesWithNewRow(newIndex) {
    const container = document.getElementById('attributesContainer');
    container.innerHTML = '';

    const addAttrButton = document.querySelector('.btn-add-attribute');
    if (addAttrButton) {
        addAttrButton.disabled = true;
    }

    currentAttributes.forEach((attr, index) => {
        const attrDiv = document.createElement('div');
        attrDiv.className = 'attribute-display-row';
        
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
                                   placeholder="至少输入一个属性值(用逗号分隔)"
                                   oninput="updateAttributeValues(${index}, this.value)">
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
            
            if (attr.values && attr.values.length > 0) {
                attr.values.forEach((value, valueIndex) => {
                    const valueText = typeof value === 'string' ? value : (value.value || '');
                    const valueTag = document.createElement('span');
                    valueTag.className = 'attr-value-tag';
                    valueTag.innerHTML = `${escapeHtml(valueText)}`;
                    valuesContainer.appendChild(valueTag);
                });
            }
            
            attrValuesDiv.appendChild(valuesContainer);
            attrDiv.appendChild(attrValuesDiv);
        }
        
        container.appendChild(attrDiv);
    });
}

// 实时更新新建属性的名称
function updateAttributeName(index, value) {
    currentAttributes[index].attr_name = value.trim();
}

// 实时更新新建属性的值
function updateAttributeValues(index, value) {
    const values = value.split(',')
        .map(v => v.trim())
        .filter(v => v);
    
    currentAttributes[index].values = values;
}

// 确认新建属性
async function confirmNewAttribute(index) {
    const attr = currentAttributes[index];
    const nameInput = document.getElementById(`new-attr-name-${index}`);
    const attrName = nameInput ? nameInput.value.trim() : '';
    
    console.log('确认新建属性:', { index, attrName, values: attr.values });
    
    if (!attrName) {
        alert('属性名称不能为空！');
        nameInput.focus();
        return;
    }
    
    const exists = currentAttributes.some((a, i) => 
        i !== index && a.attr_name === attrName
    );
    
    if (exists) {
        alert('该属性名称已存在！');
        nameInput.focus();
        return;
    }
    
    if (!attr.values || attr.values.length === 0) {
        alert('请至少添加一个属性值！\n提示:在输入框输入值,用逗号分隔多个值');
        const valueInput = document.getElementById(`new-value-${index}`);
        if (valueInput) valueInput.focus();
        return;
    }
    
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
        
        attr.attr_id = result.attr_id;
        attr.attr_name = attrName;
        attr.values = result.values.map(v => ({
            value_id: v.value_id,
            value: v.value
        }));
        delete attr.isNew;
        
        console.log('属性确认成功:', attr);
        
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
    
    const exists = attr.values.some(v => {
        const existingValue = typeof v === 'string' ? v : (v.value || '');
        return existingValue === newValue;
    });
    
    if (exists) {
        alert('该属性值已存在！');
        input.value = '';
        return;
    }
    
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
            attr.values.push({
                value_id: result.value_id,
                value: newValue
            });
            
            input.value = '';
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
            attr.values.splice(valueIndex, 1);
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
        
        const exists = currentAttributes.some((a, i) => 
            i !== attrIndex && a.attr_name === newName
        );
        
        if (exists) {
            alert('该属性名称已存在！');
            input.focus();
            return;
        }
        
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