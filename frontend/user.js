console.clear();

// API 基础 URL
const API_BASE_URL = "http://localhost:3000/api";

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || sessionStorage.getItem('userInfo'));

    if (!token || !userInfo) {
        alert('请先登录！');
        window.location.href = 'login.html';
        return;
    }

    const userContainer = document.getElementById('userContainer');
    if (!userContainer) return;

    try {
        // 获取用户信息
        const userResponse = await fetch(`${API_BASE_URL}/user/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const userResult = await userResponse.json();
        console.log('用户信息:', userResult);
        const userInfo = userResult.user;

        // 获取店铺信息
        let shopResult = null;
        console.log('用户是否有店铺:', userInfo.have_shop);
        if(userInfo.have_shop) {
            const shopResponse = await fetch(`${API_BASE_URL}/shop/user/${userInfo.account_id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            shopResult = await shopResponse.json();
            console.log('店铺信息:', shopResult);
        }

        // 获取用户收货地址
        const addressResponse = await fetch(`${API_BASE_URL}/user/addresses`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const addressResult = await addressResponse.json();
        console.log('收货地址:', addressResult);

        // 渲染用户信息、店铺信息和收货地址
        // renderUserPage(userResult.user, shopResult.shop, addressResult.addresses || []);
        if(userInfo.have_shop) {
            renderUserPage(userResult.user, shopResult.shop, addressResult.addresses || []);
        } else {
            renderUserPage(userResult.user, null, addressResult.addresses || []);
        }

        await loadFavorites();

    } catch (error) {
        console.error('加载用户信息失败:', error);
        userContainer.innerHTML = `
            <div class="error">
                <h2>加载失败</h2>
                <p>请检查网络连接或稍后重试</p>
                <button onclick="window.location.reload()">重新加载</button>
            </div>
        `;
    }
});

/**
 * 渲染用户页面
 */
