const express = require('express');
const router = express.Router();
const gitTreeController = require('../controllers/gitTreeController');

/**
 * 获取Git仓库文件树
 * @route GET /
 */
router.get('/', gitTreeController.getGitTree);

module.exports = router;
