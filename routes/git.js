const express = require('express');
const router = express.Router();
const gitController = require('../controllers/gitController');
const multer = require('multer');

// 配置 multer 存储
const storage = multer.memoryStorage(); // 使用内存存储，不写入磁盘
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 限制文件大小为50MB
});

// Git推送路由
router.post('/push', gitController.gitPush);

router.get('/workspace-info', gitController.getWorkspaceInfo);

// 稀疏更新路由
router.post('/sparse-pull', gitController.sparsePull);

// 稀疏检出配置更新路由
router.post('/sparse-update', gitController.sparseUpdate);

// 仓库初始化路由
router.post('/init-repo', gitController.initRepository);

// 上传文件并推送到Git仓库
router.post('/upload-and-push', upload.single('file'), gitController.uploadAndPush);

module.exports = router;
