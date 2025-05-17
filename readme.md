# 白嫖怪网盘后端

## 项目介绍
白嫖怪网盘是一个开源的网盘系统后端项目，旨在提供高效、安全、易用的文件存储和管理服务。本项目专注于构建轻量级但功能完善的网盘解决方案，适合个人和小团队使用。项目基于 Node.js 和 Git 技术栈开发，支持文件版本控制、稀疏检出等高级特性。

## 功能特性

- 🗂️ 文件管理
  - 文件夹创建和管理
  - 文件上传和下载
  - 文件版本控制
  
- 🔧 Git 集成
  - 稀疏检出支持
  - Git LFS 支持
  - 安全的推送机制
  
- 🔐 SSH 密钥管理
  - SSH 密钥生成
  - 公钥获取
  
- ⚙️ 系统配置
  - 仓库路径配置
  - 远程仓库配置
  - 用户信息配置
  - 下载路径配置

## 快速开始

### 系统要求

- Node.js >= 14
- Git >= 2.25.0
- Git LFS（可选，用于大文件存储）

### 安装

```bash
# 克隆项目
git clone https://github.com/yourusername/Free_Disk.git

# 进入项目目录
cd Free_Disk

# 安装依赖
npm install
```

### 配置

项目首次运行前需要进行基础配置：

1. 配置仓库路径
2. 配置远程仓库地址
3. 配置 Git 用户信息
4. 配置下载路径

这些配置可以通过调用相应的 API 接口来完成。

### 运行

```bash
# 开发环境运行
npm run dev

# 生产环境运行
npm start
```

服务将在 http://0.0.0.0:3001 启动

