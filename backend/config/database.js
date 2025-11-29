//数据库连接配置
const { Pool } = require('pg');
require('dotenv').config();

// 创建数据库连接池
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    max: 20, // 最大连接数
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
// 使用: await pool.query('SELECT * FROM users WHERE id = $1', [userId])

// 测试数据库连接
pool.on('connect', () => {
    console.log('✓ 已连接到 OpenGauss 数据库');
});

pool.on('error', (err) => {
    console.error('数据库连接错误:', err);
    process.exit(-1);
});

module.exports = pool;