function renderUserPage(user, shop, addresses) {
    const userContainer = document.getElementById('userContainer');

    let shopSection = '';

    if(user.have_shop) {
        if (shop) {
            // 用户有店铺：显示店铺信息和管理选项
            shopSection = `
                <div class="shop-section">
                    <h2>我的店铺</h2>
                    <div class="shop-info">
                        <div class="shop-card clickable-card" onclick="viewShop(${shop.shop_id})">
                            <div class="shop-header">
                                <h3>${shop.shop_name}</h3>
                                <span class="shop-status active">营业中</span>
                            </div>
                            <div class="shop-details">
                                <p><strong>店铺ID:</strong> ${shop.shop_id}</p>
                                <p><strong>创建时间:</strong> ${new Date(shop.created_at).toLocaleDateString()}</p>
                                <p><strong>描述:</strong> ${shop.shop_description || '暂无描述'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // 用户没有店铺：显示创建店铺选项
            shopSection = `
                <div class="shop-section">
                    <h2>店铺管理</h2>
                    <div class="no-shop">
                        <div class="no-shop-icon">
                            <i class="fas fa-store"></i>
                        </div>
                        <h3>您还没有店铺</h3>
                        <p>创建自己的店铺，开始销售商品吧！</p>
                        <button class="btn-primary" onclick="createShop()">
                            <i class="fas fa-plus"></i> 创建店铺
                        </button>
                    </div>
                </div>
            `;
        }
    }
    else {
        shopSection = `
            <div class="shop-section">
                <h2>店铺管理</h2>
                <div class="no-shop-permission">
                    <div class="no-shop-icon">
                        <i class="fas fa-store-slash"></i>
                    </div>
                    <h3>您没有创建店铺的权限</h3>
                    <p>请联系管理员以获取更多信息。</p>
                </div>
            </div>
        `;
    }

    // 收货地址部分
    let addressesHtml = '';
    if (addresses && addresses.length > 0) {
        addressesHtml = addresses.map(addr => {
            const addressData = typeof addr.address === 'string' ? JSON.parse(addr.address) : addr.address;
            return `
                <div class="address-card" data-address-id="${addr.address_id}">
                    <div class="address-header">
                        <h4>${addr.recipient_name}</h4>
                        <span class="address-phone">${addr.phone_number}</span>
                    </div>
                    <div class="address-content">
                        <p>
                            ${addressData.province || ''}
                            ${addressData.city || ''}
                            ${addressData.district || ''}
                            ${addressData.detail || ''}
                        </p>
                    </div>
                    <div class="address-actions">
                        <button class="btn-small btn-edit" onclick="editAddress(${addr.address_id})">
                            <i class="fas fa-edit"></i> 编辑
                        </button>
                        <button class="btn-small btn-delete" onclick="deleteAddress(${addr.address_id}, '${addr.recipient_name}')">
                            <i class="fas fa-trash"></i> 删除
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        addressesHtml = `
            <div class="no-address">
                <i class="fas fa-map-marker-alt"></i>
                <p>您还没有添加收货地址</p>
            </div>
        `;
    }

    userContainer.innerHTML = `
        <div class="user-profile">
            <h1>用户中心</h1>

            <div class="user-info-section">
                <h2>基本信息</h2>
                <div class="user-card">
                    <div class="user-avatar">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <div class="user-details">
                        <p><strong>用户名:</strong> ${user.username}</p>
                        <p><strong>邮箱:</strong> ${user.email}</p>
                        <p><strong>注册时间:</strong> ${new Date(user.created_at).toLocaleDateString()}</p>
                    </div>
                    <div class="user-actions">
                        <button class="btn-secondary" onclick="editProfile()">
                            <i class="fas fa-edit"></i> 编辑资料
                        </button>
                    </div>
                </div>
            </div>
            <!-- 我的收藏部分 -->
            <div class="favorites-section">
                <div class="section-header">
                    <h2>我的收藏</h2>
                </div>
                <div id="favoritesContainer">
                    <div class="loading">加载中...</div>
                </div>
            </div>
            <!-- 收货地址部分 -->
            <div class="address-section">
                <div class="section-header">
                    <h2>收货地址</h2>
                    <button class="btn-primary" onclick="showAddAddressModal()">
                        <i class="fas fa-plus"></i> 添加地址
                    </button>
                </div>
                <div class="addresses-list">
                    ${addressesHtml}
                </div>
            </div>

            ${shopSection}
        </div>

        <!-- 添加/编辑地址弹窗 -->
        <div id="addressModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="modalTitle">添加收货地址</h3>
                    <span class="close" onclick="closeAddressModal()">&times;</span>
                </div>
                <form id="addressForm" onsubmit="saveAddress(event)">
                    <input type="hidden" id="editAddressId" value="">

                    <div class="form-group">
                        <label for="recipientName">收货人姓名 <span class="required">*</span></label>
                        <input type="text" id="recipientName" required placeholder="请输入收货人姓名">
                    </div>

                    <div class="form-group">
                        <label for="phoneNumber">联系电话 <span class="required">*</span></label>
                        <input type="tel" id="phoneNumber" required placeholder="请输入11位手机号码" pattern="[0-9]{11}">
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="province">省份 <span class="required">*</span></label>
                            <input type="text" id="province" required placeholder="如：广东省">
                        </div>

                        <div class="form-group">
                            <label for="city">城市 <span class="required">*</span></label>
                            <input type="text" id="city" required placeholder="如：深圳市">
                        </div>

                        <div class="form-group">
                            <label for="district">区/县 <span class="required">*</span></label>
                            <input type="text" id="district" required placeholder="如：南山区">
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="detail">详细地址 <span class="required">*</span></label>
                        <textarea id="detail" required placeholder="请输入详细地址，如街道、门牌号等" rows="3"></textarea>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="closeAddressModal()">取消</button>
                        <button type="submit" class="btn-primary">保存</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

/**
 * 🔥 显示添加地址弹窗
 */
function showAddAddressModal() {
    const modal = document.getElementById('addressModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('addressForm');

    modalTitle.textContent = '添加收货地址';
    form.reset();
    document.getElementById('editAddressId').value = '';

    modal.style.display = 'block';
}

/**
 * 🔥 关闭地址弹窗
 */
function closeAddressModal() {
    const modal = document.getElementById('addressModal');
    modal.style.display = 'none';
}

/**
 * 🔥 保存地址
 */
async function saveAddress(event) {
    event.preventDefault();

    const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
    const editAddressId = document.getElementById('editAddressId').value;

    const addressData = {
        recipient_name: document.getElementById('recipientName').value,
        phone_number: document.getElementById('phoneNumber').value,
        address: {
            province: document.getElementById('province').value,
            city: document.getElementById('city').value,
            district: document.getElementById('district').value,
            detail: document.getElementById('detail').value
        }
    };

    try {
        let response;

        if (editAddressId) {
            // 编辑地址
            response = await fetch(`${API_BASE_URL}/user/addresses/${editAddressId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(addressData)
            });
        } else {
            // 添加新地址
            response = await fetch(`${API_BASE_URL}/user/addresses`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(addressData)
            });
        }

        const result = await response.json();

        if (result.success) {
            alert(result.message || '保存成功');
            closeAddressModal();
            window.location.reload(); // 刷新页面
        } else {
            alert(result.message || '保存失败');
        }
    } catch (error) {
        console.error('保存地址失败:', error);
        alert('网络错误，请重试');
    }
}

/**
 * 🔥 编辑地址
 */
