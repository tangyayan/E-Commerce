// API 基础 URL
const API_BASE_URL = 'http://localhost:3000/api';

console.clear();

// 从 URL 获取商品 ID
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

console.log('商品 ID:', productId);

if (!productId) {
    alert('缺少商品 ID');
    window.location.href = 'content.html';
}

// ==================== 创建商品详情 DOM ====================
function dynamicContentDetails(req) {
    const product = req.product;
    const mainContainer = document.getElementById('containerProduct');
    mainContainer.innerHTML = ''; // 清空加载提示

    // 主容器
    const containerD = document.createElement('div');
    containerD.id = 'containerD';

    // ========== 图片区域 ==========
    const imageSectionDiv = document.createElement('div');
    imageSectionDiv.id = 'imageSection';

    const imgTag = document.createElement('img');
    imgTag.id = 'imgDetails';
    imgTag.src = product.image_url || 'img/default-product.jpg';
    imgTag.alt = product.name;

    imageSectionDiv.appendChild(imgTag);

    // ========== 商品详情区域 ==========
    const productDetailsDiv = document.createElement('div');
    productDetailsDiv.id = 'productDetails';

    // 商品名称
    const h1 = document.createElement('h1');
    h1.textContent = product.name;

    // 店铺名称
    const h4 = document.createElement('h4');
    h4.textContent = product.shop_name || '未知店铺';

    // 详情容器
    const detailsDiv = document.createElement('div');
    detailsDiv.id = 'details';

    // 价格信息
    const priceDiv = document.createElement('div');
    priceDiv.className = 'price-section';

    if (product.origin_price && product.origin_price > product.now_price) {
        const originalPrice = document.createElement('span');
        originalPrice.className = 'original-price';
        originalPrice.textContent = `¥${product.origin_price}`;
        priceDiv.appendChild(originalPrice);
    }

    const currentPrice = document.createElement('h3');
    currentPrice.className = 'current-price';
    currentPrice.textContent = `¥${product.now_price}`;
    priceDiv.appendChild(currentPrice);

    // 库存信息
    const stockDiv = document.createElement('div');
    stockDiv.className = 'stock-section';
    const totalStock = product.skus ? 
        product.skus.reduce((sum, sku) => sum + (sku.stock || 0), 0) : 0;
    
    stockDiv.innerHTML = `
        <span class="stock-label">库存:</span>
        <span class="stock-value ${totalStock === 0 ? 'out-of-stock' : ''}">${totalStock}</span>
    `;

    // 描述标题
    const h3Description = document.createElement('h3');
    h3Description.textContent = '商品描述';

    // 描述内容
    const para = document.createElement('p');
    para.textContent = product.description || '暂无描述';

    detailsDiv.appendChild(priceDiv);
    detailsDiv.appendChild(stockDiv);
    detailsDiv.appendChild(h3Description);
    detailsDiv.appendChild(para);

    // ========== SKU 选择区域 ==========
    if (product.skus && product.skus.length > 0) {
        const skuSection = document.createElement('div');
        skuSection.id = 'skuSection';
        skuSection.className = 'sku-section';

        const skuTitle = document.createElement('h3');
        skuTitle.textContent = '选择规格';
        skuSection.appendChild(skuTitle);

        const skuContainer = document.createElement('div');
        skuContainer.className = 'sku-container';

        let selectedSkuId = product.skus[0].sku_id; // 默认选择第一个

        product.skus.forEach((sku, index) => {
            const skuButton = document.createElement('button');
            skuButton.className = 'sku-button' + (index === 0 ? ' active' : '');
            skuButton.textContent = `规格${index + 1} - ¥${sku.now_price}`;
            skuButton.dataset.skuId = sku.sku_id;
            skuButton.dataset.price = sku.now_price;
            
            if (sku.stock === 0) {
                skuButton.disabled = true;
                skuButton.classList.add('disabled');
                skuButton.textContent += ' (售罄)';
            }

            skuButton.onclick = function() {
                // 移除其他按钮的激活状态
                document.querySelectorAll('.sku-button').forEach(btn => {
                    btn.classList.remove('active');
                });
                this.classList.add('active');
                selectedSkuId = this.dataset.skuId;
                
                // 更新显示的价格
                currentPrice.textContent = `¥${this.dataset.price}`;
            };

            skuContainer.appendChild(skuButton);
        });

        skuSection.appendChild(skuContainer);
        productDetailsDiv.appendChild(skuSection);
    }

    // ========== 商品预览图（如果有） ==========
    if (product.photos && product.photos.length > 0) {
        const productPreviewDiv = document.createElement('div');
        productPreviewDiv.id = 'productPreview';

        const h3ProductPreview = document.createElement('h3');
        h3ProductPreview.textContent = '商品预览';
        productPreviewDiv.appendChild(h3ProductPreview);

        const previewContainer = document.createElement('div');
        previewContainer.className = 'preview-container';

        product.photos.forEach((photo, index) => {
            const previewImg = document.createElement('img');
            previewImg.className = 'previewImg';
            previewImg.src = photo;
            previewImg.onclick = function() {
                imgTag.src = this.src;
            };
            previewContainer.appendChild(previewImg);
        });

        productPreviewDiv.appendChild(previewContainer);
        productDetailsDiv.appendChild(productPreviewDiv);
    }

    // ========== 按钮区域 ==========
    const buttonDiv = document.createElement('div');
    buttonDiv.id = 'button';

    const addToCartButton = document.createElement('button');
    addToCartButton.className = 'add-to-cart-btn';
    addToCartButton.textContent = '加入购物车';
    
    if (totalStock === 0) {
        addToCartButton.disabled = true;
        addToCartButton.textContent = '已售罄';
    }

    addToCartButton.onclick = async function() {
        await addToCart(productId, product.name);
    };

    buttonDiv.appendChild(addToCartButton);

    // ========== 组装 DOM ==========
    containerD.appendChild(imageSectionDiv);
    containerD.appendChild(productDetailsDiv);
    productDetailsDiv.appendChild(h1);
    productDetailsDiv.appendChild(h4);
    productDetailsDiv.appendChild(detailsDiv);
    productDetailsDiv.appendChild(buttonDiv);

    mainContainer.appendChild(containerD);
}

// ==================== 加入购物车功能 ====================
async function addToCart(productId, productName) {
    try {
        const response = await fetch(`${API_BASE_URL}/cart`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ productId, productName }),
        });

        if (response.ok) {
            const result = await response.json();
            console.log('加入购物车成功:', result);
            alert('商品已加入购物车');
        } else {
            console.error('加入购物车失败:', response.statusText);
            alert('加入购物车失败');
        }
    } catch (error) {
        console.error('加入购物车时发生错误:', error);
        alert('加入购物车时发生错误');
    }
}

// ==================== 后端调用 ====================
async function fetchProductDetails() {
    try {
        const response = await fetch(`${API_BASE_URL}/products/${productId}`);
        if (response.ok) {
            const product = await response.json();
            console.log('商品详情:', product);
            dynamicContentDetails(product);
        } else {
            console.error('获取商品详情失败:', response.statusText);
            alert('获取商品详情失败');
        }
    } catch (error) {
        console.error('获取商品详情时发生错误:', error);
        alert('获取商品详情时发生错误');
    }
}

fetchProductDetails();
