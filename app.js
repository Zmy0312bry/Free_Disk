var express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');

/**
 * 初始化框架,并将初始化后的函数给予 '当前页面'全局变量 app
 * 也就是说, app 是 express 
 */
var app = express();

/* 配置框架环境 S */
// 使用CORS中间件，允许所有来源的跨域请求
app.use(cors({
    origin: '*', // 允许所有来源
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // 允许的HTTP方法
    allowedHeaders: ['Content-Type', 'Authorization'] // 允许的请求头
}));

// 设置 public 为静态文件的存放文件夹
app.use('/public', express.static('public'));

// 使用body-parser中间件
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/* 配置框架环境 E */

// 引入路由
const indexRouter = require('./routes/index');
const gitRouter = require('./routes/git');
const sshRouter = require('./routes/ssh');
const gitTreeRouter = require('./routes/git-tree');
const initRouter = require('./routes/init');
const fileRouter = require('./routes/file');

// 使用路由
app.use('/', indexRouter);
app.use('/git', gitRouter);
app.use('/ssh', sshRouter);
app.use('/git-tree', gitTreeRouter);
app.use('/init', initRouter);
app.use('/file', fileRouter);

var server = app.listen(3001, "127.0.0.1", function() {
    var host = server.address().address
    var port = server.address().port
    
    console.log("Node.JS 服务器已启动，访问地址： http://%s:%s", host, port)
    console.log("热重载已启用，文件修改后服务将自动重启")
});
