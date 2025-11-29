begin;

-- 假设 Shop 表已经存在并有 ID=1 的店铺
INSERT INTO Shop (account_id, shop_id, shop_name) VALUES (2, 1, 'Store A');

-- 1. 插入 SPU (商品)
INSERT INTO SPU (spu_id, name, image_url, description, shop_id)
VALUES (1,'简约纯棉T恤', 
  'https://assets.myntassets.com/h_1440,q_100,w_1080/v1/assets/images/7579188/2018/11/5/08a7b230-ee8f-46c0-a945-4e835a3c01c01541402833619-United-Colors-of-Benetton-Men-Sweatshirts-1271541402833444-1.jpg', 
  '高品质纯棉材质，经典圆领设计，多色可选。', 1);

-- 2. 插入 AttributeKey (属性键)
INSERT INTO AttributeKey (attr_id, attr_name, spu_id) VALUES (1, '颜色', 1);
INSERT INTO AttributeKey (attr_id, attr_name, spu_id) VALUES (2, '尺码', 1);

-- 3. 插入 AttributeValue (属性值)
INSERT INTO AttributeValue (value_id, attr_id, value) VALUES (1, 1, '白色');
INSERT INTO AttributeValue (value_id, attr_id, value) VALUES (2, 1, '黑色');
INSERT INTO AttributeValue (value_id, attr_id, value) VALUES (3, 2, 'M');
INSERT INTO AttributeValue (value_id, attr_id, value) VALUES (4, 2, 'L');
INSERT INTO AttributeValue (value_id, attr_id, value) VALUES (5, 2, 'XL');

-- 4. 插入 SKU (具体商品/库存)
INSERT INTO SKU (sku_id, spu_id, origin_price, now_price, barcode)
VALUES (1, 1, 89.90, 79.90, 'TS001BM'); -- 黑色 M 码
INSERT INTO SKU (sku_id, spu_id, origin_price, now_price, barcode)
VALUES (2, 1, 89.90, 79.90, 'TS001WL'); -- 白色 L 码

-- 5. 插入 SKUAttributeValue (绑定关系)
-- SKU 10001 (黑色 M 码)
INSERT INTO SKUAttributeValue (sku_id, value_id) VALUES (1, 2); -- 颜色: 黑色
INSERT INTO SKUAttributeValue (sku_id, value_id) VALUES (1, 3); -- 尺码: M

-- SKU 10002 (白色 L 码)
INSERT INTO SKUAttributeValue (sku_id, value_id) VALUES (2, 1); -- 颜色: 白色
INSERT INTO SKUAttributeValue (sku_id, value_id) VALUES (2, 4); -- 尺码: L

-- 插入仓库
insert into warehouse values(1,1,'{"street": "a", "city": "b", "state": "c", "country": "d"}');
insert into warehousestock values(1,1,10);
insert into warehousestock values(1,2,10);

commit;
rollback;