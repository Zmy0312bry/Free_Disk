/**
 * Git配置
 */
const path = require('path');
module.exports = {
    // 远程仓库URL
    remoteUrl: 'git@gitee.com:zhao-mingyuan0312/trytry.git',
    publicDirName: 'public',
    // Git 仓库位置，设置在 public/temp 目录下
    repoPath: path.join('public', 'temp'),
    // 远程仓库名称
    remoteName: 'origin',
    
    // 默认分支
    defaultBranch: 'master',
    
    // 默认提交信息
    defaultCommitMessage: '已更新',
};
