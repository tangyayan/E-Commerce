// 表单元素
const registerForm = document.getElementById('registerForm');
const usernameInput = document.getElementById('username');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const haveShopCheckbox = document.getElementById('haveShop');
const agreeCheckbox = document.getElementById('agree');

// 实时验证
usernameInput.addEventListener('blur', validateUsername);
emailInput.addEventListener('blur', validateEmail);
passwordInput.addEventListener('blur', validatePassword);
confirmPasswordInput.addEventListener('blur', validateConfirmPassword);

// 表单提交
registerForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // 验证所有字段
    const isUsernameValid = validateUsername();
    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();
    const isConfirmPasswordValid = validateConfirmPassword();
    
    if (!isUsernameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
        showMessage('请检查表单填写是否正确', 'error');
        return;
    }
    
    if (!agreeCheckbox.checked) {
        showMessage('请阅读并同意服务条款和隐私政策', 'error');
        return;
    }
    
    // 获取表单数据
    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const haveShop = haveShopCheckbox.checked;
    
    // 禁用提交按钮
    const submitBtn = registerForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '注册中...';
    
    try {
        // 调用后端注册 API
        const response = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                username, 
                email, 
                password,
                have_shop: haveShop
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 注册成功
            showMessage('注册成功！即将跳转到登录页...', 'success');
            
            // 2 秒后跳转到登录页
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            // 注册失败
            showMessage(data.message || '注册失败，请重试', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = '注册';
        }
    } catch (error) {
        console.error('注册错误:', error);
        showMessage('网络错误，请稍后重试', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = '注册';
    }
});

// 验证用户名
function validateUsername() {
    const username = usernameInput.value.trim();
    const inputGroup = usernameInput.parentElement;
    
    // 移除旧的错误消息
    removeErrorMessage(inputGroup);
    
    if (username.length < 3) {
        showError(inputGroup, '用户名至少需要 3 个字符');
        return false;
    }
    
    if (username.length > 50) {
        showError(inputGroup, '用户名不能超过 50 个字符');
        return false;
    }
    
    if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
        showError(inputGroup, '用户名只能包含字母、数字、下划线和中文');
        return false;
    }
    
    showSuccess(inputGroup);
    return true;
}

// 验证邮箱
function validateEmail() {
    const email = emailInput.value.trim();
    const inputGroup = emailInput.parentElement;
    
    removeErrorMessage(inputGroup);
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
        showError(inputGroup, '请输入有效的邮箱地址');
        return false;
    }
    
    showSuccess(inputGroup);
    return true;
}

// 验证密码
function validatePassword() {
    const password = passwordInput.value;
    const inputGroup = passwordInput.parentElement;
    
    removeErrorMessage(inputGroup);
    
    if (password.length < 6) {
        showError(inputGroup, '密码至少需要 6 个字符');
        return false;
    }
    
    if (password.length > 100) {
        showError(inputGroup, '密码不能超过 100 个字符');
        return false;
    }
    
    showSuccess(inputGroup);
    return true;
}

// 验证确认密码
function validateConfirmPassword() {
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const inputGroup = confirmPasswordInput.parentElement;
    
    removeErrorMessage(inputGroup);
    
    if (confirmPassword !== password) {
        showError(inputGroup, '两次输入的密码不一致');
        return false;
    }
    
    if (confirmPassword.length === 0) {
        showError(inputGroup, '请确认密码');
        return false;
    }
    
    showSuccess(inputGroup);
    return true;
}

// 显示错误
function showError(inputGroup, message) {
    const input = inputGroup.querySelector('input');
    input.classList.add('error');
    input.classList.remove('success');
    
    const errorDiv = document.createElement('small');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    inputGroup.appendChild(errorDiv);
}

// 显示成功
function showSuccess(inputGroup) {
    const input = inputGroup.querySelector('input');
    input.classList.add('success');
    input.classList.remove('error');
}

// 移除错误消息
function removeErrorMessage(inputGroup) {
    const errorMessage = inputGroup.querySelector('.error-message');
    if (errorMessage) {
        errorMessage.remove();
    }
}

// 显示提示消息
function showMessage(text, type) {
    // 移除旧的消息
    const oldMessage = document.querySelector('.message');
    if (oldMessage) {
        oldMessage.remove();
    }
    
    // 创建新消息
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;
    
    // 插入到表单前面
    const registerBox = document.getElementById('registerBox');
    const form = document.getElementById('registerForm');
    registerBox.insertBefore(messageDiv, form);
    
    // 3 秒后自动移除（错误消息）
    if (type === 'error') {
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }
}