const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');

/**
 * @api {post} /api/file/folder 创建文件夹
 * @apiName CreateFolder
 * @apiGroup File
 * 
 * @apiParam {String} baseDir 基础目录路径
 * @apiParam {String} folderName 要创建的文件夹名称
 * 
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {String} path 创建的文件夹完整路径
 * 
 * @apiError {Boolean} success 始终为false
 * @apiError {String} error 错误信息
 */
router.post('/folder', fileController.createFolder);

/**
 * @api {post} /api/file/copy-to-install 复制文件到安装目录
 * @apiName CopyFileToInstall
 * @apiGroup File
 * 
 * @apiParam {String} sourcePath 源文件路径
 * 
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {String} message 操作信息
 * @apiSuccess {String} sourcePath 源文件路径
 * @apiSuccess {String} targetPath 目标文件路径
 * 
 * @apiError {Boolean} success 始终为false
 * @apiError {String} message 错误信息
 * @apiError {String} error 详细错误堆栈（仅开发环境）
 */
router.post('/copy-to-install', fileController.copyFileToInstall);

module.exports = router;
