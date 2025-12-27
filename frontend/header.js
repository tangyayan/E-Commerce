console.log("header.js 加载成功");

// 初始化购物车徽章
async function initCartBadge() {
    const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
    const badge = document.getElementById('badge');
    const session_badge = sessionStorage.getItem('badge');

    if (!badge) return;

    // 如果未登录，隐藏徽章
    if (!token) {
        badge.style.display = 'none';
        return;
    }
    try {
        //这里不能用相对路径，因为header.js可能被不同路径的页面引用
        const response = await fetch('http://localhost:3000/api/cart/count', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();
        console.log("获取购物车数量结果:", result);

        if (result.success) {
            const badge = document.getElementById('badge');
            if (badge) {
                sessionStorage.setItem('badge', result.total);
                badge.textContent = result.total;
                badge.style.display = result.total > 0 ? 'block' : 'none';
            }
        }
    } catch (error) {
        console.error('获取购物车数量失败:', error);
        badge.style.display = 'none';
    }
}

function checkUserLoginStatus() {
    const userToken = localStorage.getItem('userToken');
    const userInfo = localStorage.getItem('userInfo');
    const userTokenSession = sessionStorage.getItem('userToken');
    const userInfoSession = sessionStorage.getItem('userInfo');
    const userLink = document.getElementById('userLink');

    if (userLink) {
        //userLink.href = ((userToken && userInfo) || (userTokenSession && userInfoSession)) ? 'user.html' : 'login.html';
        if ((userToken && userInfo) || (userTokenSession && userInfoSession)) {
            // 用户已登录
            userLink.href = "user.html?id=" + JSON.parse(userInfo || userInfoSession).id;
            if (signOutIcon) {
                signOutIcon.style.display = 'inline-block'; // 显示 Sign Out 图标
                signOutIcon.addEventListener('click', logout);
            }
            initCartBadge();
        } else {
            // 用户未登录
            userLink.href = 'login.html';
            if (signOutIcon) {
                signOutIcon.style.display = 'none'; // 隐藏 Sign Out 图标
            }
            const badge = document.getElementById('badge');//未登录隐藏购物车徽章
            if (badge) {
                badge.style.display = 'none';
            }
        }
    }
}

function logout() {
    // 清除 localStorage 和 sessionStorage 中的用户数据
    localStorage.removeItem('userToken');
    localStorage.removeItem('userInfo');
    sessionStorage.removeItem('userToken');
    sessionStorage.removeItem('userInfo');

    // 跳转到登录页面
    window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', checkUserLoginStatus);