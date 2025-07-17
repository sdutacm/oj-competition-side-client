# 构建和发布指南

## 构建说明

### Windows 构建

1. **使用构建脚本**：
   ```bash
   build.bat
   ```

2. **手动构建**：
   ```bash
   npm install
   npm run make
   ```

### Linux/macOS 构建

1. **使用构建脚本**：
   ```bash
   chmod +x build.sh
   ./build.sh
   ```

2. **手动构建**：
   ```bash
   npm install
   npm run make
   ```

## 构建输出

构建完成后，产物位于 `out/make/` 目录：

### Windows
- **ZIP 包**: `out/make/zip/win32/x64/SDUT OJ Contest Client-win32-x64-1.0.0.zip`
  - 便携版本，无需安装，解压即用
  - 适合绿色软件使用场景

### Linux
- **DEB 包**: `out/make/deb/x64/sdut-oj-contest-client_1.0.0_amd64.deb`
  - 适用于 Ubuntu/Debian 系统
  - 使用 `sudo dpkg -i` 安装
- **ZIP 包**: `out/make/zip/linux/x64/`
  - 便携版本，适合所有 Linux 发行版

### macOS
- **ZIP 包**: `out/make/zip/darwin/x64/`
  - 便携版本，包含 .app 文件

## 安装说明

### Windows 安装

1. **ZIP 包安装**：
   - 下载并解压 ZIP 包
   - 运行 `sdut-oj-contest-client.exe`
   - 可以创建桌面快捷方式

2. **系统要求**：
   - Windows 10 或更高版本
   - x64 架构

### Linux 安装

1. **DEB 包安装**：
   ```bash
   sudo dpkg -i sdut-oj-contest-client_1.0.0_amd64.deb
   sudo apt-get install -f  # 修复依赖问题（如果有）
   ```

2. **ZIP 包安装**：
   ```bash
   unzip sdut-oj-contest-client-linux-x64-1.0.0.zip
   cd sdut-oj-contest-client-linux-x64
   ./sdut-oj-contest-client
   ```

### macOS 安装

1. **ZIP 包安装**：
   - 下载并解压 ZIP 包
   - 将 `.app` 文件拖拽到应用程序文件夹
   - 首次运行需要在安全设置中允许运行

## 故障排除

### Windows 构建问题

1. **Squirrel 构建失败**：
   - 这是已知问题，项目已配置为主要使用 ZIP 包
   - ZIP 包提供了完整的功能

2. **权限问题**：
   - 以管理员身份运行命令提示符
   - 检查杀毒软件是否阻止了构建

### Linux 构建问题

1. **依赖问题**：
   ```bash
   sudo apt-get update
   sudo apt-get install build-essential libnss3-dev libatk-bridge2.0-dev libxss1 libgconf-2-4
   ```

2. **权限问题**：
   ```bash
   chmod +x build.sh
   ```

### macOS 构建问题

1. **Xcode 工具**：
   ```bash
   xcode-select --install
   ```

2. **权限问题**：
   - 确保终端有完全磁盘访问权限

## 开发者说明

### 构建环境

- Node.js 16.0.0 或更高版本
- npm 7.0.0 或更高版本
- Electron 27.x

### 构建工具

- Electron Forge - 用于打包和构建
- @electron-forge/maker-zip - 跨平台 ZIP 包
- @electron-forge/maker-deb - Linux DEB 包

### 自定义构建

可以通过修改 `forge.config.js` 来自定义构建配置：

```javascript
// 添加更多构建目标
makers: [
  {
    name: '@electron-forge/maker-rpm',
    config: {
      // RPM 包配置 (RedHat/CentOS)
    }
  },
  {
    name: '@electron-forge/maker-dmg',
    config: {
      // macOS DMG 包配置
    }
  }
]
```

## 发布流程

1. **版本更新**：
   - 更新 `package.json` 中的 `version` 字段
   - 更新 `forge.config.js` 中的 `appVersion`

2. **构建测试**：
   - 在目标平台上运行构建脚本
   - 测试生成的安装包

3. **发布**：
   - 上传构建产物到 GitHub Releases
   - 更新 README.md 中的下载链接
   - 创建发布说明
