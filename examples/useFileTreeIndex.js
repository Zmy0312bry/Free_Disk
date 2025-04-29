/**
 * 文件树索引使用示例
 */

// 假设我们已经从API获取了文件树
const fileTreeResponse = {
  success: true,
  message: '获取文件树成功',
  data: {
    tree: { /* 原始树结构 */ },
    index: { /* 索引树结构 */ }
  }
};

// 从响应中获取索引树
const indexedTree = fileTreeResponse.data.index;

// 示例1: 访问特定文件夹
const folder111 = indexedTree['111'];
console.log('111文件夹内容:', folder111);

// 示例2: 访问嵌套路径
const nestedFile = indexedTree['folder']['subfolder']['file.txt'];
console.log('嵌套文件信息:', nestedFile);

// 示例3: 检查路径是否存在
function pathExists(tree, path) {
  const segments = path.split('/').filter(Boolean);
  let current = tree;
  
  for (const segment of segments) {
    if (!current[segment]) {
      return false;
    }
    current = current[segment];
  }
  
  return true;
}

// 使用方法检查路径
console.log('路径 folder/subfolder 存在:', pathExists(indexedTree, 'folder/subfolder'));
console.log('路径 nonexistent/path 存在:', pathExists(indexedTree, 'nonexistent/path'));
