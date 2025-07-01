# Electron OJ 客户端

这是一个基于 Electron 的在线判题系统客户端，具有自定义工具栏和域名访问控制功能。

## 项目结构

```
oj-client/
├── main.js                    # 主程序入口
├── package.json              # 项目配置
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
- `Ctrl+←`：后退
- `Ctrl+→`：前进
- `Ctrl+R`：刷新
- `Ctrl+H`：返回主页

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
