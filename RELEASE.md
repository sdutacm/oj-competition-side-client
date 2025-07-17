# 🎉 SDUT OJ 竞赛客户端 v1.0.0 发布包

## 📦 生成的安装包

### ✅ 已成功生成：

1. **Linux DEB 包** 
   - 📁 `out/make/deb/x64/sdut-oj-contest-client_1.0.0_amd64.deb`
   - 📊 大小：75MB
   - 🎯 目标：Ubuntu/Debian 系统

2. **Linux ZIP 包**
   - 📁 `out/make/zip/linux/x64/SDUT OJ 竞赛客户端-linux-x64-1.0.0.zip`
   - 📊 大小：97MB
   - 🎯 目标：所有 Linux 发行版（便携版）

## 🔧 构建配置

### 应用信息
- **名称**：SDUT OJ 竞赛客户端
- **版本**：1.0.0
- **应用ID**：com.sdutacm.oj.client
- **类别**：Education
- **维护者**：SDUTACM

### 图标配置
- **Linux**：favicon.png
- **Windows**：favicon.ico
- **macOS**：favicon.icns

### 技术架构
- **Electron**：27.3.11
- **Node.js**：18.19.1
- **Chromium**：130.0.6723.131
- **V8**：13.0.245.12

## 🌐 跨平台构建说明

### 为其他平台构建

#### Windows 系统
```bash
# 在 Windows 上运行
npm install
npm run make
```
生成文件：
- `out/make/squirrel.windows/x64/` - Windows 安装程序
- `out/make/zip/win32/x64/` - Windows ZIP 包

#### macOS 系统
```bash
# 在 macOS 上运行
npm install
npm run make
```
生成文件：
- `out/make/zip/darwin/x64/` - macOS ZIP 包

## 📋 功能特性

### ✅ 核心功能
- 专业在线评测系统客户端
- 本地 SVG 工具栏（后退、前进、刷新、首页、信息）
- 亮/暗主题自适应
- 域名白名单/黑名单管理
- 弹窗提示系统

### ✅ 技术特性
- 开发者工具全面禁用
- 自定义 User-Agent 标识
- 跨平台兼容性
- 模块化代码架构
- 平台特定优化

### ✅ 用户体验
- 无原生菜单栏
- 无滚动条
- 工具栏状态管理
- 快捷键支持
- 系统信息显示

## 🚀 安装说明

### Linux DEB 包
```bash
sudo dpkg -i sdut-oj-contest-client_1.0.0_amd64.deb
sudo apt-get install -f  # 如果有依赖问题
```

### 便携版 ZIP 包
```bash
unzip "SDUT OJ 竞赛客户端-linux-x64-1.0.0.zip"
cd "SDUT OJ 竞赛客户端-linux-x64"
./sdut-oj-contest-client
```

## 📞 支持信息

- **官网**：https://oj.sdutacm.cn/onlinejudge3/
- **GitHub**：https://github.com/ATRIOR-LCL/oj-client
- **版权**：© 2008-2025 SDUTACM. All Rights Reserved.

---

*构建时间：2025-07-17 21:20*  
*构建系统：Linux x64*  
*Electron Forge 版本：7.8.1*
