const fs = require('fs');
const path = require('path');

/**
 * 验证文件路径是否在指定目录下
 * @param {string} filePath 要验证的文件路径
 * @param {string} baseDir 基础目录
 * @returns {boolean} 是否在指定目录下
 */
exports.validateFilePath = function(fullPath, baseDir) {
    return fullPath.startsWith(baseDir);
};

/**
 * 确保目录存在，如果不存在则创建
 * @param {string} dirPath 目录路径
 */
exports.ensureDirectoryExists = function(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

/**
 * 写入文件内容
 * @param {string} filePath 文件路径
 * @param {string} content 文件内容
 */
exports.writeFileContent = function(filePath, content) {
    fs.writeFileSync(filePath, content, 'utf8');
};


/**
 * 获取文件名
 * @param {string} filePath 文件路径
 * @returns {string} 文件名
 */
exports.getFileName = function(filePath) {
    return path.basename(filePath);
};

const fsPromises = require('fs').promises;

/**
 * 在指定目录下创建新文件夹
 * @param {string} baseDir 基础目录路径
 * @param {string} folderName 要创建的文件夹名称
 * @returns {Promise<{success: boolean, path: string, error: string|null}>} 创建结果
 */
exports.createFolder = async function(baseDir, folderName) {
    try {
        // 构建完整路径
        const fullPath = path.join(baseDir, folderName);
        
        // 验证路径是否在基础目录下
        if (!exports.validateFilePath(fullPath, baseDir)) {
            return {
                success: false,
                path: null,
                error: '无效的文件夹路径：路径必须在指定目录下'
            };
        }

        // 检查文件夹是否已存在
        if (fs.existsSync(fullPath)) {
            return {
                success: false,
                path: null,
                error: '文件夹已存在'
            };
        }

        // 创建文件夹
        await fsPromises.mkdir(fullPath, { recursive: true });

        return {
            success: true,
            path: fullPath,
            error: null
        };
    } catch (error) {
        return {
            success: false,
            path: null,
            error: `创建文件夹失败: ${error.message}`
        };
    }
};


/**
 * 在保护工作目录的情况下执行函数
 * 确保执行完成后恢复到原始工作目录
 * @param {Function} fn 要执行的函数
 * @returns {Promise<any>} 函数的返回值
 */
exports.withProtectedWorkingDir = async function(fn) {
    const originalWorkingDir = process.cwd();
    try {
        return await fn();
    } finally {
        // 无论成功还是失败，都恢复原始工作目录
        if (process.cwd() !== originalWorkingDir) {
            process.chdir(originalWorkingDir);
        }
    }
};

/**
 * 复制文件 - 带工作目录保护
 * @param {string} source - 源文件路径
 * @param {string} target - 目标文件路径
 */
exports.copyFile = async function(source, target) {
    return exports.withProtectedWorkingDir(async () => {
        try {
            await fsPromises.copyFile(source, target);
            console.log(`已复制文件: ${source} -> ${target}`);
        } catch (error) {
            console.error(`复制文件失败: ${error.message}`);
            throw error;
        }
    });
};
