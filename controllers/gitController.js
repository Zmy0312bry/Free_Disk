const path = require('path');
const fileUtils = require('../utils/fileUtils');
const gitUtils = require('../utils/gitUtils');
const gitConfig = require('../config/gitConfig');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Git推送控制器
 * 处理文件更新并推送到远程Git仓库
 * 
 * @param {Object} req - HTTP请求对象
 * @param {Object} res - HTTP响应对象
 */
exports.gitPush = async function(req, res) {
    try {
        const { filePath, content, workspace } = req.body;
        
        // 验证必需的参数
        if (!filePath || !content) {
            return res.status(400).json({
                success: false,
                message: '缺少必需的参数 filePath 或 content'
            });
        }

        // 获取仓库路径，如果提供了workspace则考虑工作区
        const repoPath = workspace 
            ? path.join(process.cwd(), gitConfig.repoPath, workspace)
            : path.join(process.cwd(), gitConfig.repoPath);
        
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
        await gitUtils.checkGitInitialized(workspace);
        await gitUtils.setupRemoteRepository(gitConfig.remoteName, gitConfig.remoteUrl, workspace);
        await gitUtils.commitChanges(fullPath, gitConfig.defaultCommitMessage, workspace);
        await gitUtils.pushChanges(gitConfig.remoteName, gitConfig.defaultBranch, workspace);
        
        // 返回成功响应
        res.json({ 
            success: true, 
            message: '文件更新并成功推送到Git仓库',
            path: filePath,
            workspace: workspace || 'default'
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

/**
 * 获取工作区的远程仓库路径信息
 * @param {Object} req - HTTP请求对象
 * @param {Object} res - HTTP响应对象
 */
exports.getWorkspaceInfo = async function(req, res) {
    try {
        const { workspace } = req.query;
        if (!workspace) {
            return res.status(400).json({
                success: false,
                message: '缺少必需的参数 workspace'
            });
        }

        const workspacePath = path.join(process.cwd(), gitConfig.repoPath, workspace);
        const isInitialized = await gitUtils.isGitInitialized(workspace);
        
        let remoteUrl = '';
        if (isInitialized) {
            remoteUrl = await gitUtils.getRemoteUrl(gitConfig.remoteName, workspace);
        }

        res.json({
            success: true,
            workspace,
            path: workspacePath,
            isGitInitialized: isInitialized,
            remoteUrl: remoteUrl || gitConfig.remoteUrl,
            defaultBranch: gitConfig.defaultBranch
        });
    } catch (error) {
        console.error('获取工作区信息错误:', error);
        res.status(500).json({
            success: false,
            message: `操作失败: ${error.message}`,
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * 初始化Git仓库
 * 接收可选的自定义存储路径，初始化Git仓库并进行远程配置
 * 
 * @param {Object} req - HTTP请求对象
 * @param {Object} res - HTTP响应对象
 */
exports.initRepository = async function(req, res) {
    try {
        const { customPath, remoteUrl } = req.body;
        
        // 使用自定义路径或默认配置路径
        const basePath = customPath || path.join(process.cwd(), gitConfig.repoPath);
        
        // 确保目录存在
        fileUtils.ensureDirectoryExists(basePath);
        
        // 初始化Git仓库
        await gitUtils.initRepository(basePath);
        
        // 设置远程仓库
        const finalRemoteUrl = remoteUrl || gitConfig.remoteUrl;
        await gitUtils.setupRemoteRepositoryWithPath(basePath, gitConfig.remoteName, finalRemoteUrl);
        
        res.json({
            success: true,
            message: '仓库初始化完成',
            path: basePath,
            remoteUrl: finalRemoteUrl,
            remoteName: gitConfig.remoteName,
            defaultBranch: gitConfig.defaultBranch
        });
    } catch (error) {
        console.error('仓库初始化错误:', error);
        res.status(500).json({
            success: false,
            message: `仓库初始化失败: ${error.message}`,
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * 稀疏更新接口
 * 执行稀疏检出初始化和更新操作
 * @param {Object} req - HTTP请求对象
 * @param {Object} res - HTTP响应对象
 */
exports.sparsePull = async function(req, res) {
    try {
        const { workspace } = req.body;

        // 允许workspace可以为空字符串，表示仓库根目录
        if (workspace === undefined) {
            return res.status(400).json({
                success: false,
                message: '缺少必需的参数 workspace'
            });
        }


        // 执行 pull 同步
        await gitUtils.pull(gitConfig.remoteName, gitConfig.defaultBranch, workspace);
        
        res.json({
            success: true,
            message: '稀疏检出更新完成',
            workspace,
            patterns
        });
    } catch (error) {
        console.error('稀疏更新错误:', error);
        res.status(500).json({
            success: false,
            message: `稀疏更新失败: ${error.message}`,
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * 上传文件并推送到Git仓库
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.uploadAndPush = async (req, res) => {
    try {
        const { sourcePath, targetRelativePath } = req.body;
        
        if (!sourcePath || !targetRelativePath) {
            return res.status(400).json({ 
                success: false, 
                message: '缺少必要参数：源文件路径或目标相对路径'
            });
        }
        
        // 使用gitConfig中的配置获取仓库路径
        const repoPath = path.join(process.cwd(), gitConfig.repoPath);
        const targetDir = path.join(repoPath, targetRelativePath);
        
        // 确保目标目录在仓库路径内
        if (!fileUtils.validateFilePath(targetDir, repoPath)) {
            return res.status(400).json({
                success: false,
                message: '目标目录必须在仓库路径内'
            });
        }
        
        // 确保目录存在
        fileUtils.ensureDirectoryExists(targetDir);
        
        // 进入仓库目录执行git操作
        process.chdir(repoPath);
        
        // 步骤1：检查是否有冲突
        console.log('检查是否有冲突...');
        const { stdout: diffOutput } = await execPromise(`git diff ${gitConfig.defaultBranch} ${gitConfig.remoteName}/${gitConfig.defaultBranch}`);
        
        if (diffOutput.trim() !== '') {
            console.log('检测到潜在冲突，执行git pull...');
            await execPromise(`git pull ${gitConfig.remoteName} ${gitConfig.defaultBranch}`);
        }
        
        // 步骤2：上传文件（复制文件，不使用软链接）
        console.log('复制文件...');
        const fileName = fileUtils.getFileName(sourcePath);
        const targetPath = path.join(targetDir, fileName);
        
        // 使用复制替代软链接
        await fileUtils.copyFile(sourcePath, targetPath);
        
        // 添加新文件到git
        await execPromise(`git add "${targetPath}"`);
        await execPromise(`git commit -m "${gitConfig.defaultCommitMessage}: ${fileName}"`);
        
        // 步骤3：推送到远程仓库
        console.log('推送到远程仓库...');
        await execPromise(`git push ${gitConfig.remoteName} ${gitConfig.defaultBranch}`);
        
        res.status(200).json({
            success: true,
            message: '文件上传并推送成功',
            file: {
                name: fileName,
                path: targetPath
            }
        });
    } catch (error) {
        console.error('上传文件并推送时出错:', error);
        res.status(500).json({
            success: false,
            message: '上传文件并推送失败',
            error: error.message
        });
    }
};
