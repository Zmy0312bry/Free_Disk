const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs');
const gitConfig = require('../config/gitConfig');

// 添加全局变量来存储目标文件夹
let target_folder = '';

/**
 * 获取 Git 仓库路径
 * @param {string} workspace 可选工作区名称，表示仓库内的子文件夹路径
 * @returns {string} 仓库路径
 */
const getRepoPath = (workspace) => {
    // 使用gitConfig中的配置构建基础路径
    const basePath = path.join(process.cwd(), gitConfig.repoPath);
    // 设置全局变量 target_folder，这里的workspace是仓库内的路径，而不是独立仓库目录
    target_folder = workspace || '';
    
    // 如果提供了workspace，则将其添加到路径中
    if (workspace) {
        return path.join(basePath, workspace);
    }
    
    // 否则返回基础路径
    return basePath;
};

// 将getRepoPath函数导出，使其可以在其他模块中访问
exports.getRepoPath = getRepoPath;

/**
 * 获取特定工作区的Git实例
 * @param {string} workspace 可选工作区名称
 * @returns {SimpleGit} Git实例
 */
const getGit = (workspace) => {
    const repoPath = getRepoPath(workspace);
    return simpleGit({ baseDir: repoPath });
};

/**
 * 检查Git仓库是否已初始化
 * @param {string} workspace 可选工作区名称
 * @returns {Promise<boolean>} 是否已初始化
 */
exports.isGitInitialized = async function(workspace) {
    const repoPath = getRepoPath(workspace);
    return fs.existsSync(path.join(repoPath, '.git\\'));
};

/**
 * 检查Git仓库是否已初始化，如未初始化则初始化
 * @param {string} workspace 可选工作区名称
 * @returns {Promise<boolean>} 是否已初始化
 */
exports.checkGitInitialized = async function(workspace) {
    const repoPath = getRepoPath(workspace);
    
    // 确保仓库目录存在
    if (!fs.existsSync(repoPath)) {
        fs.mkdirSync(repoPath, { recursive: true });
        console.log(`创建仓库目录: ${repoPath}`);
    }
    
    const git = getGit(workspace);
    const isInitialized = fs.existsSync(path.join(repoPath, '.git'));
    if (!isInitialized) {
        await git.init();
        console.log(`Git 仓库已在 ${workspace || 'default'} 工作区初始化`);
    }
    return true;
};

/**
 * 设置或更新远程仓库地址
 * @param {string} remoteName 远程仓库名称
 * @param {string} remoteUrl 远程仓库URL
 * @param {string} workspace 可选工作区名称
 */
exports.setupRemoteRepository = async function(remoteName, remoteUrl, workspace) {
    const git = getGit(workspace);
    const remotes = await git.getRemotes();
    const hasRemote = remotes.some(remote => remote.name === remoteName);
    
    if (!hasRemote) {
        await git.addRemote(remoteName, remoteUrl);
        console.log(`已添加远程仓库 ${remoteName}: ${remoteUrl} (工作区: ${workspace || 'default'})`);
        return;
    }
    
    // 检查现有远程仓库URL是否匹配
    const remoteData = await git.remote(['get-url', remoteName]);
    const currentUrl = remoteData.trim();
    
    if (currentUrl !== remoteUrl) {
        await git.removeRemote(remoteName);
        await git.addRemote(remoteName, remoteUrl);
        console.log(`远程仓库地址已更新为: ${remoteUrl} (工作区: ${workspace || 'default'})`);
    }
};

/**
 * 获取远程仓库URL
 * @param {string} remoteName 远程仓库名称
 * @param {string} workspace 可选工作区名称
 * @returns {Promise<string>} 远程仓库URL
 */
exports.getRemoteUrl = async function(remoteName, workspace) {
    try {
        const git = getGit(workspace);
        const remoteData = await git.remote(['get-url', remoteName]);
        return remoteData.trim();
    } catch (error) {
        console.error(`获取远程仓库URL失败: ${error.message}`);
        return '';
    }
};

/**
 * 提交文件更改
 * @param {string} filePath 文件路径
 * @param {string} message 提交信息
 * @param {string} workspace 可选工作区名称
 */
exports.commitChanges = async function(filePath, message, workspace) {
    const git = getGit(workspace);
    const repoPath = getRepoPath(workspace);
    // 转换为相对于仓库的路径
    const repoRelativePath = path.relative(repoPath, filePath);
    await git.add(repoRelativePath);
    const status = await git.status();
    if (status.not_added.length > 0 || status.modified.length > 0) {
        await git.commit(message);
        console.log(`已提交更改: ${message} (工作区: ${workspace || 'default'})`);
    }
};

/**
 * 提交所有更改
 * @param {string} message 提交信息
 * @param {string} workspace 可选工作区名称
 */
