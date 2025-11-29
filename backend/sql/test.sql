-- ============================================================
-- 电商平台数据库测试样例
-- ============================================================

-- 【修复项】首先修复原SQL中的问题
-- 1. Orders表缺少逗号
-- 2. CartItem表拼写错误 CREEAT -> CREATE
-- 3. 添加account_id关联到OrderItem，便于查询

-- ============================================================
-- 测试场景1: 商家注册、创建店铺、定义仓库
-- ============================================================

-- 1.1 注册商家账户
INSERT INTO Account (username, password, email, have_shop) 
VALUES ('merchant_zhang', 'hashed_password_123', 'zhang@shop.com', TRUE);
-- 假设返回 account_id = 1

-- 1.2 创建店铺
INSERT INTO Shop (account_id, shop_name)
VALUES (1, '张三电子产品旗舰店');
-- 假设返回 shop_id = 1

-- 1.3 定义仓库
INSERT INTO warehouse (shop_id, address)
VALUES (1, '{"street": "中关村大街1号", "city": "北京", "state": "北京市", "country": "中国"}');

-- 验证：查看商家信息
SELECT a.account_id, a.username, s.shop_name, w.address
FROM Account a
LEFT JOIN Shop s ON a.account_id = s.account_id
LEFT JOIN warehouse w ON s.shop_id = w.shop_id
WHERE a.account_id = 1;


-- ============================================================
-- 测试场景2: 商家添加商品
-- ============================================================

-- 2.1 创建SPU（商品通用属性）
INSERT INTO SPU (name, description, shop_id)
VALUES (1, '小米13手机', '旗舰款，骁龙8gen2处理器', 1);
-- 假设返回 spu_id = 1

-- 2.2 创建属性键（颜色、容量等）
INSERT INTO AttributeKey (attr_name, spu_id)
VALUES 
  (1, '颜色', 1),
  (2, '存储容量', 1);

-- 2.3 创建属性值
INSERT INTO AttributeValue (attr_id, value)
VALUES 
  (1, '黑色'),
  (1, '白色'),
  (2, '256GB'),
  (2, '512GB');

-- 2.4 创建SKU（库存单位）
INSERT INTO SKU (spu_id, origin_price, now_price, barcode)
VALUES 
  (1, 3999.00, 3299.00, 'SKU001-BK-256'),  -- 黑色256GB
  (1, 3999.00, 3299.00, 'SKU001-BK-512'),  -- 黑色512GB
  (1, 3999.00, 3499.00, 'SKU001-WH-256');  -- 白色256GB
-- 假设返回 sku_id = 1, 2, 3

-- 2.5 关联SKU和属性值
INSERT INTO SKUAttributeValue (sku_id, value_id)
VALUES 
  (1, 1), (1, 3),  -- SKU1: 黑色+256GB
  (2, 1), (2, 4),  -- SKU2: 黑色+512GB
  (3, 2), (3, 3);  -- SKU3: 白色+256GB


-- ============================================================
-- 测试场景3: 查看店铺销量
-- ============================================================

-- 客户购买流程（用于生成销量数据）

-- 3.1 注册客户账户
INSERT INTO Account (username, password, email, have_shop)
VALUES ('customer_li', 'hashed_pwd_456', 'li@email.com', FALSE);
-- 假设返回 account_id = 2

-- 3.2 添加收货地址
INSERT INTO shipping_address (account_id, address, phone_number, recipient_name)
VALUES (2, '{"street": "南京路100号", "city": "上海", "state": "上海市", "country": "中国"}', '13800138000', '李四');
-- 假设返回 address_id = 1

-- 3.3 创建订单
INSERT INTO Orders (account_id, total_amount, status)
VALUES (2, 3299.00, 'PAID');
-- 假设返回 order_id = 1

-- 3.4 添加订单项
INSERT INTO OrderItem (order_id, quantity, sku_id, price_snapshot, shipping_address_snapshot, spu_name_snapshot)
VALUES 
  (1, 1, 1, 3299.00, '{"street": "南京路100号", "city": "上海", "state": "上海市", "country": "中国"}', '小米13手机');

-- 查询店铺销量（⚠️ 发现问题：缺少数量统计）
-- ❌ 当前无法直接查询店铺销量，因为OrderItem没有关联shop_id
-- ✅ 解决方案：通过SPU -> SKU -> OrderItem的关联查询
SELECT 
    s.shop_id,
    s.shop_name,
    SUM(oi.quantity) AS total_sales_quantity,
    SUM(oi.price_snapshot * oi.quantity) AS total_sales_amount,
    COUNT(DISTINCT oi.order_id) AS total_orders
FROM Shop s
JOIN SPU spu ON s.shop_id = spu.shop_id
JOIN SKU sku ON spu.spu_id = sku.spu_id
JOIN OrderItem oi ON sku.sku_id = oi.sku_id
WHERE s.shop_id = 1 AND oi.order_id IN (
    SELECT order_id FROM Orders WHERE status IN ('PAID', 'SHIPPED', 'FINISHED')
)
GROUP BY s.shop_id, s.shop_name;


-- ============================================================
-- 测试场景4: 查看商品好评率
-- ============================================================

