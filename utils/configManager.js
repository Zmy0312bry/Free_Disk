const fs = require('fs');
const path = require('path');
const baseConfig = require('../config/gitConfig');

class ConfigManager {
    constructor() {
        this.config = {...baseConfig};
        this.isDirty = false;
    }

    // 获取配置
    getConfig() {
        return {...this.config};
    }

    // 更新配置并标记为已修改
    updateConfig(key, value) {
        this.config[key] = value;
        this.isDirty = true;
    }

    // 将配置持久化到文件
    persistConfig() {
        if (!this.isDirty) return;

        const configPath = path.join(process.cwd(), 'config', 'gitConfig.js');
        let content = fs.readFileSync(configPath, 'utf8');

        // 更新所有配置项
        Object.entries(this.config).forEach(([key, value]) => {
            const regex = new RegExp(`${key}:\\s*(['"])?[^,\\n}]+(['"])?`);
            const newValue = typeof value === 'string' ? `'${value}'` : value;
            content = content.replace(regex, `${key}: ${newValue}`);
        });

        fs.writeFileSync(configPath, content, 'utf8');
        this.isDirty = false;
    }
}

// 创建单例
const configManager = new ConfigManager();

// 在进程退出时保存配置
process.on('SIGINT', () => {
    configManager.persistConfig();
    process.exit();
});

process.on('SIGTERM', () => {
    configManager.persistConfig();
    process.exit();
});

module.exports = configManager;
