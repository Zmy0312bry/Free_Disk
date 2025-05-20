const express = require('express');
const router = express.Router();
const gitBaseController = require('../controllers/gitBaseController');
const gitInitController = require('../controllers/gitInitController');

// Git初始化配置相关路由
router.get('/config', gitInitController.getConfig);
router.post('/config/repo-path', gitInitController.updateRepoPath);
router.post('/config/remote-url', gitInitController.updateRemoteUrl);
router.post('/config/user', gitInitController.updateUserConfig);
//初始化下载路径
router.post('/config/init-install-path', gitInitController.initInstallPath);
//获取下载路径
router.get('/config/get-install-path', gitInitController.getInstallPath);
//初始化拉取
router.post('/init-pull', gitBaseController.initPull);

// 仓库初始化路由
router.post('/init-repo', gitBaseController.initRepository);

module.exports = router;
