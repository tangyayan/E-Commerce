console.clear();

const API_BASE_URL = 'http://localhost:3000/api';
let selectedAddressId = null; // 用于存储当前选中的地址ID
let currentTotalAmount = 0;   // 存储订单总额

// 页面加载初始化
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');

    // 1. 检查登录
    if (!token) {
        alert('请先登录');
        window.location.href = 'login.html?redirect=checkout.html';
        return;
    }

    // 2. 加载数据
    loadAddresses(token);
    loadCartSummary(token);

    // 3. 绑定提交按钮事件
    document.getElementById('submitOrderBtn').addEventListener('click', () => {
        submitOrder(token);
    });
});

/**
 * 加载收货地址列表
 */
async function loadAddresses(token) {
    const addressContainer = document.getElementById('addressList');
    
    try {
        const response = await fetch(`${API_BASE_URL}/user/addresses`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();

        addressContainer.innerHTML = ''; // 清空加载提示

        if (result.success && result.addresses && result.addresses.length > 0) {
            result.addresses.forEach((addr, index) => {
                const addrElement = createAddressElement(addr, index === 0); // 默认选中第一个
                addressContainer.appendChild(addrElement);
            });
            
            // 添加"新增地址"按钮
            const addBtn = document.createElement('div');
            addBtn.className = 'add-address-btn';
            addBtn.innerHTML = '<i class="fas fa-plus"></i><span>添加新地址</span>';
            addBtn.onclick = () => alert('添加地址功能开发中...');
            addressContainer.appendChild(addBtn);

        } else {
            addressContainer.innerHTML = `
                <div class="add-address-btn" onclick="alert('添加地址功能开发中...')" style="grid-column: 1 / -1; padding: 40px;">
                    <i class="fas fa-plus-circle" style="font-size: 32px; margin-bottom: 10px;"></i>
                    <span>暂无收货地址，点击添加</span>
                </div>
            `;
        }
    } catch (error) {
        console.error('加载地址失败:', error);
        addressContainer.innerHTML = '<p style="color:red; text-align:center;">加载地址失败，请刷新重试</p>';
    }
}

/**
 * 创建单个地址的 HTML 元素
 */
function createAddressElement(addr, isDefault) {
    const div = document.createElement('div');
    div.className = 'address-item';
    div.dataset.id = addr.address_id;

    // 解析地址 JSON
    let detail = addr.address;
    if (typeof detail === 'string') {
        try { detail = JSON.parse(detail); } catch(e) { detail = {}; }
    }

    // 构建显示内容
    div.innerHTML = `
        <div class="addr-name">
            ${addr.recipient_name} 
            <span class="addr-phone">${addr.phone_number}</span>
        </div>
        <div class="addr-detail">
            ${detail.state || ''} ${detail.city || ''} ${detail.street || ''}
        </div>
    `;

    // 点击选择逻辑
    div.addEventListener('click', () => {
        // 移除其他项的选中样式
        document.querySelectorAll('.address-item').forEach(item => item.classList.remove('selected'));
        // 选中当前项
        div.classList.add('selected');
        selectedAddressId = addr.address_id;
    });

    // 如果是默认第一个，自动触发点击
    if (isDefault) {
        // 使用 setTimeout 确保 DOM 渲染后再点击，避免样式闪烁
        setTimeout(() => div.click(), 0);
    }

    return div;
}

/**
 * 加载购物车总金额
 */
async function loadCartSummary(token) {
    const totalEl = document.getElementById('totalAmount');
    const countEl = document.getElementById('totalCount');
    
    try {
        const response = await fetch(`${API_BASE_URL}/cart`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();

        if (result.success) {
            // 计算总价和总数量
            let total = 0;
            let count = 0;
            
            if (result.cart && result.cart.length > 0) {
                result.cart.forEach(item => {
                    total += Number(item.now_price) * item.quantity;
                    count += 1;
                });
            } else {
                // 如果购物车为空，跳回购物车页面
                alert('购物车为空，无法结算');
                window.location.href = 'cart.html';
                return;
            }
            
            currentTotalAmount = total;
            totalEl.textContent = `¥${total.toFixed(2)}`;
            if(countEl) countEl.textContent = `${count} 件`;
        }
    } catch (error) {
        console.error('计算金额失败:', error);
        totalEl.textContent = '计算失败';
    }
}

/**
 * 提交订单
 */
async function submitOrder(token) {
    if (!selectedAddressId) {
        alert('请先选择一个收货地址！');
        return;
    }

    const btn = document.getElementById('submitOrderBtn');
    const originalText = btn.innerHTML;
    
    // 防止重复点击
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在提交...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                address_id: selectedAddressId // 确保字段名与后端一致
            })
        });

        const result = await response.json();

        if (result.success) {
            // 成功提示
            alert('订单创建成功！即将前往订单页面支付。');
            window.location.href = 'orders.html'; 
        } else {
            alert('订单创建失败: ' + (result.message || '未知错误'));
            resetButton(btn, originalText);
        }
    } catch (error) {
        console.error('提交订单错误:', error);
        alert('网络错误，请稍后重试');
        resetButton(btn, originalText);
    }
}

function resetButton(btn, html) {
    btn.disabled = false;
    btn.innerHTML = html;
}