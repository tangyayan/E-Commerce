const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function initDatabase() {
    try {
        console.log('开始初始化数据库...');
        console.log('数据库名称:', process.env.DB_NAME);
        
        // 读取 SQL 文件
        const sqlPath = path.join(__dirname, '../sql/init.sql');
        console.log('SQL 文件路径:', sqlPath);
        
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('SQL 内容:\n', sql);
        
        // 执行 SQL
        await pool.query(sql);
        
        console.log('✓ 数据库初始化成功！');
        
        // 验证表是否创建
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        
        console.log('\n已创建的表:');
        result.rows.forEach(row => {
            console.log('  -', row.table_name);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('✗ 数据库初始化失败:');
        console.error('错误信息:', error.message);
        console.error('错误详情:', error);
        process.exit(1);
    }
}

initDatabase();