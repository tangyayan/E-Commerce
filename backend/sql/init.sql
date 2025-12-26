-- 创建用户表
CREATE TABLE IF NOT EXISTS Account (
    account_id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    have_shop BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--商家信息
CREATE TABLE IF NOT EXISTS Shop (
    shop_id SERIAL PRIMARY KEY,
    account_id INT UNIQUE REFERENCES Account(account_id) ON DELETE CASCADE,--一个商家一个店铺
    shop_description TEXT,
    shop_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE OR REPLACE FUNCTION check_shop_constraints()
RETURNS TRIGGER AS $$
DECLARE
    has_shop BOOLEAN;
BEGIN
    -- ① 检查 account 是否存在，且 have_shop = true
    SELECT have_shop INTO has_shop
    FROM Account
    WHERE account_id = NEW.account_id;

    IF has_shop = FALSE THEN
        RAISE EXCEPTION 'Account % is not allowed to create shop (have_shop = FALSE)', NEW.account_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER  trg_check_shop_constraints
BEFORE INSERT ON Shop
FOR EACH ROW
EXECUTE PROCEDURE check_shop_constraints();

--创建商品
CREATE TABLE IF NOT EXISTS SPU(
    spu_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    --category_id INT,
    image_url VARCHAR(255),
    description TEXT,
    shop_id INT not null, --应当去掉
    FOREIGN KEY (shop_id) REFERENCES Shop(shop_id)
);
CREATE TABLE IF NOT EXISTS SKU (
    sku_id SERIAL PRIMARY KEY,
    spu_id INT,--虽然冗余了但是经常要用
    origin_price DECIMAL(10,2),
    now_price DECIMAL(10,2),
    barcode VARCHAR(100),
    FOREIGN KEY (spu_id) REFERENCES SPU(spu_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS AttributeKey (
    attr_id SERIAL PRIMARY KEY,
    attr_name VARCHAR(100),
    spu_id INT,
    FOREIGN KEY (spu_id) REFERENCES SPU(spu_id)
);
CREATE TABLE IF NOT EXISTS AttributeValue (
    value_id SERIAL PRIMARY KEY,
    attr_id INT,
    value VARCHAR(100),
    FOREIGN KEY (attr_id) REFERENCES AttributeKey(attr_id)
);
CREATE TABLE IF NOT EXISTS SKUAttributeValue (
    sku_id INT,
    value_id INT,
    PRIMARY KEY (sku_id, value_id),
    FOREIGN KEY (sku_id) REFERENCES SKU(sku_id) ON DELETE CASCADE,
    FOREIGN KEY (value_id) REFERENCES AttributeValue(value_id) ON DELETE CASCADE
);
-- 确保同一 SKU 不会有重复的属性值，且属性值必须属于该 SKU 所属 SPU 的属性
CREATE OR REPLACE FUNCTION check_sku_attributes_before()
RETURNS TRIGGER AS $$
DECLARE
    new_attr_id INT;
    sku_spu_id INT;
BEGIN
    -- 1. 获取 value_id 对应的 attr_id
    SELECT attr_id INTO new_attr_id
    FROM AttributeValue
    WHERE value_id = NEW.value_id;

    -- 2. 获取 SKU 对应的 SPU ID
    SELECT spu_id INTO sku_spu_id
    FROM SKU
    WHERE sku_id = NEW.sku_id;

    -- 3. 检查当前 SKU 是否已经有同一个 attr_id 的值
    IF EXISTS (
        SELECT 1
        FROM SKUAttributeValue sav
        JOIN AttributeValue av ON sav.value_id = av.value_id
        WHERE sav.sku_id = NEW.sku_id
        AND av.attr_id = new_attr_id
    ) THEN
        RAISE EXCEPTION 'SKU % already has a value for attribute %', NEW.sku_id, new_attr_id;
    END IF;

    -- 4. 检查该 attr_id 是否属于 SKU 的 SPU
    IF NOT EXISTS (
        SELECT 1
        FROM AttributeKey ak
        WHERE ak.attr_id = new_attr_id
        AND ak.spu_id = sku_spu_id
    ) THEN
        RAISE EXCEPTION 'Attribute % does not belong to SPU % of SKU %',
            new_attr_id, sku_spu_id, NEW.sku_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_check_sku_attributes_before
BEFORE INSERT ON SKUAttributeValue
FOR EACH ROW
EXECUTE PROCEDURE check_sku_attributes_before();
-- 删除attributeValue处理，防止删除仍在使用的属性值
CREATE OR REPLACE FUNCTION check_attributevalue_in_use()
RETURNS TRIGGER AS $$
BEGIN
    -- 检查该属性值是否被任何 SKU 使用
    IF EXISTS (
        SELECT 1
        FROM SKUAttributeValue
        WHERE value_id = OLD.value_id
    ) THEN
        RAISE EXCEPTION '无法删除属性值 ID %: 该属性值正在被 SKU 使用', OLD.value_id;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_check_attributevalue_in_use
BEFORE DELETE ON AttributeValue
FOR EACH ROW
EXECUTE PROCEDURE check_attributevalue_in_use();
-- 删除attributeKey处理，防止删除仍在使用的属性键
CREATE OR REPLACE FUNCTION check_attributekey_in_use()
RETURNS TRIGGER AS $$
BEGIN
    -- 检查该属性值是否被任何 SKU 使用
    IF EXISTS (
        select 1
        from skuattributevalue sav
        join attributevalue av on sav.value_id=av.value_id
        where av.attr_id=OLD.attr_id
    ) THEN
        RAISE EXCEPTION '无法删除属性键 ID %: 该属性键正在被 SKU 使用', OLD.attr_id;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_check_attributekey_in_use
BEFORE DELETE ON attributekey
FOR EACH ROW
EXECUTE PROCEDURE check_attributekey_in_use();

--仓库信息
CREATE TABLE IF NOT EXISTS warehouse (--一般先有shop再有warehouse
    code SERIAL PRIMARY KEY,
    shop_id INT REFERENCES Shop(shop_id) ON DELETE CASCADE,
    address json NOT NULL
);

CREATE TABLE IF NOT EXISTS WarehouseStock (
    code INT REFERENCES warehouse(code) ON DELETE CASCADE,
    sku_id INT REFERENCES SKU(sku_id) ON DELETE CASCADE,
    stock INT DEFAULT 0 CHECK (stock >= 0),
    PRIMARY KEY (code, sku_id)
);

-- 库存更新函数：如果存在则更新库存，否则插入新记录
CREATE OR REPLACE FUNCTION upsert_warehouse_stock(
    p_code INT,
    p_sku_id INT,
    p_stock INT
)
RETURNS TABLE(code INT, sku_id INT, stock INT) AS $$
BEGIN
    -- 尝试更新
    UPDATE WarehouseStock 
    SET stock = stock + p_stock
    WHERE WarehouseStock.code = p_code AND WarehouseStock.sku_id = p_sku_id;
    
    -- 如果没有更新到，则插入
    IF NOT FOUND THEN
        INSERT INTO WarehouseStock (code, sku_id, stock)
        VALUES (p_code, p_sku_id, p_stock);
    END IF;
    
    -- 返回结果
    RETURN QUERY
    SELECT ws.code, ws.sku_id, ws.stock
    FROM WarehouseStock ws
    WHERE ws.code = p_code AND ws.sku_id = p_sku_id;
END;
$$ LANGUAGE plpgsql;

--创建购物车
CREATE TABLE IF NOT EXISTS Cart (
    cart_id SERIAL PRIMARY KEY,
    account_id INT UNIQUE NOT NULL REFERENCES Account(account_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS CartItem (
    cart_item_id SERIAL PRIMARY KEY,
    cart_id INT REFERENCES Cart(cart_id) ON DELETE CASCADE,
    sku_id INT REFERENCES SKU(sku_id) ON DELETE SET NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    price_snapshot DECIMAL(10,2) CHECK (price_snapshot >= 0 or price_snapshot IS NULL)
);
CREATE UNIQUE INDEX idx_cart_sku_unique ON CartItem(cart_id, sku_id); --确保同一购物车内同一SKU只能有一条记录

--客户信息
CREATE TABLE IF NOT EXISTS shipping_address(
    address_id SERIAL PRIMARY KEY, --感觉好像不需要？
    account_id INT REFERENCES Account(account_id) ON DELETE CASCADE,
    address json NOT NULL, --格式：{"province": "...", "city": "...", "district": "...", "detail": "..."}
    phone_number VARCHAR(50) NOT NULL,
    recipient_name VARCHAR(100) NOT NULL
);

--订单表
CREATE TABLE IF NOT EXISTS Orders (
    order_id SERIAL PRIMARY KEY,
    account_id INT REFERENCES Account(account_id) ON DELETE CASCADE,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('PENDING','PAID','SHIPPED','FINISHED','CANCELLED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS OrderItem (
    order_item_id SERIAL PRIMARY KEY,
    order_id INT REFERENCES Orders(order_id) ON DELETE CASCADE,
    quantity INT CHECK (quantity > 0),
    sku_id INT REFERENCES SKU(sku_id) ON DELETE SET NULL,

    price_snapshot DECIMAL(10,2) NOT NULL,
    shipping_address_snapshot json NOT NULL,--格式：{"province": "...", "city": "...", "district": "...", "detail": "..."}
    spu_name_snapshot VARCHAR(255) NOT NULL
);

--评价
CREATE TABLE IF NOT EXISTS Review (
    review_id SERIAL PRIMARY KEY,
    sku_id INT REFERENCES SKU(sku_id) ON DELETE CASCADE,
    reviewer_id INT REFERENCES Account(account_id) ON DELETE SET NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);