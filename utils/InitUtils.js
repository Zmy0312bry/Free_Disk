const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs');
const gitConfig = require('../config/gitConfig');

/**
 * 获取Git配置信息
 * @returns {Object} 配置信息对象
 */
exports.getGitConfig = function() {
    return {
        remoteUrl: gitConfig.remoteUrl,
        repoPath: gitConfig.repoPath,
        defaultBranch: gitConfig.defaultBranch,
        remoteName: gitConfig.remoteName
    };
};

/**
 * 更新仓库路径配置
 * @param {string} newRepoPath 新的仓库路径
 */
exports.updateRepoPath = function(newRepoPath) {
    const configPath = path.join(process.cwd(), 'config\\gitConfig.js');
    let content = fs.readFileSync(configPath, 'utf8');
    
    // 使用正则表达式更新repoPath配置
    content = content.replace(
        /repoPath:\s*path\.join\([^)]+\)/,
        `repoPath: path.join('${newRepoPath}')`
    );
    
    fs.writeFileSync(configPath, content, 'utf8');
};

/**
 * 更新远程仓库URL配置
 * @param {string} newRemoteUrl 新的远程仓库URL
 */
exports.updateRemoteUrl = function(newRemoteUrl) {
    const configPath = path.join(process.cwd(), 'config\\gitConfig.js');
    let content = fs.readFileSync(configPath, 'utf8');
    
    // 使用正则表达式更新remoteUrl配置
    content = content.replace(
        /remoteUrl:\s*'[^']+'/,
        `remoteUrl: '${newRemoteUrl}'`
    );
    
    fs.writeFileSync(configPath, content, 'utf8');
};

/**
 * 更新配置文件中的用户信息
 * @param {string} name 用户名
 * @param {string} email 邮箱
 */
const updateConfigFileUser = function(name, email) {
    const configPath = path.join(process.cwd(), 'config\\gitConfig.js');
    let content = fs.readFileSync(configPath, 'utf8');
    
    if (name) {
        content = content.replace(
            /username:\s*'[^']*'/,
            `username: '${name}'`
        );
    }
    
    if (email) {
        content = content.replace(
            /email:\s*'[^']*'/,
            `email: '${email}'`
        );
    }
    
    fs.writeFileSync(configPath, content, 'utf8');
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
