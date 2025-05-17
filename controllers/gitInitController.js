const initUtils = require('../utils/InitUtils');

/**
 * 获取Git配置信息
 * @param {Object} req - HTTP请求对象
 * @param {Object} res - HTTP响应对象
 */
exports.getConfig = async function(req, res) {
    try {
        const gitConfig = initUtils.getGitConfig();
        const userConfig = await initUtils.getCurrentGitUser();
        
        res.json({
            success: true,
            config: {
                ...gitConfig,
                user: userConfig
            }
        });
    } catch (error) {
        console.error('获取配置信息错误:', error);
        res.status(500).json({
            success: false,
            message: `获取配置信息失败: ${error.message}`,
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * 更新仓库路径配置
 * @param {Object} req - HTTP请求对象
 * @param {Object} res - HTTP响应对象
 */
exports.updateRepoPath = function(req, res) {
    try {
        const { repoPath } = req.body;
        
        if (!repoPath) {
            return res.status(400).json({
                success: false,
                message: '缺少必需的参数 repoPath'
            });
        }

        initUtils.updateRepoPath(repoPath);
        
        res.json({
            success: true,
            message: '仓库路径更新成功',
            repoPath
        });
    } catch (error) {
        console.error('更新仓库路径错误:', error);
        res.status(500).json({
            success: false,
            message: `更新仓库路径失败: ${error.message}`,
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * 更新远程仓库URL配置
 * @param {Object} req - HTTP请求对象
 * @param {Object} res - HTTP响应对象
 */
exports.updateRemoteUrl = function(req, res) {
    try {
        const { remoteUrl } = req.body;
        
        if (!remoteUrl) {
            return res.status(400).json({
                success: false,
                message: '缺少必需的参数 remoteUrl'
            });
        }

        initUtils.updateRemoteUrl(remoteUrl);
        
        res.json({
            success: true,
            message: '远程仓库URL更新成功',
            remoteUrl
        });
    } catch (error) {
        console.error('更新远程仓库URL错误:', error);
        res.status(500).json({
            success: false,
            message: `更新远程仓库URL失败: ${error.message}`,
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * 更新Git用户配置
 * @param {Object} req - HTTP请求对象
 * @param {Object} res - HTTP响应对象
 */
exports.updateUserConfig = async function(req, res) {
    try {
        const { name, email } = req.body;
        
        if (!name && !email) {
            return res.status(400).json({
                success: false,
                message: '至少需要提供用户名或邮箱中的一个'
            });
        }

        await initUtils.configureGitUser(name, email);
        const currentConfig = await initUtils.getCurrentGitUser();
        
        res.json({
            success: true,
            message: 'Git用户配置更新成功',
            user: currentConfig
        });
    } catch (error) {
        console.error('更新Git用户配置错误:', error);
        res.status(500).json({
            success: false,
            message: `更新Git用户配置失败: ${error.message}`,
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
