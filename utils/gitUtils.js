const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs');

// 初始化 Git 实例
const git = simpleGit();

/**
 * 检查Git仓库是否已初始化
 * @returns {Promise<boolean>} 是否已初始化
 */
exports.checkGitInitialized = async function() {
    const isInitialized = fs.existsSync(path.join(process.cwd(), '.git'));
    if (!isInitialized) {
        await git.init();
        console.log('Git 仓库已初始化');
    }
    return true;
};

/**
 * 设置或更新远程仓库地址
 * @param {string} remoteName 远程仓库名称
 * @param {string} remoteUrl 远程仓库URL
 */
exports.setupRemoteRepository = async function(remoteName, remoteUrl) {
    const remotes = await git.getRemotes();
    const hasRemote = remotes.some(remote => remote.name === remoteName);
    
    if (!hasRemote) {
        await git.addRemote(remoteName, remoteUrl);
        console.log(`已添加远程仓库 ${remoteName}: ${remoteUrl}`);
        return;
    }
    
    // 检查现有远程仓库URL是否匹配
    const remoteData = await git.remote(['get-url', remoteName]);
    const currentUrl = remoteData.trim();
    
    if (currentUrl !== remoteUrl) {
        await git.removeRemote(remoteName);
        await git.addRemote(remoteName, remoteUrl);
        console.log(`远程仓库地址已更新为: ${remoteUrl}`);
    }
};

/**
 * 提交文件更改
 * @param {string} filePath 文件路径
 * @param {string} message 提交信息
 */
exports.commitChanges = async function(filePath, message) {
    await git.add(filePath);
    const status = await git.status();
    if (status.not_added.length > 0 || status.modified.length > 0) {
        await git.commit(message);
        console.log(`已提交更改: ${message}`);
    }
};

/**
 * 推送更改到远程仓库
 * @param {string} remoteName 远程仓库名称
 * @param {string} branch 分支名称
 */
exports.pushChanges = async function(remoteName, branch) {
    try {
        await git.push(remoteName, branch);
        console.log(`已成功推送到 ${remoteName}/${branch}`);
    } catch (pushError) {
        if (pushError.message.includes('src refspec master does not match any')) {
            await git.checkoutLocalBranch(branch);
            await git.push(remoteName, branch, ['--set-upstream']);
            console.log(`创建并推送新分支 ${branch}`);
        } else {
            throw pushError;
        }
    }
};
