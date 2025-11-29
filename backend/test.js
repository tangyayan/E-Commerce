const pool = require('./config/database');

async function testDatabase() {
    try {
        console.log('=== 数据库连接测试 ===');
        console.log('Host:', process.env.DB_HOST);
        console.log('Port:', process.env.DB_PORT);
        console.log('User:', process.env.DB_USER);
        console.log('Database:', process.env.DB_NAME);
        
        // 测试连接
        const timeResult = await pool.query('SELECT NOW() as current_time');
        console.log('\n✓ 数据库连接成功');
        console.log('当前时间:', timeResult.rows[0].current_time);
        
        // 查看所有表
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        
        process.exit(0);
    } catch (error) {
        console.error('\n✗ 测试失败:');
        console.error('错误:', error.message);
        process.exit(1);
    }
}

testDatabase();