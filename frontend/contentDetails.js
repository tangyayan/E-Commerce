// API 基础 URL
const API_BASE_URL = 'http://localhost:3000/api';

console.clear();

// 从 URL 获取商品 ID
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

console.log('商品 ID:', productId);

if (!productId) {
    alert('缺少商品 ID');
    window.location.href = 'content.html';
}

// ==================== 创建商品详情 DOM ====================
// TODO: 发货地址显示 
function dynamicContentDetails(req) {
    const product = req.product;
    const mainContainer = document.getElementById('containerProduct');
    mainContainer.innerHTML = ''; // 清空加载提示

    // 主容器
    const containerD = document.createElement('div');
    containerD.id = 'containerD';

    // 店铺名称
    const h4 = document.createElement('h4');
    if(product.shop_name) {
        let a = document.createElement("a");
        a.href = `shop.html?id=${product.shop_id}`;
        a.textContent = product.shop_name;
        a.classList.add("shop-link");
        h4.appendChild(a);
    } else {
        h4.appendChild(document.createTextNode('未知店铺'));
    }

    // 内容包装器
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'content-wrapper';

    // ========== 图片区域 ==========
    const imageSectionDiv = document.createElement('div');
    imageSectionDiv.id = 'imageSection';

    const imgTag = document.createElement('img');
    imgTag.id = 'imgDetails';
    imgTag.src = product.image_url || 'img/default-product.jpg';
    imgTag.alt = product.name;

    imageSectionDiv.appendChild(imgTag);

    // ========== 商品详情区域 ==========
    const productDetailsDiv = document.createElement('div');
    productDetailsDiv.id = 'productDetails';

    // 商品名称
    const h1 = document.createElement('h1');
    h1.textContent = product.name;
    productDetailsDiv.appendChild(h1);

    // 详情容器
    const detailsDiv = document.createElement('div');
    detailsDiv.id = 'details';

    // 价格信息
    const priceDiv = document.createElement('div');
    priceDiv.className = 'price-section';

    // 获取价格范围
    let minPrice = product.now_price || 0;
    let maxPrice = product.origin_price || 0;
    
    if (product.skus && product.skus.length > 0) {
        const prices = product.skus.map(sku => parseFloat(sku.now_price));
        minPrice = Math.min(...prices);
        
        const originPrices = product.skus.map(sku => parseFloat(sku.origin_price));
        maxPrice = Math.max(...originPrices);
    }

    if (maxPrice && maxPrice > minPrice) {
        const originalPrice = document.createElement('span');
        originalPrice.className = 'original-price';
        originalPrice.textContent = `¥${maxPrice}`;
        priceDiv.appendChild(originalPrice);
    }

    const currentPrice = document.createElement('h3');
    currentPrice.id = 'currentPrice';
    currentPrice.className = 'current-price';
    currentPrice.textContent = `¥${minPrice}`;
    priceDiv.appendChild(currentPrice);

    detailsDiv.appendChild(priceDiv);

    // 库存信息
    const stockDiv = document.createElement('div');
    stockDiv.id = 'stockDiv';
    stockDiv.className = 'stock-section';
    const totalStock = product.skus ? 
        product.skus.reduce((sum, sku) => sum + (parseInt(sku.stock) || 0), 0) : 0;
    
    stockDiv.innerHTML = `
        <span class="stock-label">库存:</span>
        <span class="stock-value ${totalStock === 0 ? 'out-of-stock' : ''}">${totalStock}</span>
    `;
    detailsDiv.appendChild(stockDiv);

    // ========== 属性选择区域（智能联动）==========
    let selectedAttributes = {}; // 记录已选择的属性 {attr_id: value_id}
    let selectedSkuId = null;
    const attributeButtons = {}; // 存储所有属性按钮的引用 {attr_id: [buttons]}

    // 构建可用的 SKU 属性组合集合
    const availableSkuCombinations = new Set();
    product.skus.forEach(sku => {
        if (sku.attributes && sku.attributes.length > 0) {
            const tuple = sku.attributes
                .map(attr => attr.value_id)
                .sort((a, b) => a - b)  // 数字排序
                .join(',');
            availableSkuCombinations.add(tuple);
        }
    });
    console.log('可用 SKU 属性组合:', Array.from(availableSkuCombinations));

    // 默认选择第一个 SKU 的属性
    if (product.skus && product.skus.length > 0) {
        const firstSku = product.skus[0];
        if (firstSku.attributes && firstSku.attributes.length > 0) {
            firstSku.attributes.forEach(attr => {
                selectedAttributes[attr.attr_id] = attr.value_id;
            });
            selectedSkuId = firstSku.sku_id;
            console.log('默认选择第一个 SKU:', firstSku);
            console.log('默认选中的属性:', selectedAttributes);
        }
    }

    if (product.attributes && product.attributes.length > 0) {
        const attributesSection = document.createElement('div');
        attributesSection.className = 'attributes-section';

        product.attributes.forEach(attribute => {
            if (!attribute.values || attribute.values.length === 0) return;

            // 属性组容器
            const attrGroup = document.createElement('div');
            attrGroup.className = 'attribute-group';
            attrGroup.dataset.attrId = attribute.attr_id;

            // 属性名称
            const attrLabel = document.createElement('div');
            attrLabel.className = 'attribute-label';
            attrLabel.textContent = attribute.attr_name + ':';
            attrGroup.appendChild(attrLabel);

            // 属性值按钮容器
            const attrValuesContainer = document.createElement('div');
            attrValuesContainer.className = 'attribute-values';

            // 初始化该属性的按钮数组
            attributeButtons[attribute.attr_id] = [];

            attribute.values.forEach((valueObj) => {
                const valueButton = document.createElement('button');
                valueButton.className = 'attribute-value-button';
                valueButton.textContent = valueObj.value;
                valueButton.dataset.attrId = attribute.attr_id;
                valueButton.dataset.valueId = valueObj.value_id;

                // 存储按钮引用
                attributeButtons[attribute.attr_id].push(valueButton);

                // 根据第一个 SKU 的属性设置默认激活状态
                if (selectedAttributes[attribute.attr_id] == valueObj.value_id) {
                    valueButton.classList.add('active');
                }

                // 点击事件
                valueButton.onclick = function() {
                    // 如果按钮被禁用，不响应点击
                    if (this.disabled || this.classList.contains('disabled')) {
                        console.log('按钮已禁用，无法点击');
                        return;
                    }
                    
                    if(this.classList.contains('active')) {
                        this.classList.remove('active');
                        console.log('取消了属性:', {
                            attr_id: this.dataset.attrId,
                            value_id: this.dataset.valueId,
                            text: this.textContent,
                            allSelected: selectedAttributes
                        });
                        delete selectedAttributes[this.dataset.attrId];
                        selectedSkuId = null;
                        resetPriceAndStock();
                        updateAttributeButtons();
                    }
                    else {// 激活当前按钮
                        // 移除同组其他按钮的激活状态
                        attrValuesContainer.querySelectorAll('.attribute-value-button').forEach(btn => {
                            btn.classList.remove('active');
                        });

                        this.classList.add('active');
                        // 更新选中的属性
                        selectedAttributes[this.dataset.attrId] = this.dataset.valueId;
                        
                        console.log('选择了属性:', {
                            attr_id: this.dataset.attrId,
                            value_id: this.dataset.valueId,
                            text: this.textContent,
                            allSelected: selectedAttributes
                        });
                        
                        // 更新其他属性按钮的可用状态
                        updateAttributeButtons();
                        
                        // 查找匹配的 SKU
                        if(Object.keys(selectedAttributes).length === Object.keys(attributeButtons).length) 
                            updateSelectedSku();
                        else resetPriceAndStock();
                    }
                };

                attrValuesContainer.appendChild(valueButton);
            });

            attrGroup.appendChild(attrValuesContainer);
            attributesSection.appendChild(attrGroup);
        });

        detailsDiv.appendChild(attributesSection);
    }

    // 重置价格和库存为范围显示
    function resetPriceAndStock() {
        console.log('重置价格和库存显示...');
        
        // 重置价格为价格范围
        const priceElement = document.getElementById('currentPrice');
        if (priceElement && product.skus && product.skus.length > 0) {
            const prices = product.skus.map(sku => parseFloat(sku.now_price));
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            
            if (minPrice === maxPrice) {
                priceElement.textContent = `¥${minPrice}`;
            } else {
                priceElement.textContent = `¥${minPrice} - ¥${maxPrice}`;
            }
        }
        
        // 重置原价
        const originalPriceElement = document.querySelector('.original-price');
        if (originalPriceElement && product.skus && product.skus.length > 0) {
            const originPrices = product.skus.map(sku => parseFloat(sku.origin_price));
            const maxOriginPrice = Math.max(...originPrices);
            
            if (maxOriginPrice > Math.min(...product.skus.map(sku => parseFloat(sku.now_price)))) {
                originalPriceElement.textContent = `¥${maxOriginPrice}`;
                originalPriceElement.style.display = 'inline';
            } else {
                originalPriceElement.style.display = 'none';
            }
        }
        
        // 重置库存为总库存
        const stockElement = document.getElementById('stockDiv');
        if (stockElement) {
            const totalStock = product.skus ? 
                product.skus.reduce((sum, sku) => sum + (parseInt(sku.stock) || 0), 0) : 0;
            
            stockElement.innerHTML = `
                <span class="stock-label">库存:</span>
                <span class="stock-value ${totalStock === 0 ? 'out-of-stock' : ''}">${totalStock}</span>
            `;
        }
        
        // 重置"加入购物车"按钮
        const addToCartBtn = document.querySelector('.add-to-cart-btn');
        if (addToCartBtn) {
            const totalStock = product.skus ? 
                product.skus.reduce((sum, sku) => sum + (parseInt(sku.stock) || 0), 0) : 0;
            
            if (totalStock === 0) {
                addToCartBtn.disabled = true;
                addToCartBtn.textContent = '已售罄';
                addToCartBtn.classList.add('disabled');
            } else {
                addToCartBtn.disabled = false;
                addToCartBtn.textContent = '请选择完整规格';
                addToCartBtn.classList.remove('disabled');
            }
        }
    }

    // 更新属性按钮的可用状态
    function updateAttributeButtons() {
        console.log('=== 开始更新属性按钮状态 ===');
        console.log('当前选中的属性:', selectedAttributes);

        const totalAttrCount = Object.keys(attributeButtons).length;

        // 遍历每个属性组
        Object.keys(attributeButtons).forEach(attrId => {
            const buttons = attributeButtons[attrId];
            console.log(`\n检查属性组 ${attrId}:`);

            buttons.forEach(button => {
                const valueId = button.dataset.valueId;

                // 构建假设选择该按钮后的属性组合
                const testAttributes = { ...selectedAttributes };
                testAttributes[attrId] = valueId;
                let isAvailable = false;
                let testAttrCount = Object.keys(testAttributes).length;

                if (testAttrCount === totalAttrCount ){
                    // 将属性组合转换为排序后的字符串
                    const testTuple = Object.keys(testAttributes)
                        .sort((a, b) => a - b)  // 按 attr_id 排序
                        .map(key => testAttributes[key])
                        .sort((a, b) => a - b)  // 按 value_id 排序
                        .join(',');

                    console.log(`  测试按钮: ${button.textContent} (value_id=${valueId})`);
                    console.log(`    测试组合: ${testTuple}`);

                    // 检查这个组合是否在可用的 SKU 组合中
                    isAvailable = availableSkuCombinations.has(testTuple);
                }
                else {
                    // 部分选择属性时，检查是否存在包含当前选择和测试值的 SKU
                    isAvailable = Array.from(availableSkuCombinations).some(tuple => {
                        const tupleValues = tuple.split(',');
                        // 检查是否包含所有已选属性值和当前测试值
                        return Object.values(testAttributes).every(valId => 
                            tupleValues.includes(valId)
                        );
                    });
                }
                if (isAvailable) {
                    // 启用按钮
                    button.disabled = false;
                    button.classList.remove('disabled');
                    console.log(`组合存在，启用按钮 ${button.textContent}`);
                } else {
                    // 如果这个按钮当前是激活状态，不禁用它（允许用户保持当前选择）
                    if (!button.classList.contains('active')) {
                        button.disabled = true;
                        button.classList.add('disabled');
                        console.log(`组合不存在，禁用按钮`);
                    } else {
                        console.log(`组合不存在，但按钮是激活状态，保持启用`);
                    }
                }
            });
        });

        console.log('=== 属性按钮状态更新完成 ===\n');
    }

    // 查找匹配的 SKU
    function updateSelectedSku() {
        console.log('查找匹配的 SKU...');
        console.log('当前选择的属性:', selectedAttributes);

        if (!product.skus || product.skus.length === 0) {
            console.warn('没有可用的 SKU');
            return;
        }

        // 查找匹配所有选中属性的 SKU
        const matchedSku = product.skus.find(sku => {
            if (!sku.attributes || sku.attributes.length === 0) {
                return false;
            }

            // 检查 SKU 的所有属性是否与选中的属性完全匹配
            const skuAttrCount = sku.attributes.length;
            const selectedAttrCount = Object.keys(selectedAttributes).length;

            // 确保属性数量一致
            if (skuAttrCount !== selectedAttrCount) {
                return false;
            }

            // 检查每个属性是否都匹配
            return sku.attributes.every(skuAttr => {
                const selectedValueId = selectedAttributes[skuAttr.attr_id];
                return selectedValueId && selectedValueId == skuAttr.value_id;
            });
        });

        if (matchedSku) {
            selectedSkuId = matchedSku.sku_id;
            console.log('✅ 找到匹配的 SKU:', matchedSku);

            // 更新价格
            const priceElement = document.getElementById('currentPrice');
            if (priceElement) {
                priceElement.textContent = `¥${matchedSku.now_price}`;
            }

            // 更新原价
            const originalPriceElement = document.querySelector('.original-price');
            if (matchedSku.origin_price && parseFloat(matchedSku.origin_price) > parseFloat(matchedSku.now_price)) {
                if (originalPriceElement) {
                    originalPriceElement.textContent = `¥${matchedSku.origin_price}`;
                    originalPriceElement.style.display = 'inline';
                } else {
                    const newOriginalPrice = document.createElement('span');
                    newOriginalPrice.className = 'original-price';
                    newOriginalPrice.textContent = `¥${matchedSku.origin_price}`;
                    priceElement.parentNode.insertBefore(newOriginalPrice, priceElement);
                }
            } else if (originalPriceElement) {
                originalPriceElement.style.display = 'none';
            }

            // 更新库存
            const stockElement = document.getElementById('stockDiv');
            if (stockElement) {
                const stock = parseInt(matchedSku.stock) || 0;
                stockElement.innerHTML = `
                    <span class="stock-label">库存:</span>
                    <span class="stock-value ${stock === 0 ? 'out-of-stock' : ''}">${stock === 0 ? '已售罄' : stock}</span>
                `;
            }

            // 更新按钮状态
            const addToCartBtn = document.querySelector('.add-to-cart-btn');
            if (addToCartBtn) {
                if (matchedSku.stock <= 0) {
                    addToCartBtn.disabled = true;
                    addToCartBtn.textContent = '已售罄';
                    addToCartBtn.classList.add('disabled');
                } else {
                    addToCartBtn.disabled = false;
                    addToCartBtn.textContent = '加入购物车';
                    addToCartBtn.classList.remove('disabled');
                }
            }
        } else {
            console.warn('❌ 没有找到匹配的 SKU');
            selectedSkuId = null;

            // 显示"暂无库存"状态
            const stockElement = document.getElementById('stockDiv');
            if (stockElement) {
                stockElement.innerHTML = `
                    <span class="stock-label">库存:</span>
                    <span class="stock-value out-of-stock">暂无此规格</span>
                `;
            }

            // 禁用加入购物车按钮
            const addToCartBtn = document.querySelector('.add-to-cart-btn');
            if (addToCartBtn) {
                addToCartBtn.disabled = true;
                addToCartBtn.textContent = '暂无此规格';
                addToCartBtn.classList.add('disabled');
            }
        }
    }

    // 🔥 初始化时更新属性按钮状态和 SKU
    if (product.attributes && product.attributes.length > 0) {
        setTimeout(() => {
            console.log('初始化属性按钮状态...');
            updateAttributeButtons();
            updateSelectedSku();
        }, 100);
    }

    // 描述标题
    const h3Description = document.createElement('h3');
    h3Description.textContent = '商品描述';
    detailsDiv.appendChild(h3Description);

    // 描述内容
    const para = document.createElement('p');
    para.textContent = product.description || '暂无描述';
    detailsDiv.appendChild(para);

    // ========== 按钮区域 ==========
    const buttonDiv = document.createElement('div');
    buttonDiv.id = 'button';

    const addToCartButton = document.createElement('button');
    addToCartButton.className = 'add-to-cart-btn';
    addToCartButton.textContent = '加入购物车';
    
    if (totalStock === 0) {
        addToCartButton.disabled = true;
        addToCartButton.textContent = '已售罄';
        addToCartButton.classList.add('disabled');
    }

    addToCartButton.onclick = async function() {
        if (!selectedSkuId) {
            alert('请选择完整的商品规格');
            return;
        }
        await addToCart(selectedSkuId, product.name);
    };

    buttonDiv.appendChild(addToCartButton);

    // ========== 组装 DOM ==========
    containerD.appendChild(h4);
    containerD.appendChild(contentWrapper);
    contentWrapper.appendChild(imageSectionDiv);
    contentWrapper.appendChild(productDetailsDiv);
    productDetailsDiv.appendChild(detailsDiv);
    productDetailsDiv.appendChild(buttonDiv);

    mainContainer.appendChild(containerD);
}

