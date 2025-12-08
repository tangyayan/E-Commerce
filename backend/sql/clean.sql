--- 清理数据库脚本：clean.sql
-- 目的：清空所有表数据并重置自增序列，确保测试

-- 1. 清空所有表数据
TRUNCATE TABLE 
    Account, 
    Shop, 
    SPU, 
    SKU, 
    AttributeKey, 
    AttributeValue, 
    SKUAttributeValue, 
    warehouse, 
    WarehouseStock, 
    Cart, 
    CartItem, 
    shipping_address, 
    Orders, 
    OrderItem, 
    Review
CASCADE;

-- 2. 重置所有 SERIAL 自增序列 (Sequence)

-- 用户与店铺
ALTER SEQUENCE account_account_id_seq RESTART WITH 1;
ALTER SEQUENCE shop_shop_id_seq RESTART WITH 1;

-- 商品相关 (SPU/SKU)
ALTER SEQUENCE spu_spu_id_seq RESTART WITH 1;
ALTER SEQUENCE sku_sku_id_seq RESTART WITH 1;

-- 【新增】商品属性相关 (之前漏掉的)
ALTER SEQUENCE attributekey_attr_id_seq RESTART WITH 1;
ALTER SEQUENCE attributevalue_value_id_seq RESTART WITH 1;

-- 【新增】仓库相关 (之前漏掉的)
ALTER SEQUENCE warehouse_code_seq RESTART WITH 1;

-- 购物车
ALTER SEQUENCE cart_cart_id_seq RESTART WITH 1;
ALTER SEQUENCE cartitem_cart_item_id_seq RESTART WITH 1;

-- 订单与地址
ALTER SEQUENCE orders_order_id_seq RESTART WITH 1;
ALTER SEQUENCE orderitem_order_item_id_seq RESTART WITH 1;
ALTER SEQUENCE shipping_address_address_id_seq RESTART WITH 1;

-- 评价
ALTER SEQUENCE review_review_id_seq RESTART WITH 1;