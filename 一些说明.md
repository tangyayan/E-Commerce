[解析SPU与SKU一、SPU与SKU详解 1. 基本定义 SPU（Standard Product Unit - 掘金](https://juejin.cn/post/7523031603133906996)[解析SPU与SKU一、SPU与SKU详解 1. 基本定义 SPU（Standard Product Unit - 掘金](https://juejin.cn/post/7523031603133906996)

```sql
CREATE TABLE items (
    item_id BIGSERIAL PRIMARY KEY,
    seller_id BIGINT,
    title VARCHAR(512),
    description TEXT,
    brand VARCHAR(128),
    primary_category_id BIGINT,
    status VARCHAR(32), -- active/off_shelf
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE item_sku (
    sku_id BIGSERIAL PRIMARY KEY,
    item_id BIGINT REFERENCES items(item_id),
    sku_title VARCHAR(512),
    price DECIMAL(10,2),
    stock INT,
    sku_code VARCHAR(128),     -- SKU 编码
    image_url TEXT,            -- 可选：SKU 图
    weight DECIMAL(10,2),      -- 可选：物流计算
    status VARCHAR(32),
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE item_spec (
    spec_id BIGSERIAL PRIMARY KEY,
    name VARCHAR(128)          -- 例如 “颜色”, “容量”, “套餐”
);

CREATE TABLE item_spec_value (
    value_id BIGSERIAL PRIMARY KEY,
    spec_id BIGINT REFERENCES item_spec(spec_id),
    value VARCHAR(128)
);

CREATE TABLE item_sku_spec (
    sku_id BIGINT REFERENCES item_sku(sku_id),
    value_id BIGINT REFERENCES item_spec_value(value_id),
    PRIMARY KEY (sku_id, value_id)
);

```

![1764317093230](image\1764317093230.png)

```
erDiagram
    SPU {
        int spu_id PK "SPU ID"
        string name "商品名 (如: iPhone 15 Pro)"
        int category_id FK "分类ID"
        string description "描述"
        jpg image "图片描述"
    }

    SKU {
        int sku_id PK "SKU ID"
        int origin_price "原价"
        int now_price "现价"
        string barcode "条形码"
    }

    warehouse{
        int code PK "仓库编号"
        addr address  "地址"
    }

    AttributeKey {
        int attr_id PK "属性键ID"
        string attr_name "属性名称 (如: 颜色)"
    }

    AttributeValue {
        int value_id PK "属性值ID"
        int attr_id FK "所属属性键ID"
        string value_name "属性值 (如: 蓝色、256GB)"
    }

    %% 超类型：Account (账号)
    Account {
        int account_id PK "账号ID"
        string username "用户名"
        string password_hash "密码哈希"
        string email "邮箱"
        datetime created_at "创建时间"
    }

    %% 子类型：Customer (客户)
    Customer {
        int account_id PK, FK "继承自账号ID"
    }

    %% 子类型：Merchant (商家)
    Merchant {
        int account_id PK, FK "继承自账号ID"
    }

    Shop {
        int shop_ID PK "店铺ID"
        string shop_name "店名"
    }

    shipping_address {
        addr address "收货地址"
        string phone_number "联系电话"
        string name "联系人姓名"
    }

    Cart {
        int cart_id PK "购物车编号，加入购物车不影响库存"
    }

    Order {
        int order_id PK "订单编号"
        enum status "订单状态"
    }
    Order_item {
        int order_item_id PK "订单详细列表编号"
        int number "check store_number"
        addr warehouse_addr_snapshot "check warehouse.address"
        addr shipping_address_snapshot "check shipping_address.addr"
    }

    %% 联系定义
  
    %% SPU 和 SKU 之间是 1:N 关系
    SPU ||--o{ AttributeKey : options

    %% AttributeKey 和 AttributeValue 之间是 1:N 关系
    AttributeKey ||--o{ AttributeValue : 属性值

    %% SKU 通过 SKUAttributeValue 关联到具体的属性值 (N:M 关系)
    SKU }|--|{ AttributeValue : 拥有

    warehouse ||--o{ SKU : store_number

    %% 关系：1:1 识别关系 (继承)
    %% 每个 Account 记录要么是 Customer，要么是 Merchant
  
    Account ||--o{ Customer : 关联客户信息
    Account ||--o{ Merchant : 关联商家信息
    Shop ||--o{ warehouse : 店铺信息
    Merchant ||--o{ Shop : 店铺信息
    Customer ||--o{ shipping_address : 收件信息_isdefault
    Cart ||--|| Customer : 购物车
    Cart ||--o{ SKU: 购物车存储_number
    Order ||--o{ Order_item: 订单详细信息
    Customer ||--o{ Order: 用户订单
```

协同过滤推荐（物品-物品的）、基于内容的推荐、基于知识的推荐

```bash
docker run -d --name opengauss-1 --privileged -e "GS_PASSWORD=Aa1@#456&*" -e "GS_USERNAME=aderversa" -p 5432:5432 opengauss:6.0.2
使用openGauss镜像的时候，必须设置该参数。该参数值不能为空或者不定义。该参数设置了openGauss数据库的超级用户omm以及测试用户gaussdb的密码。openGauss安装时默认会创建omm超级用户，该用户名暂时无法修改。测试用户gaussdb是在entrypoint.sh中自定义创建的用户。

docker exec -it opengauss-1 sh
su omm
gsql
\l#查看所有数据库
create database mydb;

```
