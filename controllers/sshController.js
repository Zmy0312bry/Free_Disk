const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const os = require('os');

// 检查和配置SSH config文件
const checkAndConfigureSSHConfig = async () => {
    const sshPath = path.join(os.homedir(), '.ssh');
    const configPath = path.join(sshPath, 'config');
    // 使用path.join生成平台无关的路径，并处理Windows反斜杠转义
    const keyPath = path.join(sshPath, 'gitee_id_rsa').replace(/\\/g, '\\\\');
    const giteeConfig = `# gitee
Host gitee.com
HostName gitee.com
PreferredAuthentications publickey
IdentityFile ${keyPath}`;

    // 确保.ssh目录存在
    if (!fs.existsSync(sshPath)) {
        console.log('创建.ssh目录');
        fs.mkdirSync(sshPath, { mode: 0o700 });
    }

    // 检查config文件是否存在
    if (!fs.existsSync(configPath)) {
        console.log('创建SSH config文件');
        fs.writeFileSync(configPath, giteeConfig, { mode: 0o600 });
        console.log('SSH config文件已创建并配置');
        return;
    }

    // 如果config文件存在，检查是否包含gitee配置
    const configContent = fs.readFileSync(configPath, 'utf8');
    if (!configContent.includes('Host gitee.com')) {
        console.log('添加gitee配置到现有SSH config文件');
        fs.appendFileSync(configPath, `\n\n${giteeConfig}`);
        console.log('gitee配置已添加到SSH config文件');
    } else {
        console.log('SSH config文件已包含gitee配置');
    }
};

// 获取SSH公钥控制器
exports.getPublicKey = async function(req, res) {
    try {
        const sshPath = path.join(os.homedir(), '.ssh');
        const keyPath = path.join(sshPath, 'gitee_id_rsa.pub');

        // 检查公钥文件是否存在
        if (!fs.existsSync(keyPath)) {
            return res.status(404).json({
                success: false,
                message: '公钥文件不存在，请先生成SSH密钥'
            });
        }

        // 读取公钥文件
        const publicKey = fs.readFileSync(keyPath, 'utf8');

        // 设置响应头，使浏览器下载文件
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', 'attachment; filename=gitee_id_rsa.pub');

        // 发送文件内容
        res.send(publicKey);
    } catch (error) {
        console.error('获取公钥文件失败:', error);
        res.status(500).json({
            success: false,
            message: '获取公钥文件失败',
            error: error.message
        });
    }
};

// 生成SSH密钥控制器
exports.generateSshKey = async function(req, res) {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: '缺少必需的邮箱参数'
            });
        }
        console.log('开始生成SSH密钥，邮箱:', email);

        // 检查和配置SSH config文件
        await checkAndConfigureSSHConfig();

        const sshPath = path.join(os.homedir(), '.ssh');
        const keyPath = path.join(sshPath, 'gitee_id_rsa');

        console.log('SSH目录路径:', sshPath);
        console.log('密钥文件路径:', keyPath);

        // 确保.ssh目录存在
        if (!fs.existsSync(sshPath)) {
            console.log('创建.ssh目录');
            fs.mkdirSync(sshPath, { mode: 0o700 });
        }

        // 执行ssh-keygen命令
        const command = `ssh-keygen -t rsa -C "${email}" -f "${keyPath}" -N ""`;
        console.log('即将执行命令:', command);
        
        exec(command, async (error, stdout, stderr) => {
            console.log('命令执行完成');
            if (stdout) console.log('命令输出:', stdout);
            if (stderr) console.log('命令错误输出:', stderr);
            
            if (error) {
                console.error('SSH密钥生成错误:', error);
                return res.status(500).json({
                    success: false,
                    message: '生成SSH密钥失败',
                    error: error.message,
                    stderr: stderr
                });
            }

            try {
                console.log('开始读取公钥文件');
                // 检查公钥文件是否存在
                const pubKeyPath = `${keyPath}.pub`;
                if (!fs.existsSync(pubKeyPath)) {
                    console.error('公钥文件不存在:', pubKeyPath);
                    return res.status(500).json({
                        success: false,
                        message: '公钥文件未生成'
                    });
                }

                // 读取生成的公钥
                const publicKey = fs.readFileSync(pubKeyPath, 'utf8');
                console.log('成功读取公钥文件');
                
                // 在public目录下创建临时文件夹
                const tempDir = path.join(process.cwd(), 'public\\temp');
                console.log('创建临时目录:', tempDir);
                
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true });
                }

                // 生成唯一的文件名
                const fileName = `gitee_id_rsa_${Date.now()}.pub`;
                const pubFilePath = path.join(tempDir, fileName);
                
                // 将公钥写入新文件
                fs.writeFileSync(pubFilePath, publicKey);
                console.log('公钥已保存到临时文件:', pubFilePath);

                res.json({
                    success: true,
                    message: 'SSH密钥生成成功',
                    publicKey: publicKey,
                    fileUrl: `/public/temp/${fileName}`
                });
            } catch (readError) {
                console.error('读取或保存公钥时出错:', readError);
                res.status(500).json({
                    success: false,
                    message: '无法读取或保存公钥文件',
                    error: readError.message
                });
            }
        });
    } catch (error) {
        console.error('整体处理错误:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
