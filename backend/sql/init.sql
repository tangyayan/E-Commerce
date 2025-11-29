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
CREATE TRIGGER trg_check_shop_constraints
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
    shop_id INT not null,
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

--创建购物车
CREATE TABLE IF NOT EXISTS Cart (
    cart_id SERIAL PRIMARY KEY,
    account_id INT UNIQUE NOT NULL REFERENCES Account(account_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS CartItem (
    cart_item_id SERIAL PRIMARY KEY,
    cart_id INT REFERENCES Cart(cart_id) ON DELETE CASCADE,
    sku_id INT REFERENCES SKU(sku_id) ON DELETE CASCADE,
    quantity INT NOT NULL CHECK (quantity > 0)
);

--客户信息
CREATE TABLE IF NOT EXISTS shipping_address(
    address_id SERIAL PRIMARY KEY, --感觉好像不需要？
    account_id INT REFERENCES Account(account_id) ON DELETE CASCADE,
    address json NOT NULL, --格式：{"street": "...", "city": "...", "state": "...", "country": "..."}
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
    shipping_address_snapshot json NOT NULL,--格式：{"street": "...", "city": "...", "state": "...", "country": "..."}
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