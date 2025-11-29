document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const remember = document.getElementById('remember').checked;
    
    // 这里应该调用后端API进行验证
    // 目前使用模拟登录
    if (username && password) {
        const userToken = 'mock_token_' + Date.now();
        const userInfo = JSON.stringify({
            username: username,
            loginTime: new Date().toISOString()
        });
        
        if (remember) {
            localStorage.setItem('userToken', userToken);
            localStorage.setItem('userInfo', userInfo);
        } else {
            sessionStorage.setItem('userToken', userToken);
            sessionStorage.setItem('userInfo', userInfo);
        }
        
        // 登录成功后跳转到用户页面
        window.location.href = 'user.html';
    }
});