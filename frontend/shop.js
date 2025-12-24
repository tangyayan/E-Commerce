// 解析 URL 参数 ?id=xxx
const params = new URLSearchParams(window.location.search);
const shopId = params.get('id');
const API_BASE_URL = "http://localhost:3000/api";

if (!shopId) {
    alert('缺少店铺ID');
    throw new Error('No shop id');
}

// 请求店铺详情（公开接口）
fetch(`${API_BASE_URL}/shop/${shopId}`)
    .then(res => res.json())
    .then(data => {
        if (!data.success) {
            alert(data.message || '获取店铺失败');
            return;
        }

        const shop = data.shop;
        console.log('Shop data:', shop);

        document.getElementById('shop-name').innerText = shop.shop_name;
        document.getElementById('shop-desc').innerText = shop.shop_description || '暂无描述';
        document.getElementById('shop-owner').innerText = shop.owner_name;
        document.getElementById('product-count').innerText = shop.product_count;
    })
    .catch(err => {
        console.error(err);
        alert('服务器错误');
    });

document.addEventListener('DOMContentLoaded', () => {
    const editBtn = document.getElementById('edit-shop-btn');
    const form = document.getElementById('edit-shop-form');
    const cancelBtn = document.getElementById('cancel-shop-btn');
    const saveBtn = document.getElementById('save-shop-btn');

    if (editBtn && form) {
        editBtn.addEventListener('click', () => {
            // 填充当前显示的店铺信息到表单
            const curName = document.getElementById('shop-name')?.textContent || '';
            const curDesc = document.getElementById('shop-desc')?.textContent || '';
            document.getElementById('edit-shop-name').value = curName;
            document.getElementById('edit-shop-desc').value = curDesc;
            form.style.display = 'block';
            editBtn.style.display = 'none';
        });
    }

    if (cancelBtn && form && editBtn) {
        cancelBtn.addEventListener('click', () => {
            form.style.display = 'none';
            editBtn.style.display = 'inline-block';
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const id = new URLSearchParams(location.search).get('id') || '';
            const payload = {
                shop_name: document.getElementById('edit-shop-name').value.trim(),
                shop_description: document.getElementById('edit-shop-desc').value.trim()
            };
            if (!payload.shop_name) {
                alert('店铺名称不能为空');
                return;
            }

            // 获取 JWT token
            const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
            if (!token) {
                alert('请先登录');
                return;
            }

            try {
                const res = await fetch(`${API_BASE_URL}/shop/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) throw new Error(await res.text());

                const data = await res.json();
                if (data.success && data.shop) {
                    document.getElementById('shop-name').textContent = data.shop.shop_name || payload.shop_name;
                    document.getElementById('shop-desc').textContent = data.shop.shop_description || payload.shop_description;
                    form.style.display = 'none';
                    editBtn.style.display = 'inline-block';
                    alert('保存成功');
                } else {
                    alert('保存失败: ' + (data.message || '未知错误'));
                }
            } catch (e) {
                alert('保存失败: ' + e.message);
                console.log('保存失败:', e);
            }
        });
    }
});
