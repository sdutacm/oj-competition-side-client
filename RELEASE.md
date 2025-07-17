# SDUT OJ Contest Client Release Notes

## Version 1.0.0

### 产品信息
- **产品名称**: SDUTOJContestClient
- **版本**: 1.0.0
- **构建工具**: electron-builder

### 构建产物

#### Windows 平台
- **安装包**: `SDUTOJContestClient_1.0.0_win_x64.exe`
- **架构**: x64
- **类型**: NSIS 安装包

#### macOS 平台
- **Intel 版本**: `SDUTOJContestClient_1.0.0_mac_x64.zip`
- **Apple Silicon 版本**: `SDUTOJContestClient_1.0.0_mac_arm64.zip`
- **架构**: x64 / arm64
- **类型**: ZIP 压缩包

#### Linux 平台
- **AppImage**: `SDUTOJContestClient_1.0.0_linux_x86_64.AppImage`
- **DEB 包**: `SDUTOJContestClient_1.0.0_linux_amd64.deb`
- **架构**: x64
- **类型**: 便携式应用 / Debian 安装包

### 构建命令
```bash
# 构建所有平台
npm run build

# 构建特定平台
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

### 安装说明

#### Windows
1. 下载 `SDUTOJContestClient_1.0.0_win_x64.exe`
2. 双击运行安装程序
3. 按照向导完成安装

#### macOS
1. 下载对应架构的 ZIP 文件
   - Intel Mac: `SDUTOJContestClient_1.0.0_mac_x64.zip`
   - Apple Silicon Mac: `SDUTOJContestClient_1.0.0_mac_arm64.zip`
2. 解压 ZIP 文件
3. 将应用程序拖拽到 Applications 文件夹

#### Linux
**方法一：AppImage（推荐）**
1. 下载 `SDUTOJContestClient_1.0.0_linux_x86_64.AppImage`
2. 添加执行权限：`chmod +x SDUTOJContestClient_1.0.0_linux_x86_64.AppImage`
3. 直接运行：`./SDUTOJContestClient_1.0.0_linux_x86_64.AppImage`

**方法二：DEB 包**
1. 下载 `SDUTOJContestClient_1.0.0_linux_amd64.deb`
2. 安装：`sudo dpkg -i SDUTOJContestClient_1.0.0_linux_amd64.deb`

### 技术规格
- **Electron 版本**: 27.3.11
- **Node.js 版本**: >=16.0.0
- **支持架构**: x64 (Windows/Linux), x64/arm64 (macOS)

### 功能特性
- 本地 SVG 工具栏
- 主题自适应
- 极简系统信息弹窗
- 开发者工具禁用
- 自定义 User-Agent
- 新窗口导航栏
- 官网与 GitHub 链接集成

### 开发者信息
- **开发者**: ATRIOR-LCL
- **邮箱**: sdutwujinhao@gmail.com
- **项目描述**: SDUT OJ 竞赛客户端 - 专业的在线评测系统客户端应用程序