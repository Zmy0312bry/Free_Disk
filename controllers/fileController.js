const fileUtils = require("../utils/fileUtils");
const path = require("path");
const fs = require("fs-extra");
const sparseCheckoutUtils = require("../utils/sparseCheckoutUtils");
const gitUtils = require("../utils/gitUtils");
const { getConfig } = require("../utils/InitUtils");
const simpleGit = require("simple-git");

/**
 * 创建文件夹控制器
 * @param {Object} req Express请求对象
 * @param {Object} res Express响应对象
 */
exports.createFolder = async (req, res) => {
  try {
    const { baseDir, folderName } = req.body;

    if (!folderName) {
      return res.status(400).json({
        success: false,
        error: "缺少必要参数：folderName（文件夹名称）",
      });
    }

    // 获取配置信息以确定仓库根目录
    const config = getConfig();
    const repoRootDir = path.join(process.cwd(), config.repoPath);

    // 如果提供了baseDir，将其添加到仓库根目录路径中
    const fullBaseDir = baseDir ? path.join(repoRootDir, baseDir) : repoRootDir;

    // 清理和规范化路径
    const cleanBaseDir = path.resolve(fullBaseDir);
    const cleanFolderName = path
      .normalize(folderName)
      .replace(/^(\.\.(\/|\\|$))+/, "");

    const result = await fileUtils.createFolder(cleanBaseDir, cleanFolderName);

    if (result.success) {
      // 创建 .myignore 空文件，确保文件夹能被 Git 追踪
      const ignorePath = path.join(result.path, ".myignore");
      try {
        await fs.writeFile(ignorePath, "");
        console.log(`已创建 .myignore 文件: ${ignorePath}`);
      } catch (fileError) {
        console.error("创建 .myignore 文件失败:", fileError);
        // 即使 .myignore 创建失败，也继续执行 Git 操作
      }
      // Git 操作：提交和推送更改
      try {
        await gitUtils.commitAllChanges(`创建文件夹: ${cleanFolderName}`);
        await gitUtils.pushChanges(config.remoteName, config.defaultBranch);
      } catch (gitError) {
        console.error("Git操作失败:", gitError);
        // 即使git操作失败也返回成功,因为文件夹已经创建成功
      }

      res.json({
        success: true,
        path: result.path,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `服务器错误：${error.message}`,
    });
  }
};

/**
 * 复制文件到安装目录
 * @param {Object} req - HTTP请求对象
 * @param {Object} res - HTTP响应对象
 */
exports.copyFileToInstall = async function (req, res) {
  try {
    const { sourcePath } = req.body;

    if (!sourcePath) {
      return res.status(400).json({
        success: false,
        message: "缺少必需的参数 sourcePath",
      });
    }

    const config = getConfig();

    // 1. 获取文件父目录路径
    let parentDir = path.dirname(sourcePath);

    // 处理根目录的情况 - 如果父目录是 / 或 .，则设置为空字符串
    if (parentDir === "/" || parentDir === ".") {
      parentDir = "";
      console.log("文件位于根目录，设置父目录为空");
    }

    // 2. 执行稀疏检出操作
    await sparseCheckoutUtils.sparseUpdate(parentDir);

    // 3. 重新应用稀疏检出配置
    const git = simpleGit({
      baseDir: path.join(process.cwd(), config.repoPath),
    });
    await git.raw(["sparse-checkout", "reapply"]);
    console.log("已重新应用稀疏检出配置");

    // 4. 执行 pull 同步
    await gitUtils.pull(config.remoteName, config.defaultBranch, parentDir);

    // 5. 复制文件到安装目录
    const sourceFilePath = path.join(
      process.cwd(),
      config.repoPath,
      sourcePath
    );
    const targetDir = config.installPath;
    const targetFilePath = path.join(targetDir, path.basename(sourcePath));

    // 确保目标目录存在
    await fs.ensureDir(targetDir);

    // 复制文件
    await fs.copy(sourceFilePath, targetFilePath, { overwrite: true });

    res.json({
      success: true,
      message: "文件复制完成",
      sourcePath,
      targetPath: targetFilePath,
    });
  } catch (error) {
    console.error("文件复制错误:", error);
    res.status(500).json({
      success: false,
      message: `文件复制失败: ${error.message}`,
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

/**
 * 删除文件或文件夹
 * @param {Object} req - HTTP请求对象
 * @param {Object} res - HTTP响应对象
 */
exports.deleteFileOrFolder = async function (req, res) {
  try {
    const { path: itemPath } = req.body;

    if (!itemPath) {
      return res.status(400).json({
        success: false,
        message: "缺少必需的参数 path",
      });
    }

    const config = getConfig();
    const repoRootDir = path.join(process.cwd(), config.repoPath);
    const fullPath = path.join(repoRootDir, itemPath);
    const git = simpleGit({ baseDir: repoRootDir });

    // 1. 获取文件或文件夹的父目录路径
    let parentDir = path.dirname(itemPath);

    // 处理根目录的情况
    if (parentDir === "/" || parentDir === ".") {
      parentDir = "";
      console.log("项目位于根目录，设置父目录为空");
    }

    // 3. 执行 pull 同步，确保操作最新代码
    await gitUtils.pull(config.remoteName, config.defaultBranch, parentDir);

    // 4. 检查路径是否存在
    const exists = await fs.pathExists(fullPath);
    if (!exists) {
      return res.status(404).json({
        success: false,
        message: "指定的文件或文件夹不存在",
      });
    }

    // 5. 检查是文件还是文件夹
    const stats = await fs.stat(fullPath);
    const isDirectory = stats.isDirectory();

    // 6. 删除文件或文件夹
    if (isDirectory) {
      await fs.remove(fullPath); // 递归删除文件夹及其内容
      console.log(`已删除文件夹: ${fullPath}`);
    } else {
      await fs.unlink(fullPath); // 删除文件
      console.log(`已删除文件: ${fullPath}`);
    }

    // 7. Git 操作：提交和推送更改
    try {
      const entityType = isDirectory ? "文件夹" : "文件";
      const fileName = path.basename(itemPath);
      await gitUtils.commitAllChanges(`删除${entityType}: ${fileName}`);
      // 执行push操作
      // 执行pull操作
      const pullResult = await git.pull(
        config.remoteName,
        config.defaultBranch
      );
      console.log("拉取操作结果:", JSON.stringify(pullResult, null, 2));

      // 先执行add操作
      await git.add(".");
      console.log("已添加所有更改到暂存区");

      // 执行commit操作
      await git.commit(config.defaultCommitMessage);
      console.log("已提交更改");
      const pushResult = await git.push(
        config.remoteName,
        config.defaultBranch
      );
      console.log("推送操作结果:", JSON.stringify(pushResult, null, 2));
    } catch (gitError) {
      console.error("Git操作失败:", gitError);
      // 即使git操作失败也返回成功,因为文件/文件夹已经删除成功
    }

    res.json({
      success: true,
      message: `成功删除${isDirectory ? "文件夹" : "文件"}`,
      path: itemPath,
    });
  } catch (error) {
    console.error("删除文件或文件夹错误:", error);
    res.status(500).json({
      success: false,
      message: `删除失败: ${error.message}`,
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};
