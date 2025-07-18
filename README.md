# SDUT OJ 竞赛客户端

SDUT OJ 竞赛客户端是一个基于 Electron 的专业在线评测系统客户端应用程序，专为 SDUT ACM 算法竞赛环境设计，提供安全、稳定、功能完整的比赛环境。

## 🏆 核心特性

- **🔧 智能工具栏** - 基于 BrowserView 的独立工具栏，支持后退、前进、刷新、主页、系统信息等完整操作
- **🎨 主题自适应** - 本地 SVG 图标，完美支持系统亮色/暗色主题自动切换
- **⌨️ 跨平台快捷键** - Windows、macOS、Linux 全平台快捷键支持，操作体验统一
- **🔒 域名安全控制** - 内置智能白名单/黑名单机制，确保比赛环境安全纯净
- **🪟 智能弹窗管理** - 完善的新窗口导航栏，支持排行榜等外部链接的安全访问
- **🛡️ 开发者工具禁用** - 全面禁用开发者工具和调试功能，确保比赛公平性
- **🌍 User-Agent 标识** - 统一的客户端标识，便于服务器识别和统计
- **📱 响应式设计** - 适配不同屏幕尺寸，提供一致的用户体验
- **💬 友好提示系统** - 可爱的域名拦截提示，提升用户体验

## 🚀 系统要求

- **操作系统**: Windows 10+、macOS 10.14+、Linux (Ubuntu 18.04+)
- **Node.js**: 16.0.0 或更高版本
- **内存**: 建议 4GB RAM 或以上
- **存储**: 至少 200MB 可用磁盘空间
- **网络**: 稳定的互联网连接

## 📦 安装和运行

### 快速开始

1. **克隆项目**
   ```bash
   git clone https://github.com/ATRIOR-LCL/oj-competition-side-client.git
   cd oj-competition-side-client
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动应用**
   ```bash
   npm start
   ```

## ⌨️ 快捷键支持

| 功能 | Windows/Linux | macOS | 说明 |
|------|---------------|-------|------|
| 后退 | Alt + ← | Cmd + ← | 返回上一页 |
| 前进 | Alt + → | Cmd + → | 前进到下一页 |
| 刷新 | F5 / Ctrl + R | Cmd + R | 刷新当前页面 |
| 主页 | Alt + H | Cmd + H | 返回 OJ 主页 |
| 系统信息 | Alt + I | Cmd + I | 显示系统信息弹窗 |

## 📁 项目结构

```
oj-competition-side-client/
├── main.js                   # 主进程入口文件
├── package.json              # 项目配置和依赖
├── public/                   # 静态资源目录
│   ├── favicon.ico          # Windows/macOS 图标
│   ├── favicon.png          # Linux 图标
│   └── svg/                 # SVG 图标集合
│       ├── back.svg         # 后退图标
│       ├── forward.svg      # 前进图标
│       ├── refresh.svg      # 刷新图标
│       ├── home.svg         # 主页图标
│       └── info.svg         # 信息图标
└── utils/                   # 工具模块目录
    ├── ToolbarManager.js    # 工具栏管理器
    ├── ContentViewManager.js # 内容视图管理器
    ├── ShortcutManager.js   # 快捷键管理器
    ├── windowHelper.js      # 窗口工具助手
    ├── urlHelper.js         # URL 处理工具
    ├── dialogHelper.js      # 对话框工具
    └── platformHelper.js    # 平台兼容工具