### 调试
项目提供了`Reqable`的调试接口json，路径在**Free-disk.reqable_collection.json**，可以==直接==导入调试，这是[下载链接](https://reqable.com/zh-CN/)，强烈推荐后端使用`Reqable`调试！

## API 文档

### 文件管理接口

#### 创建文件夹
- **POST** `/api/file/folder`
- **功能**：在指定目录下创建新文件夹
- **参数**：
  ```json
  {
    "baseDir": "string",  // 基础目录路径（可选）
    "folderName": "string"  // 要创建的文件夹名称（必需）
  }
  ```
- **返回示例**：
  ```json
  {
    "success": true,
    "path": "/path/to/new/folder"
  }
  ```

#### 复制文件到安装目录
- **POST** `/api/file/copy-to-install`
- **功能**：将文件从仓库复制到安装目录
- **参数**：
  ```json
  {
    "sourcePath": "string"  // 源文件路径（必需）
  }
  ```
- **返回示例**：
  ```json
  {
    "success": true,
    "message": "文件复制完成",
    "sourcePath": "/source/path/file.txt",
    "targetPath": "/install/path/file.txt"
  }
  ```

### Git 相关接口

#### 获取工作空间信息
- **GET** `/api/git/workspace-info`
- **功能**：获取 Git 工作空间的当前状态
- **返回示例**：
  ```json
  {
    "status": "clean",
    "branch": "main",
    "remote": "origin"
  }
  ```

#### 稀疏检出更新
- **POST** `/api/git/sparse-pull`
- **功能**：执行稀疏检出的更新操作
- **参数**：
  ```json
  {
    "paths": ["path1", "path2"]  // 需要检出的路径列表
  }
  ```

#### 文件上传并推送
- **POST** `/api/git/upload-and-push`
- **功能**：上传文件并将其推送到 Git 仓库
- **参数**：
  - `file`：文件（multipart/form-data）
  - `path`：目标路径
- **限制**：文件大小限制为 50MB

#### Git LFS 初始化
- **POST** `/api/git/lfs-update`
- **功能**：初始化或更新 Git LFS 配置

### SSH 管理接口

#### 生成 SSH 密钥
- **POST** `/api/ssh/generate-key`
- **功能**：生成新的 SSH 密钥对

#### 获取 SSH 公钥
- **GET** `/api/ssh/get-key`
- **功能**：获取当前的 SSH 公钥

### 初始化配置接口

#### 获取配置信息
- **GET** `/api/init/config`
- **功能**：获取当前系统配置

#### 更新仓库路径
- **POST** `/api/init/config/repo-path`
- **参数**：
  ```json
  {
    "repoPath": "string"  // 新的仓库路径
  }
  ```

#### 更新远程仓库地址
- **POST** `/api/init/config/remote-url`
- **参数**：
  ```json
  {
    "remoteUrl": "string"  // 新的远程仓库地址
  }
  ```

#### 更新用户配置
- **POST** `/api/init/config/user`
- **参数**：
  ```json
  {
    "name": "string",  // Git 用户名
    "email": "string"  // Git 邮箱
  }
  ```

#### 初始化下载路径
- **POST** `/api/init/config/init-install-path`
- **参数**：
  ```json
  {
    "installPath": "string"  // 下载目录路径
  }
  ```

## 错误处理

所有接口在发生错误时会返回统一格式的错误响应：

```json
{
  "success": false,
  "error": "错误描述信息"
}
```

在开发环境中，某些错误响应可能会包含额外的错误堆栈信息：

```json
{
  "success": false,
  "message": "错误描述信息",
  "error": "详细错误堆栈"
}
```

## 参考文献

1. [Git 稀疏检出官方文档](https://git-scm.cn/docs/git-sparse-checkout#Documentation/git-sparse-checkout.txt-codegitsparse-checkoutsetMYDIR1SUBDIR2code)
2. [Git LFS 官方网站](https://git-lfs.com/) - Git Large File Storage 是一个用于版本控制大文件的开源 Git 扩展
3. [simple-git NPM 包](https://www.npmjs.com/package/simple-git) - Node.js 中使用 Git 的工具库


## 实际应用场景
本项目是配合**Free-Disk**前端开发的`node.js`项目,以下为前端调用逻辑的解释
---
### 📦 **初始化流程**（共4步）
```http
POST http://<<HOST>>/init/init-repo
```
▸ 创建并配置代码仓库  
`#仓库初始化 #基础配置`

```http
POST http://<<HOST>>/init/init-pull
```
▸ 设置远程仓库初始化拉取  
`#远程连接 #访问控制`

```http
POST http://<<HOST>>/git/sparse-init-empty
```
▸ 稀疏拉取优化大仓库性能  
`#性能优化 #稀疏拉取节省空间`

```http
POST http://<<HOST>>/git/lfs-update
```
▸ 配置 Git LFS 大文件存储  
`#资源管理 #版本控制`

---

### 📤 **文件上传流程**（共3步）
```http
POST http://<<HOST>>/file/folder
```
▸ 创建目录结构  
`#路径管理 #文件夹操作`

```http
POST http://<<HOST>>/git/upload-and-push
```
▸ 文件上传至指定路径  
`#数据传输 #内容存储`

```http
POST http://<<HOST>>/git/safe-push
```
▸ 本地修改推送到远程仓库  
`#版本同步 #代码提交`

---

### 📥 **文件下载流程**（共2步）
```http
POST http://<<HOST>>/init/config/init-install-path
```
▸ 设置文件保存路径  
`#路径配置 #下载准备`

```http
POST http://<<HOST>>/file/copy-to-install
```
▸ 执行文件复制下载操作  
`#内容获取 #文件传输`

---

### 🔑 **配置管理**（共4步）
```http
POST http://<<HOST>>/ssh/generate-key
```
▸ 生成访问令牌/SSH密钥  
`#安全认证 #密钥管理`

```http
GET http://<<HOST>>/ssh/get-key
```
▸ 获取已生成密钥信息  
`#信息查询 #状态监控`

```http
POST http://<<HOST>>/init/config/remote-url
```
▸ 更新远程仓库url  
`#配置更新 #动态调整`

```http
GET http://<<HOST>>/init/config
```
▸ 获取当前项目配置参数  
`#状态查看 #配置审计`

### 其他
```http
GET http://<<HOST>>/git-tree
```
▸ 获取文件树 
`#便于解析 #获取json格式`

```http
POST http://<<HOST>>/git/sparse-update
POST http://<<HOST>>/git/sparse-pull
```
▸ 稀疏检出逻辑，两个接口要一起`先后使用` 

---
> 💡 建议调用顺序：初始化 → 上传/下载 → 配置管理，各流程间建议间隔5秒以上确保状态同步
