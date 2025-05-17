const path = require('path');
const fs = require('fs');
const fileUtils = require('../utils/fileUtils');
const gitUtils = require('../utils/gitUtils');
const sparseCheckoutUtils = require('../utils/sparseCheckoutUtils');
const { getConfig } = require('../utils/InitUtils');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const simpleGit = require('simple-git');

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

        const config = getConfig();
        const workspacePath = path.join(process.cwd(), config.repoPath.replace('/', '\\'), workspace);
        const isInitialized = await gitUtils.isGitInitialized(workspace);
        
        let remoteUrl = '';
        if (isInitialized) {
            remoteUrl = await gitUtils.getRemoteUrl(config.remoteName, workspace);
        }

        res.json({
            success: true,
            workspace,
            path: workspacePath,
            isGitInitialized: isInitialized,
            remoteUrl: remoteUrl || config.remoteUrl,
            defaultBranch: config.defaultBranch
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
        const config = getConfig();
        const basePath = customPath || path.join(process.cwd(), config.repoPath.replace('/', '\\'));
        
        // 确保目录存在
        fileUtils.ensureDirectoryExists(basePath);
        
        // 初始化Git仓库
        await gitUtils.initRepository(basePath);
        
        // 设置远程仓库
        const finalRemoteUrl = remoteUrl || config.remoteUrl;
        await gitUtils.setupRemoteRepositoryWithPath(basePath, config.remoteName, finalRemoteUrl);
        
        res.json({
            success: true,
            message: '仓库初始化完成',
            path: basePath,
            remoteUrl: finalRemoteUrl,
            remoteName: config.remoteName,
            defaultBranch: config.defaultBranch
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
 * 初始化稀疏检出配置（默认不检出任何目录）
 * @param {Object} req - HTTP请求对象
 * @param {Object} res - HTTP响应对象
 */
exports.initSparseCheckoutEmpty = async function(req, res) {
    try {
        const { workspace } = req.body;

        // 允许workspace可以为空字符串，表示仓库根目录
        if (workspace === undefined) {
            return res.status(400).json({
                success: false,
                message: '缺少必需的参数 workspace'
            });
        }

        // 初始化稀疏检出配置（默认不检出任何目录）
        await sparseCheckoutUtils.initSparseCheckoutEmpty(workspace);
        
        res.json({
            success: true,
            message: '稀疏检出配置已初始化（默认不检出任何目录）',
            workspace: workspace || '根目录',
        });
    } catch (error) {
        console.error('稀疏检出配置初始化错误:', error);
        res.status(500).json({
            success: false,
            message: `稀疏检出配置初始化失败: ${error.message}`,
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * 更新稀疏检出配置
 * 初始化或更新指定工作区的稀疏检出配置
 * @param {Object} req - HTTP请求对象
 * @param {Object} res - HTTP响应对象
 */
exports.sparseUpdate = async function(req, res) {
    try {
        const { workspace } = req.body;

        // 允许workspace可以为空字符串，表示仓库根目录
        if (workspace === undefined) {
            return res.status(400).json({
                success: false,
                message: '缺少必需的参数 workspace'
            });
        }

        // 初始化稀疏检出配置
        const contentChanged = await sparseCheckoutUtils.sparseUpdate(workspace);
        
        res.json({
            success: true,
            message: '稀疏检出配置已更新',
            workspace: workspace || '根目录',
            contentChanged
        });
    } catch (error) {
        console.error('稀疏检出配置更新错误:', error);
        res.status(500).json({
            success: false,
            message: `稀疏检出配置更新失败: ${error.message}`,
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * 稀疏检出同步更新接口
 * 执行稀疏检出更新和同步操作
 * @param {Object} req - HTTP请求对象
 * @param {Object} res - HTTP响应对象
 */
exports.sparsePull = async function(req, res) {
    try {
        const { workspace } = req.body;

        // 1. 重新应用稀疏检出配置
        const config = getConfig();
        const git = simpleGit({ baseDir: path.join(process.cwd(), config.repoPath) });
        await git.raw(['sparse-checkout', 'reapply']);
        console.log('已重新应用稀疏检出配置');

        // 2. 执行 pull 同步
        await gitUtils.pull(config.remoteName, config.defaultBranch, workspace);
        
        res.json({
            success: true,
            message: '稀疏检出更新完成',
            workspace,
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
    // 保存当前工作目录，以便后续恢复
    const originalWorkingDir = process.cwd();
    
    try {
        // 支持两种模式：本地文件路径复制和前端上传的二进制文件
        const isFileUpload = req.file || req.files; // 检查是否有上传文件
        let fileName, targetPath;
        
        // 检查必要参数
        const { targetRelativePath } = req.body;
        
        if (!targetRelativePath) {
            return res.status(400).json({
                success: false,
                message: '缺少必要参数：目标相对路径'
            });
        }
        
        // 使用gitConfig中的配置获取仓库路径
        const config = getConfig();
        const repoPath = path.join(process.cwd(), config.repoPath.replace('/', '\\'));
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
        const { stdout: diffOutput } = await execPromise(`git diff ${config.defaultBranch} ${config.remoteName}/${config.defaultBranch}`);
        
        if (diffOutput.trim() !== '') {
            console.log('检测到潜在冲突，执行git pull...');
            await execPromise(`git pull ${config.remoteName} ${config.defaultBranch}`);
        }
        
        // 步骤2：处理文件
        console.log('处理文件...');
        
        if (isFileUpload) {
            // 处理前端上传的二进制文件
            const uploadedFile = req.file || req.files[0];
            fileName = uploadedFile.originalname || 'uploaded_file';
            targetPath = path.join(targetDir, fileName);
            
            // 将上传的文件内容写入目标路径
            const fileBuffer = uploadedFile.buffer;
            fs.writeFileSync(targetPath, fileBuffer);
            console.log(`已保存上传的文件: ${fileName} -> ${targetPath}`);
        } else {
            // 本地文件路径复制
            const { sourcePath } = req.body;
            
            if (!sourcePath) {
                return res.status(400).json({ 
                    success: false, 
                    message: '使用本地复制模式时，需要提供源文件路径'
                });
            }
            
            fileName = fileUtils.getFileName(sourcePath);
            targetPath = path.join(targetDir, fileName);
            
            // 使用复制替代软链接
            await fileUtils.copyFile(sourcePath, targetPath);
        }
        
        // 添加新文件到git
        await execPromise(`git add "${targetPath}"`);
        await execPromise(`git commit -m "${config.defaultCommitMessage}: ${fileName}"`);
        
        // 步骤3：推送到远程仓库
        console.log('推送到远程仓库...');
        await execPromise(`git push ${config.remoteName} ${config.defaultBranch}`);
        
        // 返回结果前恢复原始工作目录
        process.chdir(originalWorkingDir);
        
        res.status(200).json({
            success: true,
            message: '文件上传并推送成功',
            file: {
                name: fileName,
                path: targetPath
            }
        });
    } catch (error) {
        // 确保即使出错也恢复原始工作目录
        process.chdir(originalWorkingDir);
        
        console.error('上传文件并推送时出错:', error);
        res.status(500).json({
            success: false,
            message: '上传文件并推送失败',
            error: error.message
        });
    }
};

/**
 * 初始化和更新LFS配置
 * @param {Object} req - HTTP请求对象
 * @param {Object} res - HTTP响应对象
 */
exports.initAndUpdateLFS = async function(req, res) {
    try {
        const config = getConfig();
        // 如果请求中带有add_lfs字段，则取出文件后缀名进行处理
        let extensions = [];
        if (req.body.add_lfs) {
            const extension = req.body.add_lfs;
            if (!extension.startsWith('.')) {
                return res.status(400).json({
                    success: false,
                    message: '文件后缀名必须以.开头'
                });
            }
            extensions.push(extension);
        }

        // 初始化LFS并更新配置
        await gitUtils.initAndUpdateLFS(extensions);
        
        res.json({
            success: true,
            message: extensions.length > 0 
                ? `LFS配置已更新，已添加${extensions.join(', ')}到LFS追踪`
                : 'LFS已初始化',
            path: config.repoPath
        });
    } catch (error) {
        console.error('LFS配置更新错误:', error);
        res.status(500).json({
            success: false,
            message: `LFS配置更新失败: ${error.message}`,
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
