/**
 * 构建文件树结构
 * @param {Array} files 文件列表
 * @returns {Object} 文件树结构
 */
exports.buildFileTree = (files) => {
    const root = { name: 'root', type: 'folder', children: [] };

    files.forEach(file => {
        const pathParts = file.path.split('/');
        let currentLevel = root;

        // 循环创建文件夹结构
        pathParts.forEach((part, index) => {
            // 如果是最后一个部分，表示是文件本身
            if (index === pathParts.length - 1) {
                currentLevel.children.push({
                    name: part,
                    type: 'file',
                    mode: file.mode,
                    hash: file.hash
                });
            } else {
                // 如果不是最后一个部分，表示是文件夹
                let folder = currentLevel.children.find(item => item.name === part && item.type === 'folder');
                if (!folder) {
                    folder = { name: part, type: 'folder', children: [] };
                    currentLevel.children.push(folder);
                }
                currentLevel = folder;
            }
        });
    });

    return root;
};
