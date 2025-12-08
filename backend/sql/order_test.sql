-- ============================================================
-- 订单管理的测试，清空后即可执行
-- ============================================================

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
VALUES ('小米13手机', '旗舰款，骁龙8gen2处理器', 1);
-- 假设返回 spu_id = 1

-- 2.2 创建属性键（颜色、容量等）
INSERT INTO AttributeKey (attr_name, spu_id)
VALUES 
  ('颜色', 1),
  ('存储容量', 1);

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
VALUES ('test', '$2a$10$tPdxB2f1PkkNN/FTMTDI4eqDmfuIEkMxvCcL5pWdnZexLmPQ/3PHe', 'li@email.com', FALSE);
-- 假设返回 account_id = 2
-- 密码为123456

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