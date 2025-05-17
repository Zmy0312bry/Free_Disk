const express = require('express');
const router = express.Router();
const gitController = require('../controllers/gitController');
const gitInitController = require('../controllers/gitInitController');
const multer = require('multer');

// 配置 multer 存储
const storage = multer.memoryStorage(); // 使用内存存储，不写入磁盘
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 限制文件大小为50MB
});


router.get('/workspace-info', gitController.getWorkspaceInfo);

// 稀疏更新路由
router.post('/sparse-pull', gitController.sparsePull);

// 稀疏检出初始化路由（默认不检出任何目录）
router.post('/sparse-init-empty', gitController.initSparseCheckoutEmpty);

// 稀疏检出配置更新路由
router.post('/sparse-update', gitController.sparseUpdate);

// 仓库初始化路由
router.post('/init-repo', gitController.initRepository);

// 上传文件并推送到Git仓库
router.post('/upload-and-push', upload.single('file'), gitController.uploadAndPush);

// Git LFS初始化和更新路由
router.post('/lfs-update', gitController.initAndUpdateLFS);

// Git初始化配置相关路由
router.get('/config', gitInitController.getConfig);
router.post('/config/repo-path', gitInitController.updateRepoPath);
router.post('/config/remote-url', gitInitController.updateRemoteUrl);
router.post('/config/user', gitInitController.updateUserConfig);

module.exports = router;
