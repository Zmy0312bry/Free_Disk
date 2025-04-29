const express = require('express');
const router = express.Router();

// 主页路由
router.get('/', function(req, res) {
    res.send('Hello World');
});

module.exports = router;
