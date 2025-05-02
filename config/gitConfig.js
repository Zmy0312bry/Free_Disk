/**
 * Git配置
 */
const path = require('path');
module.exports = {
    // 远程仓库URL
    remoteUrl: 'git@gitee.com:zhao-mingyuan0312/trytry.git',
    publicDirName: 'public',
    // Git 仓库位置，使用公共目录下的temp作为标准路径
    repoPath: path.join('test'),
    // 远程仓库名称
    remoteName: 'origin',
    
    // 默认分支
    defaultBranch: 'master',
    
    // 默认提交信息
    defaultCommitMessage: '已更新',
};
