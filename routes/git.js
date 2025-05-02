const express = require('express');
const router = express.Router();
const gitController = require('../controllers/gitController');

// Git推送路由
router.post('/push', gitController.gitPush);

router.get('/workspace-info', gitController.getWorkspaceInfo);

// 稀疏更新路由
router.post('/sparse-pull', gitController.sparsePull);

// 仓库初始化路由
router.post('/init-repo', gitController.initRepository);

// 上传文件并推送到Git仓库
router.post('/upload-and-push', gitController.uploadAndPush);

module.exports = router;
