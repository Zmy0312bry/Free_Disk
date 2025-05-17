const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs');
const { getConfig } = require('./InitUtils');
const { withProtectedWorkingDir } = require('./gitUtils');

/**
 * 初始化稀疏检出配置（默认不检出任何目录）
 * @param {string} workspace 工作区路径，表示仓库内的子文件夹路径
 */
exports.initSparseCheckoutEmpty = async function(workspace) {
    return withProtectedWorkingDir(async () => {
        const config = getConfig();
        const baseRepoPath = path.join(process.cwd(), config.repoPath);
        const git = simpleGit({ baseDir: baseRepoPath });
        const repoPath = baseRepoPath;
        
        // 确保Git仓库已初始化（在根目录）
        if (!fs.existsSync(repoPath)) {
            fs.mkdirSync(repoPath, { recursive: true });
            console.log(`创建仓库目录: ${repoPath}`);
        }
        
        // 检查是否已初始化
        const isInitialized = fs.existsSync(path.join(repoPath, '.git'));
        if (!isInitialized) {
            await git.init();
            console.log(`Git 仓库已在根目录初始化`);
        }
        
        // 启用稀疏检出
        let isSparseCheckoutEnabled = false;
        try {
            const configValue = await git.raw(['config', '--get', 'core.sparseCheckout']);
            isSparseCheckoutEnabled = configValue.trim() === 'true';
        } catch (error) {
            isSparseCheckoutEnabled = false;
        }
        
        if (!isSparseCheckoutEnabled) {
            await git.raw(['config', 'core.sparseCheckout', 'true']);
            console.log('已启用稀疏检出');
        }
        
        // 确保 .git/info 目录存在
        const infoDir = path.join(repoPath, '.git\\info');
        if (!fs.existsSync(infoDir)) {
            fs.mkdirSync(infoDir, { recursive: true });
        }
        
        // 初始化 sparse-checkout 文件
        const sparseFile = path.join(infoDir, 'sparse-checkout\\');
        
        // 初始化时设置为不检出任何目录
        await git.raw(['sparse-checkout', 'set', '--no-cone']);
        console.log('已初始化稀疏检出文件（默认不检出任何目录）');
        
        // 写入 sparse-checkout 文件，设置为不检出任何目录
        fs.writeFileSync(sparseFile, '!/*', 'utf8');
        console.log('已设置稀疏检出配置（不检出任何目录）');
        
        // 重新应用稀疏检出配置
        await git.raw(['sparse-checkout', 'reapply']);
        console.log('已重新应用稀疏检出配置');
    });
};

/**
 * 更新稀疏检出配置
 * @param {string} workspace 工作区路径，表示仓库内的子文件夹路径
 */
exports.sparseUpdate = async function(workspace) {
    return withProtectedWorkingDir(async () => {
        const config = getConfig();
        const baseRepoPath = path.join(process.cwd(), config.repoPath);
        const git = simpleGit({ baseDir: baseRepoPath });
        const repoPath = baseRepoPath;
        
        // 确保Git仓库已初始化（在根目录）
        if (!fs.existsSync(repoPath)) {
            fs.mkdirSync(repoPath, { recursive: true });
            console.log(`创建仓库目录: ${repoPath}`);
        }
        
        // 检查是否已初始化
        const isInitialized = fs.existsSync(path.join(repoPath, '.git'));
        if (!isInitialized) {
            await git.init();
            console.log(`Git 仓库已在根目录初始化`);
        }
        
        // 1. 检查 config 文件下 [core] 下是否有 sparseCheckout = true
        let isSparseCheckoutEnabled = false;
        try {
            const configValue = await git.raw(['config', '--get', 'core.sparseCheckout']);
            isSparseCheckoutEnabled = configValue.trim() === 'true';
        } catch (error) {
            isSparseCheckoutEnabled = false;
        }
        
        if (!isSparseCheckoutEnabled) {
            await git.raw(['config', 'core.sparseCheckout', 'true']);
            console.log(`已启用稀疏检出 (针对路径: ${workspace || '根目录'})`);
        }
        
        // 确保 .git/info 目录存在
        const infoDir = path.join(repoPath, '.git\\info');
        if (!fs.existsSync(infoDir)) {
            fs.mkdirSync(infoDir, { recursive: true });
        }
        
        // 2. 检查 .git/info 下有无 sparse-checkout 文件
        const sparseFile = path.join(infoDir, 'sparse-checkout\\');
        let sparseFileExists = fs.existsSync(sparseFile);
        
        if (!sparseFileExists) {
            // 执行 git sparse-checkout set --no-cone 命令
            await git.raw(['sparse-checkout', 'set', '--no-cone']);
            console.log(`已初始化稀疏检出文件 (针对路径: ${workspace || '根目录'})`);
            sparseFileExists = true;
        }
        
        // 3. 检查 sparse-checkout 文件内容
        let existingContent = '';
        let contentChanged = false;
        
        if (sparseFileExists) {
            existingContent = fs.readFileSync(sparseFile, 'utf8').trim();
        }
        
        // 构建期望的 sparse-checkout 内容
        const expectedLines = workspace ? 
            [`${workspace}/*`, '!/*'] : 
            ['/*'];
        const expectedContent = expectedLines.join('\n');
        
        // 比较现有内容和期望内容
        if (existingContent !== expectedContent) {
            fs.writeFileSync(sparseFile, expectedContent, 'utf8');
            contentChanged = true;
            console.log(`已更新稀疏检出配置 (针对路径: ${workspace || '根目录'})`);
        }
        
        // 返回是否进行了内容更改
        return contentChanged;
    });
};
