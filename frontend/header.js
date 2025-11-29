console.log("header.js 加载成功");

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
            userLink.href = 'user.html';
            if (signOutIcon) {
                signOutIcon.style.display = 'inline-block'; // 显示 Sign Out 图标
                signOutIcon.addEventListener('click', logout);
            }
        } else {
            // 用户未登录
            userLink.href = 'login.html';
            if (signOutIcon) {
                signOutIcon.style.display = 'none'; // 隐藏 Sign Out 图标
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