async function editAddress(addressId) {
    const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');

    try {
        const response = await fetch(`${API_BASE_URL}/user/addresses`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (result.success) {
            const address = result.addresses.find(addr => addr.address_id === addressId);

            if (address) {
                const addressData = typeof address.address === 'string' ? JSON.parse(address.address) : address.address;

                document.getElementById('editAddressId').value = address.address_id;
                document.getElementById('recipientName').value = address.recipient_name;
                document.getElementById('phoneNumber').value = address.phone_number;
                document.getElementById('province').value = addressData.province || '';
                document.getElementById('city').value = addressData.city || '';
                document.getElementById('district').value = addressData.district || '';
                document.getElementById('detail').value = addressData.detail || '';

                document.getElementById('modalTitle').textContent = '编辑收货地址';
                document.getElementById('addressModal').style.display = 'block';
            }
        }
    } catch (error) {
        console.error('获取地址详情失败:', error);
        alert('加载地址信息失败');
    }
}

/**
 * 🔥 删除地址
 */
async function deleteAddress(addressId, recipientName) {
    if (!confirm(`确定要删除收货人"${recipientName}"的地址吗？`)) {
        return;
    }

    const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');

    try {
        const response = await fetch(`${API_BASE_URL}/user/addresses/${addressId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (result.success) {
            alert(result.message || '删除成功');
            window.location.reload(); // 刷新页面
        } else {
            alert(result.message || '删除失败');
        }
    } catch (error) {
        console.error('删除地址失败:', error);
        alert('网络错误，请重试');
    }
}

/**
 * 查看店铺
 */
function viewShop(shopId) {
    window.location.href = `shop.html?id=${shopId}`;
}

/**
 * 创建店铺
 */
function createShop() {
    window.location.href = 'createShop.html';
}

/**
 * 编辑用户资料
 */
function editProfile() {
    window.location.href = 'editProfile.html';
}

// 点击弹窗外部关闭弹窗
window.onclick = function(event) {
    const modal = document.getElementById('addressModal');
    if (event.target === modal) {
        closeAddressModal();
    }
};

/**
 * 加载用户收藏
 */
async function loadFavorites() {
    const container = document.getElementById('favoritesContainer');
    if (!container) return;

    const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');

    container.innerHTML = '<div class="loading">加载中...</div>';

    try {
        const res = await fetch(`${API_BASE_URL}/user/favorites`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            }
        });
        const data = await res.json();

        if (!data.success) {
            container.innerHTML = '<p>加载收藏失败：' + (data.message || '') + '</p>';
            return;
        }

        const list = data.favorites;
        if (!list || list.length === 0) {
            container.innerHTML = `
                <div class="fav-empty">
                    <i class="fas fa-heart-broken"></i>
                    <p>暂无收藏商品</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="fav-list">
                ${list.map(item => `
                    <div class="fav-item">
                        <!-- 整个内容区域可点击，跳转到对应商品详情页 -->
                        <a class="fav-link" href="contentDetails.html?id=${item.spu_id}">
                            <div class="fav-thumb">
                                <img src="${item.image_url || 'img/default.png'}" alt="${item.spu_name || ''}">
                            </div>
                            <div class="fav-info">
                                <div class="fav-title" title="${item.spu_name || ''}">
                                    ${item.spu_name || ('SKU ' + item.sku_id)}
                                </div>
                                <div class="fav-price">
                                    <span class="price-now">￥${item.now_price ?? ''}</span>
                                    ${item.origin_price
                                        ? `<span class="price-origin">￥${item.origin_price}</span>`
                                        : ''}
                                </div>
                            </div>
                        </a>
                        <!-- 右侧独立的取消收藏按钮 -->
                        <button class="fav-cancel-btn" data-sku-id="${item.sku_id}">
                            取消收藏
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (e) {
        console.error('加载收藏失败:', e);
        container.innerHTML = '<p>加载收藏失败</p>';
    }
}

// 取消收藏按钮
document.addEventListener('click', async (e) => {
    const t = e.target;
    if (t.classList.contains('fav-cancel-btn')) {
        const skuId = t.getAttribute('data-sku-id');
        const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');

        const card = t.closest('.fav-item');
        const titleEl = card ? card.querySelector('.fav-title') : null;
        const title = titleEl ? titleEl.textContent.trim() : `SKU ${skuId}`;

        const ok = confirm(`确定要取消收藏【${title}】吗？`);
        if (!ok) return;

        try {
            const res = await fetch(`${API_BASE_URL}/user/favorites/${skuId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                }
            });
            const data = await res.json();
            if (!data.success) {
                alert(data.message || '取消收藏失败');
                return;
            }
            // 从页面移除该收藏项
            t.closest('.fav-item').remove();
        } catch (err) {
            console.error(err);
            alert('网络错误');
        }
    }
});
