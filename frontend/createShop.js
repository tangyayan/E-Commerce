/**
 * 创建店铺页面脚本
 */

console.log('createShop.js 已加载');
const API_BASE_URL = 'http://localhost:3000/api';

// ===== 实时字数统计 =====
const shopNameInput = document.getElementById('shop_name');
const descriptionInput = document.getElementById('description');
const nameCounter = document.getElementById('nameCounter');
const descCounter = document.getElementById('descCounter');

shopNameInput.addEventListener('input', function() {
    const length = this.value.length;
    nameCounter.textContent = `${length}/50 字符`;
    
    // 超过限制时变红
    if (length > 50) {
        nameCounter.style.color = '#ff4d4f';
    } else {
        nameCounter.style.color = '#999';
    }
});

descriptionInput.addEventListener('input', function() {
    const length = this.value.length;
    descCounter.textContent = `${length}/500 字符`;
    
    // 超过限制时变红
    if (length > 500) {
        descCounter.style.color = '#ff4d4f';
    } else {
        descCounter.style.color = '#999';
    }
});

// ===== 返回上一页 =====
function goBack() {
    const shopName = shopNameInput.value.trim();
    const description = descriptionInput.value.trim();
    
    // 如果有内容,提示用户
    if (shopName || description) {
        if (confirm('确定要返回吗？当前填写的内容将会丢失。')) {
            window.history.back();
        }
    } else {
        window.history.back();
    }
}

// ===== 表单提交 =====
document.getElementById('createShopForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const shopName = shopNameInput.value.trim();
    const description = descriptionInput.value.trim();
    const submitBtn = document.getElementById('submitBtn');

    console.log('表单提交:', { shopName, description });

    // ===== 验证店铺名称 =====
    if (!shopName) {
        showError('请输入店铺名称！');
        shopNameInput.focus();
        return;
    }

    if (shopName.length < 2) {
        showError('店铺名称至少需要 2 个字符！');
        shopNameInput.focus();
        return;
    }

    if (shopName.length > 50) {
        showError('店铺名称不能超过 50 个字符！');
        shopNameInput.focus();
        return;
    }

    // ===== 验证描述长度 =====
    if (description.length > 500) {
        showError('店铺描述不能超过 500 个字符！');
        descriptionInput.focus();
        return;
    }

    // ===== 获取 token =====
    const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
    
    console.log('Token:', token ? '存在' : '不存在');
    
    if (!token) {
        showError('请先登录！');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return;
    }

    // ===== 显示加载状态 =====
    submitBtn.disabled = true;
    submitBtn.classList.add('is-loading');

    try {
        console.log('发送创建店铺请求...');
        
        const response = await fetch(`${API_BASE_URL}/shop`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                shop_name: shopName,
                description: description || null
            })
        });

        console.log('响应状态:', response.status);
        
        const data = await response.json();
        console.log('响应数据:', data);

        if (response.ok && data.success) {
            // ===== 显示成功消息 =====
            showSuccess('店铺创建成功！正在跳转...');
            
            // ===== 1.5秒后跳转到店铺管理页面 =====
            setTimeout(() => {
                window.location.href = `shop.html?id=${data.shop.shop_id}`;
            }, 1500);
        } else {
            // ===== 显示错误消息 =====
            showError(data.message || '创建失败，请重试');
            submitBtn.disabled = false;
            submitBtn.classList.remove('is-loading');
        }
    } catch (error) {
        console.error('创建店铺失败:', error);
        showError('网络错误，请检查连接后重试');
        submitBtn.disabled = false;
        submitBtn.classList.remove('is-loading');
    }
});

// ===== 显示成功消息 =====
function showSuccess(message) {
    const successBox = document.createElement('div');
    successBox.className = 'success-message';
    successBox.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(successBox);
    
    // 3秒后移除
    setTimeout(() => {
        successBox.style.animation = 'successFadeIn 0.3s ease-out reverse';
        setTimeout(() => successBox.remove(), 300);
    }, 3000);
}

// ===== 显示错误消息 =====
function showError(message) {
    // 移除已存在的错误提示
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    const errorBox = document.createElement('div');
    errorBox.className = 'error-message';
    errorBox.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #ff4d4f 0%, #d9363e 100%);
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(255, 77, 79, 0.3);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideDown 0.3s ease-out;
        font-size: 14px;
        font-weight: 500;
        max-width: 90%;
    `;
    
    errorBox.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    
    // 添加动画
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateX(-50%) translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(errorBox);
    
    // 3秒后移除
    setTimeout(() => {
        errorBox.style.animation = 'slideDown 0.3s ease-out reverse';
        setTimeout(() => errorBox.remove(), 300);
    }, 3000);
}

// ===== 页面加载完成 =====
window.addEventListener('load', function() {
    console.log('页面加载完成');
    
    // 自动聚焦到店铺名称输入框
    shopNameInput.focus();
});

// ===== 防止表单重复提交 =====
let isSubmitting = false;

document.getElementById('createShopForm').addEventListener('submit', function(e) {
    if (isSubmitting) {
        e.preventDefault();
        return false;
    }
    isSubmitting = true;
    
    // 5秒后重置
    setTimeout(() => {
        isSubmitting = false;
    }, 5000);
});