-- 4.1 添加评价数据
INSERT INTO Review (sku_id, rating, comment)
VALUES 
  (1, 5, '很好用，推荐购买'),
  (1, 4, '性能不错，但稍贵'),
  (1, 3, '一般般'),
  (2, 5, '性能强劲，值得购买'),
  (2, 5, '完全满意'),
  (3, 2, '有点卡顿');

-- 4.2 查询商品好评率
SELECT 
    sku.sku_id,
    spu.name,
    COUNT(r.review_id) AS total_reviews,
    ROUND(AVG(r.rating), 2) AS avg_rating,
    SUM(CASE WHEN r.rating >= 4 THEN 1 ELSE 0 END) AS positive_reviews,
    ROUND(SUM(CASE WHEN r.rating >= 4 THEN 1 ELSE 0 END)::numeric / COUNT(r.review_id) * 100, 2) AS positive_rate
FROM SKU sku
LEFT JOIN SPU spu ON sku.spu_id = spu.spu_id
LEFT JOIN Review r ON sku.sku_id = r.sku_id
WHERE sku.sku_id = 1
GROUP BY sku.sku_id, spu.name;


-- ============================================================
-- 测试场景5: 客户购物车管理
-- ============================================================

-- 5.1 创建购物车（如果不存在则创建）
INSERT INTO Cart (account_id)
VALUES (2)
ON CONFLICT DO NOTHING;
-- 假设返回 cart_id = 1

-- 5.2 添加商品到购物车
INSERT INTO CartItem (cart_id, sku_id, quantity)
VALUES (1, 1, 2);  -- 添加2个黑色256GB的手机

-- 5.3 查询购物车内容
SELECT 
    c.cart_id,
    a.username,
    ci.cart_item_id,
    spu.name,
    sku.sku_id,
    sku.now_price,
    ci.quantity,
    (sku.now_price * ci.quantity) AS subtotal
FROM Cart c
JOIN Account a ON c.account_id = a.account_id
JOIN CartItem ci ON c.cart_id = ci.cart_id
JOIN SKU sku ON ci.sku_id = sku.sku_id
JOIN SPU spu ON sku.spu_id = spu.spu_id
WHERE c.cart_id = 1;

-- 5.4 计算购物车总额
SELECT 
    c.cart_id,
    SUM(sku.now_price * ci.quantity) AS cart_total
FROM Cart c
JOIN CartItem ci ON c.cart_id = ci.cart_id
JOIN SKU sku ON ci.sku_id = sku.sku_id
WHERE c.cart_id = 1
GROUP BY c.cart_id;


-- ============================================================
-- 测试场景6: 其他常见业务场景
-- ============================================================

-- 6.1 查询用户订单历史
SELECT 
    o.order_id,
    o.created_at,
    o.status,
    o.total_amount,
    COUNT(oi.order_item_id) AS items_count
FROM Orders o
LEFT JOIN OrderItem oi ON o.order_id = oi.order_id
WHERE o.account_id = 2
GROUP BY o.order_id
ORDER BY o.created_at DESC;

-- 6.2 查询订单详情
SELECT 
    o.order_id,
    spu.name,
    oi.quantity,
    oi.price_snapshot,
    (oi.quantity * oi.price_snapshot) AS item_total,
    oi.spu_name_snapshot,
    oi.shipping_address_snapshot
FROM Orders o
JOIN OrderItem oi ON o.order_id = oi.order_id
JOIN SKU sku ON oi.sku_id = sku.sku_id
JOIN SPU spu ON sku.spu_id = spu.spu_id
WHERE o.order_id = 1;

-- 6.3 删除购物车中的商品
DELETE FROM CartItem
WHERE cart_item_id = 1;

-- 6.4 更新购物车中的商品数量
UPDATE CartItem
SET quantity = 3
WHERE cart_id = 1 AND sku_id = 1;

-- 6.5 查询商家所有商品
SELECT 
    spu.spu_id,
    spu.name,
    COUNT(sku.sku_id) AS sku_count,
    MIN(sku.now_price) AS min_price,
    MAX(sku.now_price) AS max_price
FROM Shop s
JOIN SPU spu ON s.shop_id = spu.shop_id
LEFT JOIN SKU sku ON spu.spu_id = sku.spu_id
WHERE s.shop_id = 1
GROUP BY spu.spu_id, spu.name;


-- ============================================================
-- 问题总结与建议
-- ============================================================

/* 
【原SQL中的问题】
1. ❌ Orders 表缺少逗号（status 和 created_at 之间）
2. ❌ CartItem 表拼写错误（CREEAT 应为 CREATE）
3. ⚠️ OrderItem 没有关联 account_id，不便于查询用户订单
4. ⚠️ 购物车设计：未考虑"同一商品不同规格"的情况

【建议改进】
1. ✅ OrderItem 添加 account_id 冗余字段用于快速查询
2. ✅ 添加订单状态变更历史表（order_status_history）用于追踪
3. ✅ SKU 添加库存字段（stock）
4. ✅ 考虑添加优惠券、活动等营销功能表
5. ✅ 添加支付记录表（payment_record）
6. ✅ Review 表缺少 account_id（无法知道谁评价的）
*/