const express = require('express');
const router = express.Router();
const sshController = require('../controllers/sshController');

// 生成SSH密钥路由
router.post('/generate-key', sshController.generateSshKey);

// 获取SSH公钥路由
router.get('/get-key', sshController.getPublicKey);

module.exports = router;
