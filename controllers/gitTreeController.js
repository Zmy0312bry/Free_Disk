const { exec } = require('child_process');
const { buildFileTree } = require('../utils/gitTreeUtils');
const path = require('path');
const gitConfig = require('../config/gitConfig');

/**
 * 获取Git仓库文件树的控制器函数
 * 处理所有业务逻辑，包括之前服务层的功能
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
exports.getGitTree = (req, res) => {
    // 使用配置中的仓库路径，workspace参数与其他接口保持一致
    const workspace = req.query.workspace || '';
    // 使用gitUtils的getRepoPath函数获取仓库路径
    const repoPath = require('../utils/gitUtils').getRepoPath(workspace);
    const branch = req.query.branch || gitConfig.defaultBranch;
    
    exec(`cd ${repoPath} && git ls-tree -r ${branch}`, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ 
                success: false, 
                message: '获取文件树失败', 
                error: error.message 
            });
        }

        if (stderr) {
            return res.status(400).json({ 
                success: false, 
                message: '获取文件树出错', 
                error: stderr 
            });
        }

        try {
            const files = stdout.trim().split('\n').map(line => {
                const [mode, type, hash, path] = line.split(/\s+/);
                return { mode, type, hash, path };
            });

            // 构建可索引的文件树结构
            const fileTree = buildFileTree(files);
            
            // 添加路径索引功能，使fileTree支持按路径访问
            const indexedTree = createIndexedTree(fileTree);
            
            res.json({ 
                success: true, 
                message: '获取文件树成功', 
                data: indexedTree  // 可索引的树结构

            });
        } catch (err) {
            res.status(500).json({ 
                success: false, 
                message: '处理文件树数据失败', 
                error: err.message 
            });
        }
    });
};

/**
 * 创建一个可以通过文件名层次结构访问的文件树
 * @param {Object} originalTree - 原始文件树结构
 * @return {Object} 可索引的文件树
 */
function createIndexedTree(originalTree) {
    // 递归处理文件树，构建索引
    function processNode(node) {
        const result = {};
        
        if (node.children && node.children.length > 0) {
            // 遍历所有子节点
            for (const child of node.children) {
                if (child.type === 'folder') {
                    // 如果是文件夹，递归处理并添加到结果中
                    result[child.name] = processNode(child);
                } else {
                    // 如果是文件，只添加文件名作为键，值为空对象
                    result[child.name] = {};
                }
            }
        }
        
        return result;
    }
    
    // 从根目录开始构建索引
    return {
        'root': processNode(originalTree)
    };
}
