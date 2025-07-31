# SDUT OJ 竞赛客户端

🏆 **专业的在线评测系统客户端** - 为 SDUT ACM 算法竞赛环境量身打造，提供安全、稳定、功能完整的比赛环境。

[![GitHub release](https://img.shields.io/github/v/release/sdutacm/oj-competition-side-client)](https://github.com/sdutacm/oj-competition-side-client/releases)
[![GitHub downloads](https://img.shields.io/github/downloads/sdutacm/oj-competition-side-client/total)](https://github.com/sdutacm/oj-competition-side-client/releases)
[![License](https://img.shields.io/github/license/sdutacm/oj-competition-side-client)](https://github.com/sdutacm/oj-competition-side-client/blob/main/LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](https://github.com/sdutacm/oj-competition-side-client/releases)

## ✨ 核心特性

### 🛡️ 高级安全控制
- **🎯 智能域名拦截** - 内置白名单/黑名单机制，智能拦截非法域名访问
- **🔄 重定向拦截** - 自动检测并拦截恶意重定向，智能回退到安全域名
- **🚫 开发者工具防护** - 彻底禁用开发者工具和调试功能，确保比赛公平性
- **💬 友好拦截提示** - 可爱的随机化拦截提示，提升用户体验

### 🎨 现代化界面
- **🔧 独立工具栏** - 基于 BrowserView 的独立工具栏，支持完整的浏览器操作
- **🎨 主题自适应** - 完美支持系统亮色/暗色主题自动切换
- **📱 响应式设计** - 适配不同屏幕尺寸，提供一致的用户体验
- **🖱️ 智能按钮状态** - 工具栏按钮根据页面状态智能启用/禁用

### ⌨️ 全平台快捷键
- **🌍 跨平台支持** - Windows、macOS、Linux 全平台快捷键支持，操作体验统一
- **🍎 macOS 原生菜单** - macOS 下使用原生应用菜单，支持系统快捷键
- **⚡ 智能焦点检测** - 自动检测输入框焦点，避免快捷键冲突

### 🌍 多平台支持
- **💻 全架构构建** - 支持 x64 和 ARM64 架构（Windows、macOS、Linux）
- **📦 多格式输出** - Windows (安装版/便携版)、macOS (DMG/ZIP)、Linux (AppImage/DEB)
- **🔧 平台优化** - 针对不同平台的特定优化和兼容性处理

## 🚀 快速开始

### 📥 下载安装

#### 官方下载（推荐）
- **GitHub Releases**: [最新版本下载](https://github.com/sdutacm/oj-competition-side-client/releases)
- **SDUT OJ 官网**: [https://oj.sdutacm.cn](https://oj.sdutacm.cn)

#### 系统要求
- **Windows**: Windows 10 (1903) 或更高版本
- **macOS**: macOS 10.14 (Mojave) 或更高版本  
- **Linux**: Ubuntu 18.04+、Debian 10+、CentOS 8+、Fedora 32+ 或其他主流发行版
- **内存**: 建议 4GB RAM 或以上
- **存储**: 至少 200MB 可用磁盘空间

### 📋 安装指南

根据您的操作系统选择对应的安装指南：

| 操作系统 | 安装指南 | 支持格式 |
|---------|---------|---------|
| 🪟 **Windows** | [详细安装指南](docs/install-windows.md) | 安装版 (.exe) / 便携版 |
| 🍎 **macOS** | [详细安装指南](docs/install-macos.md) | DMG / ZIP |
| 🐧 **Linux** | [详细安装指南](docs/install-linux.md) | AppImage / DEB / RPM |

### ⌨️ 快捷键一览

| 功能 | Windows/Linux | macOS | 说明 |
|------|---------------|-------|------|
| 后退 | `Alt + ←` | `Cmd + ←` | 返回上一页 |
| 前进 | `Alt + →` | `Cmd + →` | 前进到下一页 |
| 刷新 | `F5` / `Ctrl + R` | `Cmd + R` | 刷新当前页面 |
| 主页 | `Alt + H` | `Cmd + Shift + H` | 返回竞赛主页 |
| 系统信息 | `Alt + I` | `Cmd + I` | 显示系统信息 |

> 💡 **智能焦点检测**: 当焦点在输入框时，快捷键会自动让位给文本输入，避免操作冲突。

## 🔒 安全机制

### 域名访问控制
- **✅ 允许访问**: `op.sdutacm.cn`（主竞赛平台）
- **✅ 白名单域名**: `rl.algoux.cn`、`rank.ac` 等算法竞赛相关网站
- **❌ 禁止访问**: `oj.sdutacm.cn` 及其他非指定网站

### 智能拦截系统
- **🔄 重定向拦截**: 自动检测页面重定向，拦截非法跳转
- **🎯 弹窗管理**: 只允许白名单域名的安全弹窗
- **🛡️ 开发者工具禁用**: 完全禁用 F12、右键检查等调试功能

## 📁 项目概览

本项目采用模块化架构设计，主要组件包括：

- **主进程控制** - 应用启动、窗口管理、安全控制
- **工具栏系统** - 独立的浏览器工具栏，支持完整导航功能
- **内容视图管理** - 网页内容显示和安全拦截
- **快捷键系统** - 跨平台快捷键支持和智能冲突检测
- **安全控制** - 域名拦截、重定向控制、开发者工具禁用

### 📚 文档结构
```
docs/
├── install-windows.md    # Windows 详细安装指南
├── install-macos.md      # macOS 详细安装指南  
├── install-linux.md      # Linux 详细安装指南
└── developer-guide.md    # 开发者完整指南
```

详细的技术文档请参考 [开发者指南](docs/developer-guide.md)。

## 🆘 常见问题

### Windows 用户
- **安装时提示"可能损害设备"** → 点击"更多信息" → "仍要运行"
- **杀毒软件误报** → 将应用添加到白名单，这是正常的 Electron 应用

### macOS 用户  
- **提示"无法打开，因为来自身份不明的开发者"** → 右键应用选择"打开"，或在"安全性与隐私"中允许
- **应用显示已损坏** → 重新下载安装包，或使用终端移除隔离属性

### Linux 用户
- **AppImage 无法运行** → 确保已安装 FUSE：`sudo apt install fuse`
- **缺少依赖库** → 安装必要的系统库，详见 [Linux 安装指南](docs/install-linux.md)

## 🔗 相关链接

- **🏠 SDUT OJ 主页**: [https://op.sdutacm.cn](https://op.sdutacm.cn)
- **📁 项目仓库**: [GitHub](https://github.com/sdutacm/oj-competition-side-client)
- **📥 下载页面**: [Releases](https://github.com/sdutacm/oj-competition-side-client/releases)
- **🐛 问题反馈**: [Issues](https://github.com/sdutacm/oj-competition-side-client/issues)
- **📖 开发文档**: [开发者指南](docs/developer-guide.md)

## 👨‍💻 开发相关

如果您是开发者，希望参与项目开发或进行二次开发，请参考：

- **📖 [开发者指南](docs/developer-guide.md)** - 完整的开发环境搭建和构建流程
- **🔧 技术栈**: Electron + Node.js + BrowserView API
- **🏗️ 架构设计**: 模块化设计，安全优先
- **📋 贡献指南**: 欢迎提交 Pull Request 和 Issue

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源协议发布。

## 👥 致谢

- **SDUTACM 团队** - 项目发起和维护
- **所有贡献者** - 感谢每一位为项目贡献代码的开发者
- **Electron 社区** - 提供优秀的跨平台应用开发框架

## 📖 使用说明

### 启动应用
安装完成后，双击桌面图标或从应用菜单启动"SDUT OJ Competition Client"。

### 基本操作
1. **浏览比赛页面** - 应用会自动加载竞赛主页
2. **使用工具栏** - 点击工具栏按钮进行页面导航
3. **键盘快捷键** - 使用快捷键快速操作（见上方快捷键表）
4. **安全浏览** - 系统会自动拦截非法网站访问

### 注意事项
- 🔒 应用已禁用开发者工具，确保比赛环境安全
- 🌐 只能访问指定的竞赛相关网站
- ⚡ 遇到拦截提示时，请专注于比赛题目
- 🆘 如有技术问题，请联系竞赛技术支持

## 🔄 更新说明

### 自动更新
应用会在启动时检查更新，如有新版本会提示下载。

### 手动更新
1. 访问 [GitHub Releases](https://github.com/sdutacm/oj-competition-side-client/releases)
2. 下载最新版本的安装包
3. 安装新版本（会自动覆盖旧版本）

## 📞 技术支持

### 常见问题解决
大部分问题可以通过重启应用解决。如果问题持续存在：

1. **📋 查看安装指南** - 根据您的系统查看对应的详细安装指南
2. **🔍 搜索已知问题** - 在 [GitHub Issues](https://github.com/sdutacm/oj-competition-side-client/issues) 中搜索
3. **📝 报告新问题** - 如果问题未被报告，请创建新的 Issue

### 联系方式
- **💬 问题反馈**: [GitHub Issues](https://github.com/sdutacm/oj-competition-side-client/issues)
- **📧 邮件联系**: [sdutwujinhao@gmail.com](mailto:sdutwujinhao@gmail.com)
- **🏠 竞赛官网**: [https://oj.sdutacm.cn](https://oj.sdutacm.cn)

## 📊 项目统计

- ⭐ **Star 数量**: ![GitHub stars](https://img.shields.io/github/stars/sdutacm/oj-competition-side-client)
- 📥 **下载次数**: ![GitHub downloads](https://img.shields.io/github/downloads/sdutacm/oj-competition-side-client/total)
- 🐛 **问题追踪**: ![GitHub issues](https://img.shields.io/github/issues/sdutacm/oj-competition-side-client)
- 🔄 **版本信息**: ![GitHub release](https://img.shields.io/github/v/release/sdutacm/oj-competition-side-client)

---

🏆 **让每一场算法竞赛都公平、安全、专业！**

**© 2008-2025 SDUTACM. All Rights Reserved.**