console.log("header.js 加载成功");

function checkUserLoginStatus() {
    const userToken = localStorage.getItem('userToken');
    const userInfo = localStorage.getItem('userInfo');
    const userLink = document.getElementById('userLink');
    
    if (userLink) {
        userLink.href = (userToken && userInfo) ? 'user.html' : 'login.html';
    }
}

document.addEventListener('DOMContentLoaded', checkUserLoginStatus);