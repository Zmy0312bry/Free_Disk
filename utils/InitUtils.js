const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs');

// 获取JSON配置文件路径
const CONFIG_PATH = path.join(process.cwd(), 'config', 'gitConfig.json');
let cachedConfig = null;

/**
 * 读取JSON配置文件
 * @returns {Object} 完整的配置对象
 */
function readConfigFile() {
    if (!cachedConfig) {
        cachedConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
    return cachedConfig;
}

/**
 * 写入配置并更新缓存
 * @param {Object} config 要写入的配置对象
 */
function writeConfigFile(config) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 4), 'utf8');
    cachedConfig = config; // 更新缓存
}

/**
 * 获取所有Git配置
 * 这是获取配置的主要函数，其他模块应该使用这个函数
 * @returns {Object} 完整的配置对象
 */
exports.getConfig = function() {
    return readConfigFile();
};

/**
 * 获取部分Git配置信息（保持向后兼容）
 * @returns {Object} 配置信息对象的子集
 */
exports.getGitConfig = function() {
    const config = readConfigFile();
    return {
        remoteUrl: config.remoteUrl,
        repoPath: config.repoPath,
        defaultBranch: config.defaultBranch,
        remoteName: config.remoteName
    };
};

/**
 * 更新仓库路径配置
 * @param {string} newRepoPath 新的仓库路径
 */
exports.updateRepoPath = function(newRepoPath) {
    const config = readConfigFile();
    config.repoPath = newRepoPath;
    writeConfigFile(config);
};

/**
 * 更新远程仓库URL配置
 * @param {string} newRemoteUrl 新的远程仓库URL
 * @returns {Promise<void>}
 */
exports.updateRemoteUrl = async function(newRemoteUrl) {
    // 1. 更新配置
    const config = readConfigFile();
    config.remoteUrl = newRemoteUrl;
    writeConfigFile(config);

    // 2. 更新git remote设置
    const git = simpleGit({ baseDir: path.join(process.cwd(), config.repoPath) });
    try {
        // 检查是否已有远程仓库配置
        const remotes = await git.getRemotes();
        const hasRemote = remotes.some(remote => remote.name === config.remoteName);
        
        if (hasRemote) {
            // 如果已存在，先删除再添加
            await git.removeRemote(config.remoteName);
            console.log(`已删除原有远程仓库 ${config.remoteName}`);
        }
        
        // 添加新的远程仓库配置
        await git.addRemote(config.remoteName, newRemoteUrl);
        console.log(`已添加新的远程仓库 ${config.remoteName}: ${newRemoteUrl}`);
    } catch (error) {
        console.error('更新git remote时出错:', error);
        throw error;
    }
};

/**
 * 更新配置文件中的用户信息
 * @param {string} name 用户名
 * @param {string} email 邮箱
 */
const updateConfigFileUser = function(name, email) {
    const config = readConfigFile();
    if (name) {
        config.username = name;
    }
    if (email) {
        config.email = email;
    }
    writeConfigFile(config);
};

/**
 * 配置Git用户信息
 * @param {string} name 用户名
 * @param {string} email 邮箱
 * @returns {Promise<void>}
 */
exports.configureGitUser = async function(name, email) {
    const git = simpleGit();
    
    if (name) {
        await git.addConfig('user.name', name, false, 'global');
    }
    
    if (email) {
        await git.addConfig('user.email', email, false, 'global');
    }

    // 同时更新配置文件
    updateConfigFileUser(name, email);
};

/**
 * 获取当前Git用户配置
 * @returns {Promise<Object>} 包含用户名和邮箱的对象
 */
exports.getCurrentGitUser = async function() {
    const git = simpleGit();
    
    try {
        const name = (await git.raw(['config', '--global', 'user.name'])).trim();
        const email = (await git.raw(['config', '--global', 'user.email'])).trim();
        
        return {
            name,
            email
        };
    } catch (error) {
        return {
            name: '',
            email: ''
        };
    }
};
