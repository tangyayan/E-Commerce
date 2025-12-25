/**
 * 店铺信息模块
 */

const API_BASE_URL = "http://localhost:3000/api";

// 解析 URL 参数
const params = new URLSearchParams(window.location.search);
const shopId = params.get('id');

if (!shopId) {
    alert('缺少店铺ID');
    throw new Error('No shop id');
}

let isOwner = false; // 是否是店主

// 请求店铺详情（公开接口）
function loadShopInfo() {
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

            // 检查是否是店主
            checkOwnership();
        })
        .catch(err => {
            console.error(err);
            alert('服务器错误');
        });
}

// 检查当前用户是否是店主
async function checkOwnership() {
    const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
    if (!token) {
        document.getElementById('edit-shop-btn').style.display = 'none';
        isOwner = false;
        loadProducts();
        return;
    }

    try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || sessionStorage.getItem('userInfo'));
        const response = await fetch(`${API_BASE_URL}/shop/user/${userInfo.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success && data.shop && data.shop.shop_id == shopId) {
            isOwner = true;
        } else {
            document.getElementById('edit-shop-btn').style.display = 'none';
            isOwner = false;
        }
    } catch (error) {
        console.error('检查权限失败:', error);
        document.getElementById('edit-shop-btn').style.display = 'none';
        isOwner = false;
    }

    loadProducts();
}

// 编辑店铺信息事件
function initShopEditEvents() {
    const editBtn = document.getElementById('edit-shop-btn');
    const form = document.getElementById('edit-shop-form');
    const cancelBtn = document.getElementById('cancel-shop-btn');
    const saveBtn = document.getElementById('save-shop-btn');

    if (editBtn && form) {
        editBtn.addEventListener('click', () => {
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
            const payload = {
                shop_name: document.getElementById('edit-shop-name').value.trim(),
                shop_description: document.getElementById('edit-shop-desc').value.trim()
            };
            
            if (!payload.shop_name) {
                alert('店铺名称不能为空');
                return;
            }

            const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
            if (!token) {
                alert('请先登录');
                return;
            }

            try {
                const res = await fetch(`${API_BASE_URL}/shop/${shopId}`, {
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
}

// 初始化
loadShopInfo();