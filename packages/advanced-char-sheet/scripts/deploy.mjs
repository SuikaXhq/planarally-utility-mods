import fs from 'fs';
import path from 'path';

// 1. 读取 mod.toml 获取 tag 和 version
const modTomlPath = path.join(process.cwd(), 'mod.toml');
if (!fs.existsSync(modTomlPath)) {
    console.error("未找到 mod.toml");
    process.exit(1);
}

const modToml = fs.readFileSync(modTomlPath, 'utf8');
const tag = modToml.match(/tag\s*=\s*"(.*)"/)?.[1];
const version = modToml.match(/version\s*=\s*"(.*)"/)?.[1];

if (!tag || !version) {
    console.error("mod.toml 中缺少 tag 或 version");
    process.exit(1);
}

const targetPrefix = `${tag}-${version}-`;

// 2. 确定 PA mods 根目录
const serverModsRoot = path.resolve(process.cwd(), '../../../PlanarAlly/server/static/mods');

if (!fs.existsSync(serverModsRoot)) {
    console.error(`PA mods 目录不存在: ${serverModsRoot}`);
    process.exit(1);
}

// 3. 搜索匹配的带 hash 的目录
const existingDirs = fs.readdirSync(serverModsRoot);
const targetDirName = existingDirs.find(d => d.startsWith(targetPrefix));

if (!targetDirName) {
    console.error(`未在 PA server 中找到以 "${targetPrefix}" 开头的目录。`);
    console.log("请确保你已经在 PA 中通过导入 .pam 文件的方式安装过该 Mod。");
    process.exit(1);
}

const serverStaticModsPath = path.join(serverModsRoot, targetDirName);
console.log(`检测到目标目录: ${targetDirName}`);
console.log(`部署路径: ${serverStaticModsPath}`);

// 4. 复制文件
const filesToCopy = ['index.js', 'index.css'];

for (const file of filesToCopy) {
    const src = path.join(process.cwd(), 'dist', file);
    const dest = path.join(serverStaticModsPath, file);
    
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`Successfully copied ${file} to PA server.`);
    } else {
        if (file === 'index.js') {
            console.warn(`Warning: ${src} 不存在，请确保已经运行了 build。`);
        }
    }
}
