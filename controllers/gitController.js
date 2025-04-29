const path = require('path');
const fileUtils = require('../utils/fileUtils');
const gitUtils = require('../utils/gitUtils');
const gitConfig = require('../config/gitConfig');

/**
 * Git推送控制器
 * 处理文件更新并推送到远程Git仓库
 * 
 * @param {Object} req - HTTP请求对象
 * @param {Object} res - HTTP响应对象
 */
exports.gitPush = async function(req, res) {
    try {
        const { filePath, content } = req.body;
        
        // 验证必需的参数
        if (!filePath || !content) {
            return res.status(400).json({
                success: false,
                message: '缺少必需的参数 filePath 或 content'
            });
        }

        // 确保文件路径在 public/temp 目录下
        const repoPath = path.join(process.cwd(), gitConfig.repoPath);
        const fullPath = path.join(repoPath, filePath);
        
        // 验证文件路径是否在仓库目录下
        if (!fileUtils.validateFilePath(fullPath, repoPath)) {
            return res.status(400).json({ 
                success: false, 
                message: '文件只能在仓库目录下创建或修改' 
            });
        }
        
        // 确保目录存在
        const dirPath = path.dirname(fullPath);
        fileUtils.ensureDirectoryExists(dirPath);
        
        // 创建/更新文件
        fileUtils.writeFileContent(fullPath, content);

        // Git操作
        await gitUtils.checkGitInitialized();
        await gitUtils.setupRemoteRepository(gitConfig.remoteName, gitConfig.remoteUrl);
        await gitUtils.commitChanges(fullPath, gitConfig.defaultCommitMessage);
        await gitUtils.pushChanges(gitConfig.remoteName, gitConfig.defaultBranch);
        
        // 返回成功响应
        res.json({ 
            success: true, 
            message: '文件更新并成功推送到Git仓库',
            path: filePath
        });
    } catch (error) {
        console.error('Git操作错误:', error);
        res.status(500).json({ 
            success: false, 
            message: `操作失败: ${error.message}`,
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
