# OJ Client - Online Judge 客户端

一个基于 Electron 的在线评测系统客户端应用程序，专为访问 op.sdutacm.cn 而设计。

## 功能特性

- � 专用浏览器界面，针对 OJ 系统优化
- 🔧 自定义工具栏，支持后退、前进、刷新、主页等操作
- ⌨️ 跨平台快捷键支持
- 🔒 安全的域名白名单和黑名单机制
- 🪟 支持弹出窗口管理
- 📱 响应式布局

## 系统要求

- Windows 10 或更高版本
- Node.js 16.0.0 或更高版本
- npm 或 yarn 包管理器

## 安装和运行

### 快速开始

1. **克隆或下载项目**
   ```bash
   git clone <repository-url>
   cd oj-client
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动应用**
   ```bash
   npm start
   ```

## 快捷键

| 操作 | Windows | macOS | Linux |
|------|---------|-------|-------|
| 后退 | Alt + ← | Cmd + ← | Alt + ← |
| 前进 | Alt + → | Cmd + → | Alt + → |
| 刷新 | F5 | Cmd + R | Ctrl + R |
| 主页 | Alt + H | Cmd + H | Alt + H |

## 跨平台兼容性

本项目已经过跨平台兼容性优化：

### Windows 特有问题及解决方案

1. **路径分隔符问题**
   - ✅ 使用 `path.join()` 和 `PlatformHelper` 确保路径兼容性

2. **GPU 进程错误**
   - ✅ 添加了 Windows 特定的启动参数来解决 GPU 相关错误
   - ✅ 这些错误不影响应用正常运行

3. **文件编码问题**
   - ✅ 使用 UTF-8 编码读取所有文件

4. **API 兼容性**
   - ✅ 支持新旧版本的 Electron navigation API
├── public/                    # 静态资源
│   └── svg/                   # SVG 图标文件
│       ├── back.svg          # 后退图标
│       ├── forward.svg       # 前进图标
│       ├── refresh.svg       # 刷新图标
│       └── home.svg          # 主页图标
└── utils/                     # 工具模块
    ├── ToolbarManager.js     # 工具栏管理器
    ├── ContentViewManager.js # 内容视图管理器
    ├── ShortcutManager.js    # 快捷键管理器
    ├── windowHelper.js       # 窗口工具
    ├── urlHelper.js          # URL 处理工具
    └── dialogHelper.js       # 对话框工具
```

## 功能特性

### 🎨 自定义工具栏
- 使用 BrowserView 实现独立的工具栏层
- SVG 图标，支持亮色/暗色主题
- 工具栏在页面刷新时保持固定不动

### 🚀 导航功能
- 后退/前进按钮（带历史检查）
- 刷新按钮
- 主页按钮
- 全局快捷键支持

### 🔒 域名访问控制
- 白名单机制：允许特定域名在新窗口打开
- 黑名单机制：明确禁止特定域名访问
- 主域名：允许在主窗口内导航

### ⌨️ 快捷键
- `Alt+←`：后退
- `Alt+→`：前进
- `Alt+R`：刷新
- `Alt+H`：返回主页

## 技术架构

### 主要模块

1. **ToolbarManager** - 工具栏管理
   - 创建独立的工具栏视图
   - 处理 SVG 图标渲染
   - 管理工具栏事件

2. **ContentViewManager** - 内容视图管理
   - 创建网页内容视图
   - 处理导航拦截
   - 实现域名访问控制

3. **ShortcutManager** - 快捷键管理
   - 注册全局快捷键
   - 处理工具栏动作
   - 管理导航操作

4. **LayoutManager** - 布局管理
   - 管理视图布局
   - 处理窗口大小变化
   - 自动调整视图位置

### 技术特点

- **模块化设计**：功能分离，代码易维护
- **BrowserView 架构**：工具栏与内容完全分离
- **主题适配**：自动检测系统主题
- **错误处理**：完善的错误处理机制

## 启动应用

```bash
npm start
```

## 配置

在 `main.js` 中修改 `APP_CONFIG` 对象来调整应用配置：

```javascript
const APP_CONFIG = {
  HOME_URL: 'https://op.sdutacm.cn/',
  MAIN_DOMAIN: 'op.sdutacm.cn',
  POPUP_WHITELIST: new Set([...]),
  BLOCKED_DOMAINS: new Set([...])
};
```
