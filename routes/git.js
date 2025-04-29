const express = require('express');
const router = express.Router();
const gitController = require('../controllers/gitController');

// Git推送路由
router.post('/push', gitController.gitPush);

module.exports = router;
