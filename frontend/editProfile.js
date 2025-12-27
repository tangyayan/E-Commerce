const API_BASE_URL = "http://localhost:3000/api";

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
    let userInfo = JSON.parse(localStorage.getItem('userInfo') || sessionStorage.getItem('userInfo'));

    if (!token) {
        alert('请先登录！');
        window.location.href = 'login.html';
        return;
    }

    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const form = document.getElementById('editProfileForm');
    const btnCancel = document.getElementById('btnCancel');

    // 如果本地已有 userInfo，先用它预填，避免白屏
    if (userInfo) {
        usernameInput.value = userInfo.username || '';
        emailInput.value = userInfo.email || '';
    }

    // 再从后端拉一次最新资料
    try {
        const res = await fetch(`${API_BASE_URL}/user/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await res.json();
        if (data.success && data.user) {
            userInfo = data.user;
            usernameInput.value = data.user.username || '';
            emailInput.value = data.user.email || '';
        }
    } catch (err) {
        console.error('加载用户资料失败:', err);
        // 不阻塞用户编辑，继续使用本地值
    }

    // 取消 -> 返回用户中心
    btnCancel.addEventListener('click', () => {
        window.location.href = 'user.html';
    });

    // 提交修改
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const newUsername = usernameInput.value.trim();
        const newEmail = emailInput.value.trim();

        if (!newUsername || !newEmail) {
            alert('用户名和邮箱不能为空');
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/user/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    username: newUsername,
                    email: newEmail
                })
            });

            const data = await res.json();
            if (!data.success) {
                alert(data.message || '更新失败');
                return;
            }

            alert(data.message || '更新成功');

            // 更新本地存储的 userInfo，保证用户中心显示最新数据
            const updatedUser = {
                ...(userInfo || {}),
                username: newUsername,
                email: newEmail
            };
            localStorage.setItem('userInfo', JSON.stringify(updatedUser));
            sessionStorage.setItem('userInfo', JSON.stringify(updatedUser));

            // 跳回用户中心
            window.location.href = 'user.html';
        } catch (err) {
            console.error('更新用户资料失败:', err);
            alert('网络错误，请稍后重试');
        }
    });
});