const express = require('express');
const router = express.Router();
const gitBaseController = require('../controllers/gitBaseController');
const gitAdvancedController = require('../controllers/gitAdvancedController');
const gitInitController = require('../controllers/gitInitController');
const multer = require('multer');

// 配置 multer 存储
const storage = multer.memoryStorage(); // 使用内存存储，不写入磁盘
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 限制文件大小为50MB
});

router.get('/workspace-info', gitBaseController.getWorkspaceInfo);

// 稀疏更新路由
router.post('/sparse-pull', gitAdvancedController.sparsePull);

// 稀疏检出初始化路由（默认不检出任何目录）
router.post('/sparse-init-empty', gitAdvancedController.initSparseCheckoutEmpty);

// 稀疏检出配置更新路由
router.post('/sparse-update', gitAdvancedController.sparseUpdate);

// 上传文件并推送到Git仓库
router.post('/upload-and-push', upload.single('file'), gitBaseController.uploadAndPush);

// Git LFS初始化和更新路由
router.post('/lfs-update', gitAdvancedController.initAndUpdateLFS);

// 安全推送路由（先pull后push）
router.post('/safe-push', gitBaseController.safePush);



module.exports = router;
