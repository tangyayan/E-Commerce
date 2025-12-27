// 使用方法：node backend/scripts/importProductsFromCsv.js test/testdata.csv

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const pool = require('../config/database'); // 复用你已有的数据库连接

// 固定使用的属性键名
const ATTR_KEYS = ['color', 'size', 'material'];

// 如果 “雨禾服饰” 对应的 Account 不好确定，这里可以先写死一个已有的 account_id
// TODO: 按实际情况修改为你的商家账号 ID
const DEFAULT_ACCOUNT_ID = 1;

async function main() {
    const csvPath = process.argv[2] || path.join(__dirname, '../../test/testdata.csv');

    if (!fs.existsSync(csvPath)) {
        console.error('找不到 CSV 文件：', csvPath);
        process.exit(1);
    }

    console.log('开始导入 CSV：', csvPath);

    // 读取 CSV
    const records = await readCsv(csvPath);
    console.log(`读取到 ${records.length} 条记录`);

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. 确保店铺存在（这里所有行 shop_name 都是 “雨禾服饰”）
        //    从第一行拿 shop_name
        const shopName = records[0].shop_name.trim();
        const shopId = await getOrCreateShop(client, shopName);

        // 2. 缓存：SPU / 属性键 / 属性值，避免重复查库
        const spuCache = new Map();                    // key: spu_name -> spu_id
        const attrKeyCache = new Map();                // key: spu_id + '|' + attr_name -> attr_id
        const attrValueCache = new Map();              // key: attr_id + '|' + value -> value_id

        // 3. 仓库：本次统一使用 code=1（你已保证 testdata.csv 的 code 都是 1）
        const warehouseCode = 1;

        let insertedSpuCount = 0;
        let insertedSkuCount = 0;

        for (const row of records) {
            const {
                spu_name,
                spu_description,
                image_url,
                origin_price,
                now_price,
                barcode,
                color,
                size,
                material,
                code,
                stock,
            } = row;

            // --- 2.1 处理 SPU ---
            const spuName = (spu_name || '').trim();
            if (!spuName) {
                console.warn('跳过一行：spu_name 为空', row);
                continue;
            }

            let spuId = spuCache.get(spuName);
            if (!spuId) {
                // 查是否已存在相同 shop + spu_name 的 SPU
                const spuRes = await client.query(
                    `
                    SELECT spu_id
                    FROM SPU
                    WHERE shop_id = $1 AND name = $2
                    LIMIT 1
                    `,
                    [shopId, spuName]
                );

                if (spuRes.rows.length > 0) {
                    spuId = spuRes.rows[0].spu_id;
                } else {
                    const insertSpuRes = await client.query(
                        `
                        INSERT INTO SPU (name, image_url, description, shop_id)
                        VALUES ($1, $2, $3, $4)
                        RETURNING spu_id
                        `,
                        [spuName, image_url || null, spu_description || null, shopId]
                    );
                    spuId = insertSpuRes.rows[0].spu_id;
                    insertedSpuCount++;
                }

                spuCache.set(spuName, spuId);
            }

            // --- 2.2 插入 SKU ---
            const insertSkuRes = await client.query(
                `
                INSERT INTO SKU (spu_id, origin_price, now_price, barcode)
                VALUES ($1, $2, $3, $4)
                RETURNING sku_id
                `,
                [
                    spuId,
                    origin_price ? Number(origin_price) : null,
                    now_price ? Number(now_price) : null,
                    barcode || null,
                ]
            );
            const skuId = insertSkuRes.rows[0].sku_id;
            insertedSkuCount++;

            // --- 2.3 处理属性（color / size / material） ---
            const attrEntries = [
                ['color', color],
                ['size', size],
                ['material', material],
            ];

            for (const [attrName, attrValue] of attrEntries) {
                if (!attrValue) continue; // 该属性没填就跳过

                // 2.3.1 获取 / 创建 AttributeKey
                const keyCacheKey = `${spuId}|${attrName}`;
                let attrId = attrKeyCache.get(keyCacheKey);
                if (!attrId) {
                    const keyRes = await client.query(
                        `
                        SELECT attr_id
                        FROM AttributeKey
                        WHERE spu_id = $1 AND attr_name = $2
                        LIMIT 1
                        `,
                        [spuId, attrName]
                    );

                    if (keyRes.rows.length > 0) {
                        attrId = keyRes.rows[0].attr_id;
                    } else {
                        const insertKeyRes = await client.query(
                            `
                            INSERT INTO AttributeKey (attr_name, spu_id)
                            VALUES ($1, $2)
                            RETURNING attr_id
                            `,
                            [attrName, spuId]
                        );
                        attrId = insertKeyRes.rows[0].attr_id;
                    }

                    attrKeyCache.set(keyCacheKey, attrId);
                }

                // 2.3.2 获取 / 创建 AttributeValue
                const valueStr = String(attrValue).trim();
                const valueCacheKey = `${attrId}|${valueStr}`;
                let valueId = attrValueCache.get(valueCacheKey);
                if (!valueId) {
                    const valueRes = await client.query(
                        `
                        SELECT value_id
                        FROM AttributeValue
                        WHERE attr_id = $1 AND value = $2
                        LIMIT 1
                        `,
                        [attrId, valueStr]
                    );

                    if (valueRes.rows.length > 0) {
                        valueId = valueRes.rows[0].value_id;
                    } else {
                        const insertValueRes = await client.query(
                            `
                            INSERT INTO AttributeValue (attr_id, value)
                            VALUES ($1, $2)
                            RETURNING value_id
                            `,
                            [attrId, valueStr]
                        );
                        valueId = insertValueRes.rows[0].value_id;
                    }

                    attrValueCache.set(valueCacheKey, valueId);
                }

                // 2.3.3 建立 SKUAttributeValue 关系（openGauss 不支持 ON CONFLICT，这里手动避免重复）
                const existsRes = await client.query(
                    `
                    SELECT 1
                    FROM SKUAttributeValue
                    WHERE sku_id = $1 AND value_id = $2
                    LIMIT 1
                    `,
                    [skuId, valueId]
                );

                if (existsRes.rows.length === 0) {
                    await client.query(
                        `
                        INSERT INTO SKUAttributeValue (sku_id, value_id)
                        VALUES ($1, $2)
                        `,
                        [skuId, valueId]
                    );
                }
            }

            // --- 2.4 仓库和库存 ---
            const stockNum = stock ? Number(stock) : 0;
            if (!Number.isNaN(stockNum) && stockNum > 0) {
                // 先查是否已有该 (code, sku_id) 记录
                const wsRes = await client.query(
                    `
                    SELECT stock
                    FROM WarehouseStock
                    WHERE code = $1 AND sku_id = $2
                    LIMIT 1
                    `,
                    [warehouseCode, skuId]
                );

                if (wsRes.rows.length > 0) {
                    // 已存在：在当前库存基础上累加
                    await client.query(
                        `
                        UPDATE WarehouseStock
                        SET stock = stock + $3
                        WHERE code = $1 AND sku_id = $2
                        `,
                        [warehouseCode, skuId, stockNum]
                    );
                } else {
                    // 不存在：插入新记录
                    await client.query(
                        `
                        INSERT INTO WarehouseStock (code, sku_id, stock)
                        VALUES ($1, $2, $3)
                        `,
                        [warehouseCode, skuId, stockNum]
                    );
                }
            }
        }

        await client.query('COMMIT');
        console.log(`导入完成：新建 SPU ${insertedSpuCount} 个，SKU ${insertedSkuCount} 个`);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('导入失败，已回滚：', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

/**
 * 读取 CSV 文件，返回 records 数组
 */
function readCsv(csvPath) {
    return new Promise((resolve, reject) => {
        const records = [];
        fs.createReadStream(csvPath)
            .pipe(parse({
                columns: true,      // 第一行作为表头
                skip_empty_lines: true,
                trim: true,
            }))
            .on('data', (row) => records.push(row))
            .on('end', () => resolve(records))
            .on('error', (err) => reject(err));
    });
}

/**
 * 根据 shop_name 获取或创建 Shop，返回 shop_id
 */
async function getOrCreateShop(client, shopName) {
    // 1. 先查是否存在
    const res = await client.query(
        `
        SELECT shop_id
        FROM Shop
        WHERE shop_name = $1
        LIMIT 1
        `,
        [shopName]
    );

    if (res.rows.length > 0) {
        return res.rows[0].shop_id;
    }

    // 2. 不存在则创建（这里使用 DEFAULT_ACCOUNT_ID 作为商家账号）
    const insertRes = await client.query(
        `
        INSERT INTO Shop (account_id, shop_description, shop_name)
        VALUES ($1, $2, $3)
        RETURNING shop_id
        `,
        [DEFAULT_ACCOUNT_ID, `${shopName} 的自动导入店铺`, shopName]
    );

    return insertRes.rows[0].shop_id;
}

main().catch(err => {
    console.error('脚本异常退出：', err);
    process.exit(1);
});