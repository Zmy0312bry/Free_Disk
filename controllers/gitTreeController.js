const { exec } = require('child_process');
const { buildFileTree } = require('../utils/gitTreeUtils');

/**
 * 获取Git仓库文件树的控制器函数
 * 处理所有业务逻辑，包括之前服务层的功能
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
exports.getGitTree = (req, res) => {
    const repoPath = req.query.path || '.';
    const branch = req.query.branch || 'master';
    
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
                data: {
                    tree: fileTree,     // 原始树结构
                    index: indexedTree  // 可索引的树结构
                }
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
 * 创建一个可以通过路径索引访问的文件树
 * @param {Object} originalTree - 原始文件树结构
 * @return {Object} 可索引的文件树
 */
function createIndexedTree(originalTree) {
    const indexedTree = {};
    
    // 递归处理文件树，构建索引
    function processNode(node, currentPath = '') {
        // 如果是文件，则直接添加到当前路径
        if (node.type === 'blob') {
            setNestedValue(indexedTree, currentPath.split('/').filter(Boolean), node);
            return;
        }
        
        // 如果是目录，处理其子项
        if (node.children) {
            // 为当前目录创建索引节点
            if (currentPath) {
                setNestedValue(indexedTree, currentPath.split('/').filter(Boolean), {...node, children: {}});
            }
            
            // 处理子项
            for (const [childName, childNode] of Object.entries(node.children)) {
                const childPath = currentPath ? `${currentPath}/${childName}` : childName;
                processNode(childNode, childPath);
            }
        }
    }
    
    processNode(originalTree);
    return indexedTree;
}

/**
 * 在嵌套对象中设置值
 * @param {Object} obj - 目标对象
 * @param {Array} path - 路径数组
 * @param {*} value - 要设置的值
 */
function setNestedValue(obj, path, value) {
    if (path.length === 1) {
        obj[path[0]] = value;
        return;
    }
    
    const current = path[0];
    if (!obj[current]) {
        obj[current] = {};
    }
    
    setNestedValue(obj[current], path.slice(1), value);
}