exports.commitAllChanges = async function(message, workspace) {
    const git = getGit(workspace);
    await git.add('.');
    const status = await git.status();
    if (status.not_added.length > 0 || status.modified.length > 0 || status.created.length > 0) {
        await git.commit(message);
        console.log(`已提交全部更改: ${message} (工作区: ${workspace || 'default'})`);
    }
};

/**
 * 推送更改到远程仓库
 * @param {string} remoteName 远程仓库名称
 * @param {string} branch 分支名称
 * @param {string} workspace 可选工作区名称
 */
exports.pushChanges = async function(remoteName, branch, workspace) {
    const git = getGit(workspace);
    try {
        await git.push(remoteName, branch);
        console.log(`已成功推送到 ${remoteName}/${branch} (工作区: ${workspace || 'default'})`);
    } catch (pushError) {
        if (pushError.message.includes('src refspec master does not match any')) {
            await git.checkoutLocalBranch(branch);
            await git.push(remoteName, branch, ['--set-upstream']);
            console.log(`创建并推送新分支 ${branch} (工作区: ${workspace || 'default'})`);
        } else {
            throw pushError;
        }
    }
};

/**
 * 在保护工作目录的情况下执行函数
 * 确保执行完成后恢复到原始工作目录
 * @param {Function} fn 要执行的函数
 * @returns {Promise<any>} 函数的返回值
 */
exports.withProtectedWorkingDir = async function(fn) {
    const originalWorkingDir = process.cwd();
    try {
        return await fn();
    } finally {
        // 无论成功还是失败，都恢复原始工作目录
        if (process.cwd() !== originalWorkingDir) {
            process.chdir(originalWorkingDir);
        }
    }
};

/**
 * 初始化稀疏检出配置
 * @param {string} workspace 工作区路径，表示仓库内的子文件夹路径
 */
exports.initSparseCheckout = async function(workspace) {
    return exports.withProtectedWorkingDir(async () => {
        // 获取仓库根目录，而不是子文件夹目录
        const baseRepoPath = path.join(process.cwd(), gitConfig.repoPath);
        // 在仓库根目录执行git操作
        const git = simpleGit({ baseDir: baseRepoPath });
        const repoPath = baseRepoPath;
        
        // 确保Git仓库已初始化（在根目录）
        if (!fs.existsSync(repoPath)) {
            fs.mkdirSync(repoPath, { recursive: true });
            console.log(`创建仓库目录: ${repoPath}`);
        }
        
        // 检查是否已初始化
        const isInitialized = fs.existsSync(path.join(repoPath, '.git'));
        if (!isInitialized) {
            await git.init();
            console.log(`Git 仓库已在根目录初始化`);
        }
        
        // 1. 检查 config 文件下 [core] 下是否有 sparseCheckout = true
        let isSparseCheckoutEnabled = false;
        try {
            const configValue = await git.raw(['config', '--get', 'core.sparseCheckout']);
            isSparseCheckoutEnabled = configValue.trim() === 'true';
        } catch (error) {
            // 如果命令失败，表示配置不存在
            isSparseCheckoutEnabled = false;
        }
        
        if (!isSparseCheckoutEnabled) {
            await git.raw(['config', 'core.sparseCheckout', 'true']);
            console.log(`已启用稀疏检出 (针对路径: ${workspace || '根目录'})`);
        }
        
        // 确保 .git/info 目录存在
        const infoDir = path.join(repoPath, '.git\\info');
        if (!fs.existsSync(infoDir)) {
            fs.mkdirSync(infoDir, { recursive: true });
        }
        
        // 2. 检查 .git/info 下有无 sparse-checkout 文件
        const sparseFile = path.join(infoDir, 'sparse-checkout\\');
        let sparseFileExists = fs.existsSync(sparseFile);
        
        if (!sparseFileExists) {
            // 执行 git sparse-checkout set --no-cone 命令
            await git.raw(['sparse-checkout', 'set', '--no-cone']);
            console.log(`已初始化稀疏检出文件 (针对路径: ${workspace || '根目录'})`);
            sparseFileExists = true;
        }
        
        // 3. 检查 sparse-checkout 文件内容
        let existingContent = '';
        let contentChanged = false;
        
        if (sparseFileExists) {
            existingContent = fs.readFileSync(sparseFile, 'utf8').trim();
        }
        
        // 构建期望的 sparse-checkout 内容 - 严格按照需要检出的路径和排除其他内容的格式
        // 如果workspace为空，则检出所有内容
        const expectedLines = workspace ? 
            [`${workspace}/*`, '!/*'] : 
            ['/*'];  // 如果没有指定workspace，则检出所有内容
        const expectedContent = expectedLines.join('\n');
        
        // 比较现有内容和期望内容
        if (existingContent !== expectedContent) {
            fs.writeFileSync(sparseFile, expectedContent, 'utf8');
            contentChanged = true;
            console.log(`已更新稀疏检出配置 (针对路径: ${workspace || '根目录'})`);
        }
        
        // 4. 如果 sparse-checkout 发生变动，执行 reapply 命令
        if (contentChanged) {
            await git.raw(['sparse-checkout', 'reapply']);
            console.log(`已重新应用稀疏检出配置 (针对路径: ${workspace || '根目录'})`);
        }
    });
};

