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