```

## 🏗️ 技术架构

### 核心模块

#### 1. **ToolbarManager** - 工具栏管理器
- 创建独立的 BrowserView 工具栏层
- 处理本地 SVG 图标渲染和主题适配
- 管理工具栏按钮事件和状态
- 实现工具栏动画和视觉反馈

#### 2. **ContentViewManager** - 内容视图管理器
- 创建和管理网页内容视图
- 实现导航拦截和安全控制
- 处理域名白名单/黑名单逻辑
- 管理页面加载状态和错误处理

#### 3. **ShortcutManager** - 快捷键管理器
- 注册跨平台全局快捷键
- 处理键盘事件和工具栏动作映射
- 管理快捷键冲突和优先级
- 支持动态快捷键禁用/启用

#### 4. **windowHelper** - 窗口工具助手
- 创建和管理应用窗口
- 处理新窗口的导航栏创建
- 管理窗口布局和大小调整
- 实现窗口间通信和状态同步

#### 5. **dialogHelper** - 对话框工具
- 显示域名拦截的友好提示对话框
- 创建系统信息弹窗（包含版本信息和相关链接）
- 处理外部链接的安全打开
- 管理弹窗样式和主题适配

#### 6. **urlHelper** - URL 处理工具
- 实现域名白名单/黑名单检查
- 处理 URL 重定向和安全验证
- 管理主域名和子域名的访问控制

#### 7. **platformHelper** - 平台兼容工具
- 处理跨平台的文件路径问题
- 管理不同操作系统的特定配置
- 提供统一的平台检测接口

### 🎯 架构特点

- **模块化设计** - 功能完全分离，代码结构清晰，易于维护和扩展
- **BrowserView 架构** - 工具栏与网页内容完全独立，避免页面刷新影响
- **主题自适应** - 自动检测系统主题变化，实时更新图标和样式
- **安全优先** - 多层安全控制，从 URL 过滤到开发者工具禁用
- **跨平台兼容** - 完善的平台检测和适配，确保各系统一致体验
- **错误处理** - 完善的异常捕获和静默处理，提高应用稳定性

## 🔧 核心功能

### 🎨 自定义工具栏
- 使用 BrowserView 实现的独立工具栏层，页面刷新时保持固定
- 本地 SVG 图标渲染，支持无限缩放和主题切换
- 智能按钮状态管理（前进/后退可用性检查）
- 流畅的悬停动画和点击反馈效果

### 🚀 智能导航系统
- 完整的浏览器导航功能（后退、前进、刷新、主页）
- 导航历史管理和状态同步
- 智能页面加载检测和错误处理
- 支持新窗口的完整导航栏创建

### 🔒 安全域名控制
- **白名单机制** - 允许特定域名在新窗口安全打开
- **黑名单机制** - 明确禁止高风险域名的访问
- **主域名控制** - 限制主窗口只能访问指定的 OJ 域名
- **友好提示** - 可爱的拦截提示，提升用户体验

### 🛡️ 开发者工具禁用
- 全面禁用 F12、Ctrl+Shift+I 等开发者工具快捷键
- 禁用右键上下文菜单和查看源码功能
- 拦截所有可能的调试和检查途径
- 跨平台兼容的快捷键禁用策略

### 📋 系统信息展示
- 精美的系统信息弹窗，显示 Electron、Node.js、Chromium 版本
- 包含 SDUT OJ 官网和 GitHub 项目链接
- 支持外部浏览器安全打开链接
- 响应式设计，适配不同主题

## ⚙️ 配置说明

在 `main.js` 中修改 `APP_CONFIG` 对象来调整应用行为：

```javascript
const APP_CONFIG = {
  HOME_URL: 'https://op.sdutacm.cn/',
  MAIN_DOMAIN: 'op.sdutacm.cn',
  POPUP_WHITELIST: new Set([
    'rl.algoux.cn',
    'rl.algoux.org',
    'rank.ac',
    'acm.sdut.edu.cn'
  ]),
  BLOCKED_DOMAINS: new Set([
    'oj.sdutacm.cn'
  ])
};
```

## 🌍 跨平台兼容性

### Windows 特有优化
- ✅ 使用 `favicon.ico` 格式图标，确保最佳显示效果
- ✅ 处理 GPU 进程相关警告，不影响正常使用
- ✅ 优化文件路径处理，避免路径分隔符问题
- ✅ 静默处理 JS 异常，避免系统弹窗干扰

### macOS 特有优化
- ✅ 支持 macOS 特有的快捷键组合（Cmd 键）
- ✅ 使用 `favicon.ico` 确保 Dock 图标显示正确
- ✅ 优化窗口行为，符合 macOS 设计规范
- ✅ 处理 macOS 特有的权限和安全限制

### Linux 特有优化
- ✅ 使用 `favicon.png` 格式，支持透明度和高清显示
- ✅ 适配各种 Linux 发行版的窗口管理器
- ✅ 优化字体渲染和界面显示效果

## 🏷️ 关键词标签

`ACM竞赛` `在线评测` `SDUT` `算法竞赛` `编程竞赛` `OJ客户端` `Electron应用` `比赛环境` `ICPC` `程序设计竞赛` `山东理工大学` `竞赛系统` `安全浏览器` `跨平台应用`

## 📝 开发说明

### 开发环境搭建
```bash
# 安装依赖
npm install

# 启动开发模式
npm start

# 运行测试（如果有）
npm test
```

## 📧 联系方式

- **项目主页**: [GitHub Repository](https://github.com/ATRIOR-LCL/oj-competition-side-client)
- **SDUT OJ**: [https://op.sdutacm.cn/](https://op.sdutacm.cn/)
- **问题反馈**: 请在 GitHub Issues 中提交问题和建议

---

**© 2008-2025 SDUTACM. All Rights Reserved.**
