/**
 * 文件树索引使用示例
 */

// 假设我们已经从API获取了文件树
const fileTreeResponse = {
    "success": true,
    "message": "获取文件树成功",
    "data": {
      "index": {
        "root": {
          ".gitignore": {},
          "app.js": {},
          "config": {
            "gitConfig.js": {}
          },
          "controllers": {
            "gitController.js": {},
            "gitTreeController.js": {},
            "sshController.js": {}
          },
          "examples": {
            "useFileTreeIndex.js": {}
          },
          "package.json": {},
          "public": {
            "3333.txt": {},
            "hello.txt": {},
            "hello1.txt": {},
            "hello5.txt": {},
            "temp": {
              "gitee_id_rsa_1745845010860.pub": {},
              "id_ed25519_1745311729219.pub": {},
              "id_test_1745312938693.pub": {}
            },
            "this.txt": {}
          },
          "readme.md": {},
          "routes": {
            "git-tree.js": {},
            "git.js": {},
            "index.js": {},
            "ssh.js": {}
          },
          "utils": {
            "fileUtils.js": {},
            "gitTreeUtils.js": {},
            "gitUtils.js": {}
          }
        }
      }
    }
  }

// 从响应中获取索引树
const indexedTree = fileTreeResponse.data.index;
console.log('完整索引数据:', indexedTree);

const root = indexedTree.root.public.temp;
console.log('根目录:', root);

// 提取第一层的所有项目（包括文件和目录）
const firstLevelItems = Object.keys(root);
console.log('第一层所有项目:', firstLevelItems);