// ==================== 加入购物车功能 ====================
async function addToCart(skuId, productName) {
    try {
        // 检查用户是否登录
        const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
        
        if (!token) {
            if (confirm('您还未登录，是否前往登录页面?')) {
                window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
            }
            return;
        }

        console.log('加入购物车:', { skuId, productName });

        // 显示加载状态
        const addToCartBtn = document.querySelector('.add-to-cart-btn');
        const originalText = addToCartBtn.textContent;
        addToCartBtn.disabled = true;
        addToCartBtn.textContent = '添加中...';

        const response = await fetch(`${API_BASE_URL}/cart`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ 
                sku_id: skuId,
                quantity: 1 
            }),
        });

        const result = await response.json();
        
        // 恢复按钮状态
        addToCartBtn.disabled = false;
        addToCartBtn.textContent = originalText;
        
        if (result.success) {
            console.log('加入购物车成功:', result);
            
            // 显示成功提示
            showNotification('✅ ' + result.message, 'success');
            
            // 更新购物车数量徽章
            updateCartBadge();
            
            // 询问是否前往购物车
            if (confirm(`${productName} 已添加到购物车\n是否立即查看购物车?`)) {
                window.location.href = 'cart.html';
            }
        } else {
            console.error('加入购物车失败:', result.message);
            showNotification('❌ ' + result.message, 'error');
            
            // 如果是库存不足，可以提供更多信息
            if (result.message.includes('库存不足')) {
                alert(result.message);
            }
        }
    } catch (error) {
        console.error('加入购物车时发生错误:', error);
        showNotification('❌ 加入购物车时发生错误', 'error');
        
        // 恢复按钮状态
        const addToCartBtn = document.querySelector('.add-to-cart-btn');
        if (addToCartBtn) {
            addToCartBtn.disabled = false;
            addToCartBtn.textContent = '加入购物车';
        }
    }
}

