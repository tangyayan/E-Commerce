document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const remember = document.getElementById('remember').checked;
    
    try {
        // 调用后端 API
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 存储 token 和用户信息
            const storage = remember ? localStorage : sessionStorage;//session临时会话
            storage.setItem('userToken', data.token);//保存jwt
            storage.setItem('userInfo', JSON.stringify(data.userInfo));
            
            // 登录成功后跳转
            window.location.href = 'index.html';
        } else {
            alert(data.message || '登录失败');
        }
    } catch (error) {
        console.error('登录错误:', error);
        alert('登录失败,请稍后重试');
    }
});