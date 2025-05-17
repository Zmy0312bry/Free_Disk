const path = require('path');
const simpleGit = require('simple-git');
const fs = require('fs-extra');
const sparseCheckoutUtils = require('../utils/sparseCheckoutUtils');
const gitUtils = require('../utils/gitUtils');
const { getConfig } = require('../utils/InitUtils');

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
 * 复制文件到安装目录
 * @param {Object} req - HTTP请求对象
 * @param {Object} res - HTTP响应对象
 */
exports.copyFileToInstall = async function(req, res) {
    try {
        const { sourcePath } = req.body;

        if (!sourcePath) {
            return res.status(400).json({
                success: false,
                message: '缺少必需的参数 sourcePath'
            });
        }

        const config = getConfig();
        
        // 1. 获取文件父目录路径
        let parentDir = path.dirname(sourcePath);
        
        // 处理根目录的情况 - 如果父目录是 / 或 .，则设置为空字符串
        if (parentDir === '/' || parentDir === '.') {
            parentDir = '';
            console.log('文件位于根目录，设置父目录为空');
        }
        
        // 2. 执行稀疏检出操作
        await sparseCheckoutUtils.sparseUpdate(parentDir);
        
        // 3. 重新应用稀疏检出配置
        const git = simpleGit({ baseDir: path.join(process.cwd(), config.repoPath) });
        await git.raw(['sparse-checkout', 'reapply']);
        console.log('已重新应用稀疏检出配置');

        // 4. 执行 pull 同步
        await gitUtils.pull(config.remoteName, config.defaultBranch, parentDir);
        
        // 5. 复制文件到安装目录
        const sourceFilePath = path.join(process.cwd(), config.repoPath, sourcePath);
        const targetDir = config.installPath;
        const targetFilePath = path.join(targetDir, path.basename(sourcePath));
        
        // 确保目标目录存在
        await fs.ensureDir(targetDir);
        
        // 复制文件
        await fs.copy(sourceFilePath, targetFilePath, { overwrite: true });
        
        res.json({
            success: true,
            message: '文件复制完成',
            sourcePath,
            targetPath: targetFilePath
        });
    } catch (error) {
        console.error('文件复制错误:', error);
        res.status(500).json({
            success: false,
            message: `文件复制失败: ${error.message}`,
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
