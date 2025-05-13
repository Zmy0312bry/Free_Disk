/**
 * 工作目录保护工具
 * 提供在执行操作时保护和恢复工作目录的功能
 */

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
            console.log(`已恢复工作目录: ${originalWorkingDir}`);
        }
    }
};