/**
 * 从远程仓库拉取更新
 * @param {string} remoteName 远程仓库名称
 * @param {string} branch 分支名称
 * @param {string} workspace 工作区名称
 */
exports.pull = async function(remoteName, branch, workspace) {
    return exports.withProtectedWorkingDir(async () => {
        const git = getGit(workspace);
        try {
            await git.pull(remoteName, branch);
            console.log(`已从 ${remoteName}/${branch} 拉取更新 (工作区: ${workspace})`);
        } catch (error) {
            throw error;
        }
    });
};

/**
 * 初始化指定路径的Git仓库
 * @param {string} repoPath 仓库路径
 * @returns {Promise<boolean>} 是否成功初始化
 */
exports.initRepository = async function(repoPath) {
    // 确保仓库目录存在
    if (!fs.existsSync(repoPath)) {
        fs.mkdirSync(repoPath, { recursive: true });
        console.log(`创建仓库目录: ${repoPath}`);
    }
    
    const git = simpleGit({ baseDir: repoPath });
    const isInitialized = fs.existsSync(path.join(repoPath, '.git'));
    if (!isInitialized) {
        await git.init();
        console.log(`Git 仓库已在 ${repoPath} 初始化`);
    } else {
        console.log(`Git 仓库已经存在于 ${repoPath}`);
    }
    return true;
};

/**
 * 设置或更新指定路径仓库的远程地址
 * @param {string} repoPath 仓库路径
 * @param {string} remoteName 远程仓库名称
 * @param {string} remoteUrl 远程仓库URL
 */
exports.setupRemoteRepositoryWithPath = async function(repoPath, remoteName, remoteUrl) {
    const git = simpleGit({ baseDir: repoPath });
    const remotes = await git.getRemotes();
    const hasRemote = remotes.some(remote => remote.name === remoteName);
    
    if (!hasRemote) {
        await git.addRemote(remoteName, remoteUrl);
        console.log(`已添加远程仓库 ${remoteName}: ${remoteUrl} (路径: ${repoPath})`);
        return;
    }
    
    // 检查现有远程仓库URL是否匹配
    const remoteData = await git.remote(['get-url', remoteName]);
    const currentUrl = remoteData.trim();
    
    if (currentUrl !== remoteUrl) {
        await git.removeRemote(remoteName);
        await git.addRemote(remoteName, remoteUrl);
        console.log(`远程仓库地址已更新为: ${remoteUrl} (路径: ${repoPath})`);
    }
};

/**
 * 检查.gitattributes文件是否存在
 * @returns {Promise<boolean>} 是否存在.gitattributes文件
 */
exports.checkGitAttributesExists = async function() {
    const repoPath = path.join(process.cwd(), gitConfig.repoPath.replace('/', '\\'));
    return fs.existsSync(path.join(repoPath, '.gitattributes'));
};

/**
 * 初始化LFS配置并根据提供的后缀名添加LFS追踪
 * @param {string[]} extensions 需要通过LFS追踪的文件后缀名数组
 */
exports.initAndUpdateLFS = async function(extensions = []) {
    return exports.withProtectedWorkingDir(async () => {
        const repoPath = path.join(process.cwd(), gitConfig.repoPath);
        const git = simpleGit({ baseDir: repoPath });
        
        // 在仓库目录中执行操作
        process.chdir(repoPath);
        
        // 如果不存在.gitattributes，执行git lfs install
        if (!await exports.checkGitAttributesExists()) {
            await git.raw(['lfs', 'install']);
            console.log('Git LFS 已安装');
        }
        
        // 如果提供了后缀名，为每个后缀名添加LFS追踪
        if (extensions && extensions.length > 0) {
            for (const ext of extensions) {
                if (ext.startsWith('.')) {
                    await git.raw(['lfs', 'track', `*${ext}`]);
                    console.log(`已添加 ${ext} 文件到 LFS 追踪`);
                }
            }
            
            // 添加并提交.gitattributes文件
            await git.add('.gitattributes');
            await git.commit('更新 Git LFS 追踪配置');
            
            // 推送更改到远程仓库
            await git.push(gitConfig.remoteName, gitConfig.defaultBranch);
            console.log('已推送 LFS 配置更新到远程仓库');
        }
    });
};
