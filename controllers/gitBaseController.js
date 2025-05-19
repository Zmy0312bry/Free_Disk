const path = require('path');
const fs = require('fs');
const fileUtils = require('../utils/fileUtils');
const gitUtils = require('../utils/gitUtils');
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
 * 初始化拉取
 * 如果远程仓库为空，则创建README并推送
 * @param {Object} req - HTTP请求对象
 * @param {Object} res - HTTP响应对象
 */
exports.initPull = async function(req, res) {
    // 保存当前工作目录
    const originalWorkingDir = process.cwd();
    
    try {
        const config = getConfig();
        const repoPath = path.join(process.cwd(), config.repoPath);
        const git = simpleGit({ baseDir: repoPath });
        
        // 进入仓库目录
        process.chdir(repoPath);

        // 检查并初始化仓库
        if (!fs.existsSync(path.join(repoPath, '.git'))) {
            await git.init();
            await git.addRemote(config.remoteName, config.remoteUrl);
            console.log('Git仓库已初始化');
        }

        try {
            // 尝试拉取
            await git.pull(config.remoteName, config.defaultBranch);
            console.log('成功从远程仓库拉取');
            
            // 恢复工作目录
            process.chdir(originalWorkingDir);
            
            res.json({
                success: true,
                message: '成功从远程仓库拉取更新'
            });
        } catch (pullError) {
            // 检查是否是因为远程分支不存在导致的错误
            if (pullError.message.includes('not a valid object name') || 
                pullError.message.includes('couldn\'t find remote ref')) {
                try {
                    // 创建README.md文件
                    const readmePath = path.join(repoPath, 'README.md');
                    fs.writeFileSync(readmePath, '初始化', 'utf8');
                    
                    // 提交并推送
                    await git.add('README.md');
                    await git.commit('初始化提交');
                    await git.push(config.remoteName, config.defaultBranch, ['--set-upstream']);
                    
                    console.log('已创建初始提交并推送');
                    
                    res.json({
                        success: true,
                        message: '远程仓库为空，已创建初始提交并推送'
                    });
                } finally {
                    // 恢复工作目录
                    process.chdir(originalWorkingDir);
                }
            } else {
                // 其他错误则抛出
                throw pullError;
            }
        }
    } catch (error) {
        console.error('初始化拉取错误:', error);
        res.status(500).json({
            success: false,
            message: `初始化拉取失败: ${error.message}`,
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    } finally {
        // 确保在任何情况下都恢复工作目录
        if (process.cwd() !== originalWorkingDir) {
            process.chdir(originalWorkingDir);
        }
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
 * 上传文件并推送到Git仓库
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
/**
 * 执行安全的推送操作（先pull再push）
 * 在仓库根目录执行git操作
 * @param {Object} req - HTTP请求对象
 * @param {Object} res - HTTP响应对象
 */
exports.safePush = async function(req, res) {
    try {
        const config = getConfig();
        const repoPath = path.join(process.cwd(), config.repoPath);
        const git = simpleGit({ baseDir: repoPath });
        
        // 确保在保护的工作目录中执行
        await gitUtils.withProtectedWorkingDir(async () => {
            process.chdir(repoPath);
            
            // 执行pull操作
            const pullResult = await git.pull(config.remoteName, config.defaultBranch);
            console.log('拉取操作结果:', JSON.stringify(pullResult, null, 2));

            // 先执行add操作
            await git.add('.');
            console.log('已添加所有更改到暂存区');

            // 执行commit操作
            await git.commit(config.defaultCommitMessage);
            console.log('已提交更改');
            
            // 执行push操作
            const pushResult = await git.push(config.remoteName, config.defaultBranch);
            console.log('推送操作结果:', JSON.stringify(pushResult, null, 2));
        });
        
        res.json({
            success: true,
            message: '成功完成git add、commit、pull和push操作'
        });
    } catch (error) {
        console.error('安全推送操作失败:', error);
        res.status(500).json({
            success: false,
            message: `推送失败: ${error.message}`,
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

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
        
        console.log('执行git pull...');
        await execPromise(`git pull ${config.remoteName} ${config.defaultBranch}`);

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
