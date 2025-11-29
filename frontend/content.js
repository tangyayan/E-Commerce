// API 基础 URL
const API_BASE_URL = 'http://localhost:3000/api';

let contentTitle = [];

console.log('Document Cookie:', document.cookie);

// ==================== 创建商品卡片元素 ====================
function dynamicClothingSection(product) {
    let boxDiv = document.createElement("div");
    boxDiv.id = "box";
    boxDiv.className = "product-box";

    let boxLink = document.createElement("a");
    boxLink.href = "contentDetails.html?id=" + product.spu_id;

    let imgTag = document.createElement("img");
    // 使用默认图片，如果有图片字段则使用真实图片
    imgTag.src = product.image_url || "img/default-product.jpg";
    imgTag.alt = product.name;

    let detailsDiv = document.createElement("div");
    detailsDiv.id = "details";
    detailsDiv.className = "product-details";

    // 商品名称
    let h3 = document.createElement("h3");
    h3.appendChild(document.createTextNode(product.name));

    // 店铺名称
    let h4 = document.createElement("h4");
    h4.appendChild(document.createTextNode(product.shop_name || '未知店铺'));

    // 价格容器
    let priceDiv = document.createElement("div");
    priceDiv.className = "price-info";

    // 原价（如果有折扣）
    if (product.origin_price && product.origin_price > product.now_price) {
        let originalPrice = document.createElement("span");
        originalPrice.className = "original-price";
        originalPrice.appendChild(document.createTextNode("¥" + product.origin_price));
        priceDiv.appendChild(originalPrice);
    }

    // 现价
    let h2 = document.createElement("h2");
    h2.className = "current-price";
    h2.appendChild(document.createTextNode("¥" + product.now_price));
    priceDiv.appendChild(h2);

    // 库存信息
    let stockSpan = document.createElement("span");
    stockSpan.className = "stock-info";
    const stock = product.total_stock || 0;
    stockSpan.appendChild(document.createTextNode(`库存: ${stock}`));
    if (stock === 0) {
        stockSpan.style.color = 'red';
        stockSpan.textContent = '已售罄';
    }

    // 组装 DOM 结构
    boxDiv.appendChild(boxLink);
    boxLink.appendChild(imgTag);
    boxLink.appendChild(detailsDiv);
    detailsDiv.appendChild(h3);
    detailsDiv.appendChild(h4);
    detailsDiv.appendChild(priceDiv);
    detailsDiv.appendChild(stockSpan);

    return boxDiv;
}

// ==================== 使用 Fetch API 获取商品数据 ====================
async function loadProducts() {
    try {
        console.log('开始获取商品数据...');
        
        // 显示加载提示
        const containerClothing = document.getElementById("containerClothing");
        if (containerClothing) {
            containerClothing.innerHTML = '<p class="loading">加载中...</p>';
        }

        // 从后端获取商品数据
        const response = await fetch(`${API_BASE_URL}/products`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('获取到的商品数据:', data);

        if (data.success && data.products) {
            contentTitle = data.products;
            
            // 更新购物车徽章
            updateCartBadge();
            
            // 渲染商品列表
            renderProducts(contentTitle);
        } else {
            console.error('获取商品失败:', data.message);
            showError('获取商品失败: ' + (data.message || '未知错误'));
        }
    } catch (error) {
        console.error('获取商品错误:', error);
        showError('网络错误，请刷新页面重试');
    }
}

// ==================== 渲染商品列表 ====================
function renderProducts(products) {
    const containerClothing = document.getElementById("containerClothing");
    const containerAccessories = document.getElementById("containerAccessories");
    
    // 清空容器
    if (containerClothing) containerClothing.innerHTML = '';
    if (containerAccessories) containerAccessories.innerHTML = '';

    if (!products || products.length === 0) {
        if (containerClothing) {
            containerClothing.innerHTML = '<p class="no-products">暂无商品</p>';
        }
        return;
    }

    // 遍历并渲染商品
    products.forEach(product => {
        const productElement = dynamicClothingSection(product);
        
        // 根据商品类型添加到不同容器
        // 注意：您的数据库可能没有 isAccessory 字段，需要添加或使用其他分类方式
        if (product.isAccessory && containerAccessories) {
            containerAccessories.appendChild(productElement);
        } else if (containerClothing) {
            containerClothing.appendChild(productElement);
        }
    });

    console.log(`已渲染 ${products.length} 个商品`);
}

// ==================== 更新购物车徽章 ====================
function updateCartBadge() {
    const badgeElement = document.getElementById("badge");
    
    if (!badgeElement) return;

    // 从 cookie 读取购物车数量
    if (document.cookie.indexOf(",counter=") >= 0) {
        const counter = document.cookie.split(",")[1].split("=")[1];
        badgeElement.innerHTML = counter;
        return;
    }

    // 或者从后端获取（如果用户已登录）
    const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
    
    if (token) {
        fetch(`${API_BASE_URL}/cart`, {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success && data.items) {
                const totalItems = data.items.reduce((sum, item) => sum + item.quantity, 0);
                badgeElement.innerHTML = totalItems;
            }
        })
        .catch(err => console.error('获取购物车失败:', err));
    } else {
        badgeElement.innerHTML = '0';
    }
}

// ==================== 显示错误信息 ====================
function showError(message) {
    const containerClothing = document.getElementById("containerClothing");
    if (containerClothing) {
        containerClothing.innerHTML = `
            <div class="error-message">
                <p>${message}</p>
                <button onclick="location.reload()">重试</button>
            </div>
        `;
    }
}

// ==================== 搜索功能（可选） ====================
function searchProducts(keyword) {
    if (!keyword) {
        renderProducts(contentTitle);
        return;
    }

    const filtered = contentTitle.filter(product => 
        product.name.toLowerCase().includes(keyword.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(keyword.toLowerCase()))
    );

    renderProducts(filtered);
}

// ==================== 页面加载完成后执行 ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log('页面加载完成，开始获取商品数据');
    loadProducts();

    // 绑定搜索功能（如果有搜索框）
    const searchInput = document.getElementById('input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchProducts(e.target.value);
        });
    }
});

// ==================== 兼容旧代码（XMLHttpRequest 版本，已废弃） ====================
// 保留注释以供参考
/*
let httpRequest = new XMLHttpRequest();

httpRequest.onreadystatechange = function() {
    if (this.readyState === 4) {
        if (this.status == 200) {
            contentTitle = JSON.parse(this.responseText);
            if (document.cookie.indexOf(",counter=") >= 0) {
                var counter = document.cookie.split(",")[1].split("=")[1];
                document.getElementById("badge").innerHTML = counter;
            }
            for (let i = 0; i < contentTitle.length; i++) {
                if (contentTitle[i].isAccessory) {
                    containerAccessories.appendChild(
                        dynamicClothingSection(contentTitle[i])
                    );
                } else {
                    containerClothing.appendChild(
                        dynamicClothingSection(contentTitle[i])
                    );
                }
            }
        } else {
            console.log("call failed!");
        }
    }
};
httpRequest.open("GET", "https://5d76bf96515d1a0014085cf9.mockapi.io/product", true);
httpRequest.send();
*/
