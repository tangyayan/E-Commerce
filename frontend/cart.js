console.clear();

// API 基础 URL
const API_BASE_URL = 'http://localhost:3000/api';

let cartItems = [];
let isLoading = false;

// 页面加载时初始化
window.addEventListener('DOMContentLoaded', async () => {
    console.log('购物车页面初始化...');
    
    // 检查登录状态
    const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
    
    if (!token) {
        showEmptyCart('请先登录查看购物车', true);
        setTimeout(() => {
            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
        }, 2000);
        return;
    }
    
    // 加载购物车数据
    await loadCart();
});

/**
 * 加载购物车数据
 */
async function loadCart() {
    if (isLoading) return;
    isLoading = true;
    
    try {
        const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
        
        showLoading();
        
        const response = await fetch(`${API_BASE_URL}/cart`, {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            cartItems = result.cart || [];
            console.log('购物车数据:', cartItems);
            renderCart();
        } else {
            console.error('加载购物车失败:', result.message);
            showEmptyCart('加载购物车失败: ' + result.message);
        }
    } catch (error) {
        console.error('加载购物车错误:', error);
        showEmptyCart('加载购物车时发生错误，请刷新页面重试');
    } finally {
        isLoading = false;
    }
}

/**
 * 显示加载状态
 */
function showLoading() {
    const cartContainer = document.getElementById('cartContainer');
    if (!cartContainer) return;
    
    cartContainer.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>加载中...</p>
        </div>
    `;
}

/**
 * 渲染购物车
 */
function renderCart() {
    const cartContainer = document.getElementById('cartContainer');
    const totalItemElement = document.getElementById('totalItem');
    
    if (!cartContainer) return;
    
    // 如果购物车为空
    if (cartItems.length === 0) {
        showEmptyCart('购物车是空的');
        return;
    }
    
    // 更新商品总数
    const totalItems = cartItems.reduce(sum => sum + 1, 0);
    totalItemElement.textContent = `总商品数: ${totalItems}`;
    
    // 清空容器
    cartContainer.innerHTML = '';
    
    // 创建商品列表容器
    const boxContainer = document.createElement('div');
    boxContainer.id = 'boxContainer';
    
    let subtotal = 0;
    
    // 渲染每个购物车项
    cartItems.forEach(item => {
        const itemTotal = parseFloat(item.now_price) * parseInt(item.quantity);
        subtotal += itemTotal;
        
        const boxDiv = createCartItem(item, itemTotal);
        boxContainer.appendChild(boxDiv);
    });
    
    cartContainer.appendChild(boxContainer);
    
    // 创建总计容器
    const totalContainer = createTotalContainer(subtotal);
    cartContainer.appendChild(totalContainer);
}

/**
 * 创建购物车项
 */
function createCartItem(item, itemTotal) {
    const boxDiv = document.createElement('div');
    boxDiv.className = 'cart-item';
    boxDiv.dataset.cartId = item.cart_id;
    
    // 商品图片
    const imgDiv = document.createElement('div');
    imgDiv.className = 'item-image';
    imgDiv.style.cursor = 'pointer'; // 添加鼠标指针样式
    imgDiv.onclick = () => {
        window.location.href = `contentDetails.html?id=${item.spu_id}`;
    };
    
    const img = document.createElement('img');
    img.src = item.image_url || 'img/default-product.jpg';
    img.alt = item.product_name;
    img.onerror = function() {
        this.src = 'img/default-product.png';
    };
    imgDiv.appendChild(img);
    boxDiv.appendChild(imgDiv);
    
    // 商品详情
    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'item-details';
    
    // 商品名称
    const nameH3 = document.createElement('h3');
    nameH3.className = 'item-name';
    nameH3.textContent = item.product_name;
    nameH3.style.cursor = 'pointer';
    nameH3.onclick = () => {
        window.location.href = `contentDetails.html?id=${item.spu_id}`;
    };
    detailsDiv.appendChild(nameH3);
    
    // 商品属性
    if (item.attributes && item.attributes.length > 0) {
        const attributesDiv = document.createElement('div');
        attributesDiv.className = 'item-attributes';
        item.attributes.forEach(attr => {
            const attrSpan = document.createElement('span');
            attrSpan.className = 'attr-tag';
            attrSpan.textContent = `${attr.attr_name}: ${attr.value}`;
            attributesDiv.appendChild(attrSpan);
        });
        detailsDiv.appendChild(attributesDiv);
    }
    
    // 店铺名称
    const shopP = document.createElement('p');
    shopP.className = 'item-shop';
    
    if (item.shop_id) {
        const shopLink = document.createElement('a');
        shopLink.href = `shop.html?id=${item.shop_id}`;
        shopLink.textContent = `店铺: ${item.shop_name || '未知'}`;
        shopLink.style.color = '#666';
        shopLink.style.textDecoration = 'none';
        shopLink.onmouseover = function() {
            this.style.color = 'rgb(3, 122, 122)';
            this.style.textDecoration = 'underline';
        };
        shopLink.onmouseout = function() {
            this.style.color = '#666';
            this.style.textDecoration = 'none';
        };
        shopP.appendChild(shopLink);
    } else {
        shopP.textContent = `店铺: ${item.shop_name || '未知'}`;
    }
    
    detailsDiv.appendChild(shopP);
    
    // 库存信息
    const stockP = document.createElement('p');
    stockP.className = `item-stock ${item.stock === 0 ? 'out-of-stock' : ''}`;
    if(item.stock === 0){
        stockP.textContent = `库存: 已售罄`;
    } else if(item.stock <= 10){
        stockP.textContent = `库存紧张`;
    }
    //否则隐藏库存信息
    else {
        stockP.style.display = 'none';
    }
    detailsDiv.appendChild(stockP);
    
    boxDiv.appendChild(detailsDiv);
    
    // 单价
    const priceDiv = document.createElement('div');
    priceDiv.className = 'item-price';
    const priceLabel = document.createElement('span');
    priceLabel.className = 'price-label';
    priceLabel.textContent = '单价:';
    const priceValue = document.createElement('span');
    priceValue.className = 'price-value';
    priceValue.textContent = `¥${parseFloat(item.now_price).toFixed(2)}`;
    priceDiv.appendChild(priceLabel);
    priceDiv.appendChild(priceValue);
    // 计算降价比例
    const snapshotPrice = parseFloat(item.price_snapshot || item.now_price);
    const currentPrice = parseFloat(item.now_price);
    const discountRate = ((snapshotPrice - currentPrice) / snapshotPrice * 100);
    const hasPriceDropped = discountRate >= 10;
    
    // 如果有价格变化，显示快照价格（加入购物车时的价格）
    if (snapshotPrice !== currentPrice) {
        const snapshotPriceSpan = document.createElement('span');
        snapshotPriceSpan.className = 'snapshot-price';
        snapshotPriceSpan.textContent = `¥${snapshotPrice.toFixed(2)}`;
        priceDiv.appendChild(snapshotPriceSpan);
        
        // 如果降价超过10%，显示降价标签
        if (hasPriceDropped) {
            const discountBadge = document.createElement('span');
            discountBadge.className = 'discount-badge';
            discountBadge.innerHTML = `<i class="fas fa-arrow-down"></i> 降价${Math.floor(discountRate)}%`;
            priceDiv.appendChild(discountBadge);
        }
    }
    boxDiv.appendChild(priceDiv);
    
    // 数量控制
    const quantityDiv = document.createElement('div');
    quantityDiv.className = 'item-quantity';
    
    // 减少按钮
    const minusBtn = document.createElement('button');
    minusBtn.className = 'qty-btn minus';
    minusBtn.innerHTML = '<i class="fas fa-minus"></i>';
    minusBtn.disabled = item.quantity <= 1;
    minusBtn.onclick = () => updateQuantity(item.cart_item_id, item.quantity - 1);
    quantityDiv.appendChild(minusBtn);
    
    // 数量输入框
    const qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.className = 'qty-input';
    qtyInput.value = item.quantity;
    qtyInput.min = 1;
    qtyInput.max = item.stock;
    qtyInput.onchange = function() {
        const newQty = parseInt(this.value);
        if (newQty >= 1 && newQty <= item.stock) {
            updateQuantity(item.cart_item_id, newQty);
        } else {
            this.value = item.quantity;
            alert(`数量必须在 1 到 ${item.stock} 之间`);
        }
    };
    quantityDiv.appendChild(qtyInput);
    
    // 增加按钮
    const plusBtn = document.createElement('button');
    plusBtn.className = 'qty-btn plus';
    plusBtn.innerHTML = '<i class="fas fa-plus"></i>';
    plusBtn.disabled = item.quantity >= item.stock;
    plusBtn.onclick = () => updateQuantity(item.cart_item_id, item.quantity + 1);
    quantityDiv.appendChild(plusBtn);
    
    boxDiv.appendChild(quantityDiv);
    
    // 小计
    const totalDiv = document.createElement('div');
    totalDiv.className = 'item-total';
    const totalLabel = document.createElement('span');
    totalLabel.className = 'total-label';
    totalLabel.textContent = '小计:';
    const totalValue = document.createElement('span');
    totalValue.className = 'total-value';
    totalValue.textContent = `¥${itemTotal.toFixed(2)}`;
    totalDiv.appendChild(totalLabel);
    totalDiv.appendChild(totalValue);
    boxDiv.appendChild(totalDiv);
    
    // 删除按钮
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'item-actions';
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.innerHTML = '<i class="fas fa-trash-alt"></i> 删除';
    removeBtn.onclick = () => removeItem(item.cart_item_id, item.product_name);
    actionsDiv.appendChild(removeBtn);
    boxDiv.appendChild(actionsDiv);
    
    return boxDiv;
}

/**
 * 创建总计容器
 */
function createTotalContainer(subtotal) {
    const totalContainerDiv = document.createElement('div');
    totalContainerDiv.id = 'totalContainer';
    
    const totalDiv = document.createElement('div');
    totalDiv.id = 'total';
    
    // 标题
    const totalH2 = document.createElement('h2');
    totalH2.textContent = '购物车总计';
    totalDiv.appendChild(totalH2);
    
    // 小计
    const subtotalRow = document.createElement('div');
    subtotalRow.className = 'summary-row';
    const subtotalLabel = document.createElement('span');
    subtotalLabel.textContent = '商品总额:';
    const subtotalValue = document.createElement('span');
    subtotalValue.textContent = `¥${subtotal.toFixed(2)}`;
    subtotalRow.appendChild(subtotalLabel);
    subtotalRow.appendChild(subtotalValue);
    totalDiv.appendChild(subtotalRow);
    
    // 总计
    const totalRow = document.createElement('div');
    totalRow.className = 'summary-row total';
    const totalLabel = document.createElement('span');
    totalLabel.textContent = '应付总额:';
    const totalValue = document.createElement('span');
    totalValue.textContent = `¥${subtotal.toFixed(2)}`;
    totalRow.appendChild(totalLabel);
    totalRow.appendChild(totalValue);
    totalDiv.appendChild(totalRow);
    
    // 结算按钮
    const buttonDiv = document.createElement('div');
    buttonDiv.id = 'button';
    const buttonTag = document.createElement('button');
    buttonTag.className = 'checkout-btn';
    buttonTag.textContent = '去结算';
    buttonTag.onclick = function() {
        if (cartItems.length === 0) {
            alert('购物车是空的');
            return;
        }
        // 跳转到结算页面
        window.location.href = 'checkout.html';
    };
    buttonDiv.appendChild(buttonTag);
    totalDiv.appendChild(buttonDiv);
    
    totalContainerDiv.appendChild(totalDiv);
    
    return totalContainerDiv;
}

/**
 * 显示空购物车
 */
function showEmptyCart(message = '购物车是空的', showLoginLink = false) {
    const cartContainer = document.getElementById('cartContainer');
    const totalItemElement = document.getElementById('totalItem');
    
    if (!cartContainer) return;
    
    totalItemElement.textContent = '总商品数: 0';
    
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty-cart';
    
    const icon = document.createElement('i');
    icon.className = 'fas fa-shopping-cart';
    emptyDiv.appendChild(icon);
    
    const h3 = document.createElement('h3');
    h3.textContent = message;
    emptyDiv.appendChild(h3);
    
    if (!showLoginLink) {
        const p = document.createElement('p');
        p.textContent = '去逛逛,挑选喜欢的商品吧~';
        emptyDiv.appendChild(p);
        
        const link = document.createElement('a');
        link.href = 'index.html';
        link.className = 'continue-shopping';
        link.textContent = '继续购物';
        emptyDiv.appendChild(link);
    }
    
    cartContainer.innerHTML = '';
    cartContainer.appendChild(emptyDiv);
}

/**
 * 更新商品数量
 */
async function updateQuantity(cart_item_id, newQuantity) {
    newQuantity = parseInt(newQuantity);
    
    if (newQuantity < 1) {
        alert('数量不能小于 1');
        return;
    }
    
    // 禁用所有按钮
    disableAllButtons(true);
    
    try {
        const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
        
        const response = await fetch(`${API_BASE_URL}/cart/quantity`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                cart_item_id: cart_item_id,
                quantity: newQuantity
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('数量更新成功', newQuantity);
            showNotification('✅ 数量更新成功', 'success');
            
            // 重新加载购物车
            await loadCart();
            
            // 更新 header 徽章
            if (typeof window.updateCartBadge === 'function') {
                await window.updateCartBadge();
            }
        } else {
            alert(result.message || '更新失败');
            await loadCart();
        }
    } catch (error) {
        console.error('更新数量错误:', error);
        alert('更新数量时发生错误');
        await loadCart();
    } finally {
        disableAllButtons(false);
    }
}

/**
 * 删除商品
 */
async function removeItem(cart_item_id, productName) {
    if (!confirm(`确定要删除"${productName}"吗？`)) {
        return;
    }
    
    // 禁用所有按钮
    disableAllButtons(true);
    
    try {
        const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
        
        const response = await fetch(`${API_BASE_URL}/cart/${cart_item_id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('商品删除成功');
            showNotification('✅ 已从购物车删除', 'success');
            
            // 重新加载购物车
            await loadCart();
        } else {
            alert(result.message || '删除失败');
        }
    } catch (error) {
        console.error('删除商品错误:', error);
        alert('删除商品时发生错误');
    } finally {
        disableAllButtons(false);
    }
}

/**
 * 禁用/启用所有按钮
 */
function disableAllButtons(disabled) {
    document.querySelectorAll('button').forEach(btn => {
        btn.disabled = disabled;
    });
    document.querySelectorAll('input').forEach(input => {
        input.disabled = disabled;
    });
}

/**
 * 显示通知
 */
function showNotification(message, type = 'info') {
    // 移除旧通知
    const oldNotification = document.querySelector('.notification');
    if (oldNotification) {
        oldNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}




