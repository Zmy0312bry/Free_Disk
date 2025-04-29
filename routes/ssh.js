const express = require('express');
const router = express.Router();
const sshController = require('../controllers/sshController');

// 生成SSH密钥路由
router.post('/generate-key', sshController.generateSshKey);

module.exports = router;
