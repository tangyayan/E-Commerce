// 顶部调试，确保 JS 被加载
console.log('createShop.js loaded');

document.getElementById('createShopForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const shop_name = document.getElementById('shop_name').value.trim();
    const description = document.getElementById('description').value.trim();

    if (!shop_name) {
        alert('店铺名称不能为空');
        return;
    }

    // 获取 JWT
    const token =
        localStorage.getItem('userToken') ||
        sessionStorage.getItem('userToken');

    console.log('In createShop.js, token =', token);

    if (!token) {
        alert('请先登录');
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/shop', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ shop_name, description })
        });

        console.log('fetch response status:', response.status);

        const data = await response.json();
        console.log('createShop response data:', data);

        if (data.success) {
            alert('店铺创建成功');
            window.location.href = `shop.html?id=${data.shop.shop_id}`;
        } else {
            alert(data.message || '创建失败');
        }
    } catch (err) {
        console.error('创建店铺错误:', err);
        alert('服务器错误');
    }
});