// 显示通知
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 显示动画
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // 3秒后自动消失
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// 更新购物车徽章数量
async function updateCartBadge() {
    try {
        const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
        if (!token) return;
        
        const response = await fetch(`${API_BASE_URL}/cart`, {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            const badge = document.getElementById('badge');
            if (badge) {
                sessionStorage.setItem('badge', result.total);
                badge.textContent = result.total;
                badge.style.display = result.total > 0 ? 'block' : 'none';
            }
        }
    } catch (error) {
        console.error('更新购物车徽章失败:', error);
    }
}

// ==================== 后端调用 ====================
async function fetchProductDetails() {
    const mainContainer = document.getElementById('containerProduct');
    
    if (!mainContainer) {
        console.error('找不到 containerProduct 元素');
        return;
    }
    
    mainContainer.innerHTML = '<div class="loading">加载中...</div>';
    
    try {
        console.log('开始获取商品详情...');
        const response = await fetch(`${API_BASE_URL}/products/${productId}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('商品详情:', data);
            
            if (data.success && data.product) {
                dynamicContentDetails(data);
            } else {
                throw new Error(data.message || '商品不存在');
            }
        } else {
            console.error('获取商品详情失败:', response.statusText);
            mainContainer.innerHTML = `
                <div class="error-message">
                    <p>获取商品详情失败</p>
                    <button onclick="location.reload()">重试</button>
                </div>
            `;
        }
    } catch (error) {
        console.error('获取商品详情时发生错误:', error);
        mainContainer.innerHTML = `
            <div class="error-message">
                <p>获取商品详情时发生错误: ${error.message}</p>
                <button onclick="location.reload()">重试</button>
                <button onclick="window.location.href='content.html'">返回商品列表</button>
            </div>
        `;
    }
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    console.log('页面加载完成');
    fetchProductDetails();
});
