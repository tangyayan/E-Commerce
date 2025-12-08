console.clear();

// API 基础 URL
const API_BASE_URL = 'http://localhost:3000/api';

let ordersList = [];
let isLoading = false;

// 页面加载时初始化
window.addEventListener('DOMContentLoaded', async () => {
    console.log('Orders page initializing...');
    
    // 检查登录状态
    const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
    
    if (!token) {
        showEmptyOrders('Please login to view your orders', true);
        setTimeout(() => {
            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
        }, 2000);
        return;
    }
    
    // 加载订单数据
    await loadOrders(token);
});

/**
 * 加载订单数据
 */
async function loadOrders(token) {
    if (isLoading) return;
    isLoading = true;
    
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            ordersList = result.orders || [];
            console.log('Orders data:', ordersList);
            renderOrders();
        } else {
            console.error('Failed to load orders:', result.message);
            showEmptyOrders(result.message || 'Failed to fetch orders');
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        showEmptyOrders('Error occurred while fetching orders. Please try again.');
    } finally {
        isLoading = false;
    }
}

/**
 * 显示加载状态
 */
function showLoading() {
    const ordersContainer = document.getElementById('ordersContainer');
    if (!ordersContainer) return;
    
    ordersContainer.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading orders...</p>
        </div>
    `;
}

/**
 * 渲染订单列表
 */
function renderOrders() {
    const ordersContainer = document.getElementById('ordersContainer');
    const totalOrdersElement = document.getElementById('totalOrders');
    
    if (!ordersContainer) return;
    
    // 如果订单列表为空
    if (ordersList.length === 0) {
        showEmptyOrders('You have no orders yet');
        return;
    }
    
    // 更新订单总数
    totalOrdersElement.textContent = `Total Orders: ${ordersList.length}`;
    
    // 清空容器
    ordersContainer.innerHTML = '';
    
    // 渲染每个订单
    ordersList.forEach(order => {
        const orderCard = createOrderCard(order);
        ordersContainer.appendChild(orderCard);
    });
}

/**
 * 创建订单卡片元素
 */
function createOrderCard(order) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'order-card';
    
    // 格式化日期
    const date = new Date(order.created_at).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', 
        hour: '2-digit', minute: '2-digit'
    });
    
    // 状态逻辑
    const statusText = translateStatus(order.status);
    const statusClass = `status-${order.status}`;
    
    // 地址逻辑
    let addressStr = '';
    if (order.shipping_address_snapshot) {
        try {
            const addr = JSON.parse(order.shipping_address_snapshot);
            addressStr = `${addr.city || ''} ${addr.address_line || ''}`; 
        } catch (e) {
            addressStr = 'Address info unavailable';
        }
    }

    // --- 生成商品列表 HTML ---
    let itemsHtml = '';
    if (order.items && order.items.length > 0) {
        itemsHtml = order.items.map(item => `
            <div class="order-item-row">
                <div class="item-image">
                    <img src="${item.image_url || 'img/default-product.jpg'}" 
                         alt="${item.spu_name_snapshot}"
                         onerror="this.src='img/default-product.jpg'">
                </div>
                <div class="item-info">
                    <div class="item-name">${item.spu_name_snapshot}</div>
                    <div class="item-meta">Qty: ${item.quantity}</div>
                </div>
                <div class="item-price">
                    ¥${parseFloat(item.price_snapshot).toFixed(2)}
                </div>
            </div>
        `).join('');
    } else {
        itemsHtml = `<div style="color: #999; font-size: 13px; padding: 10px;">No items details available</div>`;
    }

    // 构建卡片 HTML
    cardDiv.innerHTML = `
        <div class="order-header">
            <div>
                <span class="order-id">Order #${order.order_id}</span>
                <span class="order-date">${date}</span>
            </div>
            <div>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
        </div>
        
        <div class="order-body">
            <!-- 左侧: 商品列表与配送信息 -->
            <div class="order-items-list">
                ${itemsHtml}
                
                ${addressStr ? `
                <div class="shipping-info">
                    <i class="fas fa-map-marker-alt"></i> 
                    <span>Delivered to: ${addressStr}</span>
                </div>` : ''}
            </div>

            <!-- 右侧: 总计与操作 -->
            <div class="order-summary-side">
                <span class="amount-label">Total Amount</span>
                <span class="amount-value">¥${parseFloat(order.total_amount).toFixed(2)}</span>
                
                ${order.status === 'PENDING' ? 
                    `<button class="btn-pay" onclick="payOrder(${order.order_id})">Pay Now</button>` : 
                    ''
                }
            </div>
        </div>
    `;
    
    return cardDiv;
}

/**
 * 显示空状态
 */
function showEmptyOrders(message, isError = false) {
    const ordersContainer = document.getElementById('ordersContainer');
    const totalOrdersElement = document.getElementById('totalOrders');
    
    if (!ordersContainer) return;
    
    totalOrdersElement.textContent = 'Total Orders: 0';
    
    const iconClass = isError ? 'fa-exclamation-circle' : 'fa-clipboard-list';
    const linkHtml = isError ? 
        `<a href="login.html" class="btn-shop">Login</a>` : 
        `<a href="index.html" class="btn-shop">Continue Shopping</a>`;

    ordersContainer.innerHTML = `
        <div class="empty-orders">
            <i class="fas ${iconClass}"></i>
            <h3>${message}</h3>
            ${!isError ? '<p>Browse our products and make your first purchase!</p>' : ''}
            ${linkHtml}
        </div>
    `;
}

/**
 * 翻译状态码
 */
function translateStatus(status) {
    const map = {
        'PENDING': 'Pending Payment',
        'PAID': 'Paid',
        'SHIPPED': 'Shipped',
        'FINISHED': 'Completed',
        'CANCELLED': 'Cancelled'
    };
    return map[status] || status;
}

/**
 * 模拟支付功能
 */
function payOrder(orderId) {
    if(confirm(`Proceed to payment for Order #${orderId}?`)) {
        // You would typically redirect to a payment gateway or call a payment API here
        alert('Payment feature coming soon...');
    }
}