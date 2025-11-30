const express = require('express');// 引入 Express 框架，web服务器基础
const cors = require('cors');// 处理跨域请求
const bodyParser = require('body-parser');// 解析请求体json和URL
require('dotenv').config();

const app = express();
const pool = require('./config/database');

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 路由
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart'); 

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes); 

// 测试路由
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✓ 服务器运行在端口 ${PORT}`);
});

module.exports = app;