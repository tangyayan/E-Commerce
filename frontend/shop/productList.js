/**
 * 商品列表模块
 */

// 缓存原始商品数据，用于搜索过滤
let allProducts = [];

// 初始化搜索框事件
function initProductSearch() {
    const searchInput = document.getElementById('product-search');
    if (!searchInput) return;

    searchInput.addEventListener('input', () => {
        const keyword = searchInput.value.trim().toLowerCase();

        if (!keyword) {
            // 无关键字：显示全部
            renderProducts(allProducts);
            return;
        }

        const filtered = allProducts.filter(p => {
            const name = (p.name || '').toLowerCase();
            const desc = (p.description || '').toLowerCase();
            return name.includes(keyword) || desc.includes(keyword);
        });

        renderProducts(filtered);
    });
}

// 加载店铺商品
async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/products/shop/${shopId}`);
        const data = await response.json();

        if (data.success && data.products) {
            // 缓存原始数据
            allProducts = data.products || [];
            // 先渲染全部
            renderProducts(allProducts);
            // 初始化搜索事件（只需初始化一次，这里多次调用也无害）
            initProductSearch();
        } else {
            document.getElementById('products').innerHTML = '<p class="no-products">暂无商品</p>';
        }
    } catch (error) {
        console.error('加载商品失败:', error);
        document.getElementById('products').innerHTML = '<p class="error">加载商品失败</p>';
    }
}

// 渲染商品列表为表格
function renderProducts(products) {
    const tbody = document.getElementById('products-tbody');
    const addBtn = document.getElementById('add-product-btn');
    const actionsColumn = document.querySelector('.actions-column');

    tbody.innerHTML = '';

    // 根据是否是店主显示操作列和添加按钮
    if (isOwner) {
        addBtn.style.display = 'inline-flex';
        actionsColumn.style.display = 'table-cell';
    } else {
        addBtn.style.display = 'none';
        actionsColumn.style.display = 'none';
    }

    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-products">暂无商品</td></tr>';
        return;
    }

    products.forEach(product => {
        const tr = document.createElement('tr');
        tr.className = isOwner ? '' : 'clickable-row';

        tr.innerHTML = `
            <td class="img-cell">
                <img src="${product.image_url || 'img/default-product.jpg'}" alt="${product.name}">
            </td>
            <td class="name-cell">${product.name}</td>
            <td class="desc-cell">${product.description || '暂无描述'}</td>
            <td class="actions-cell">
                ${isOwner ? `
                    <button class="btn-edit-small" onclick="event.stopPropagation(); editProduct(${product.spu_id}, '${escapeHtml(product.name)}', '${escapeHtml(product.description || '')}', '${product.image_url || ''}')">
                        <i class="fas fa-edit"></i> 编辑
                    </button>
                    <button class="btn-delete-small" onclick="event.stopPropagation(); deleteProduct(${product.spu_id})">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                ` : ''}
            </td>
        `;

        // 非店主点击整行跳转
        if (!isOwner) {
            tr.onclick = () => {
                window.location.href = `contentDetails.html?id=${product.spu_id}`;
            };
        }

        tbody.appendChild(tr);
    });
}

// 删除商品
async function deleteProduct(spuId) {
    if (!confirm('确定要删除这个商品吗？')) return;

    const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
    try {
        const response = await fetch(`${API_BASE_URL}/products/${spuId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        if (data.success) {
            alert('删除成功');
            loadProducts();
        } else {
            alert('删除失败: ' + (data.message || '未知错误'));
        }
    } catch (error) {
        console.error('删除商品失败:', error);
        alert('删除失败');
    }
}

// HTML转义函数
function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}