# 开发者指南

本指南面向希望参与项目开发、构建或贡献代码的开发者。

## 开发环境要求

- **Node.js**: 20.0.0 或更高版本
- **npm**: 8.0.0 或更高版本
- **Git**: 任意版本
- **操作系统**: Windows 10+、macOS 10.14+、Linux (Ubuntu 18.04+)

## 快速开始

### 1. 克隆项目
```bash
git clone https://github.com/sdutacm/oj-competition-side-client.git
cd oj-competition-side-client
```

### 2. 安装依赖
```bash
npm install
```

### 3. 启动开发环境
```bash
npm run dev
```

## 开发脚本

| 命令 | 功能 | 说明 |
|------|------|------|
| `npm run dev` | 启动完整开发环境 | 同时启动 Vite `localhost:5173` 和 Electron |
| `npm start` | 启动完整开发环境 | `npm run dev` 的别名 |
| `npm run renderer:dev` | 启动渲染进程 | 只启动 Vue/Vite，可直接访问 `http://127.0.0.1:5173` |
| `npm run electron:dev` | 启动 Electron | 连接已经运行的 `localhost:5173` |
| `npm run renderer:build` | 构建渲染进程 | 输出到 `dist/renderer` |
| `npm run build` | 构建所有平台 | 构建 Windows、macOS、Linux 版本 |
| `npm run build:win` | 构建 Windows | 构建 Windows 版本（NSIS + Portable） |
| `npm run build:mac` | 构建 macOS | 构建 macOS 版本（DMG + ZIP） |
| `npm run build:linux` | 构建 Linux | 构建 Linux 版本（AppImage + DEB） |
| `npm run pack` | 打包不构建 | 仅打包应用，不创建安装程序 |

## 项目结构

```
oj-competition-side-client/
├── main.js                   # 主进程入口文件
├── index.html                # Vite 渲染进程入口
├── vite.config.mjs           # Vite 配置
├── package.json              # 项目配置和依赖
├── src/
│   ├── electron/             # Electron 主进程与 preload
│   │   ├── main.js           # 窗口、BrowserView、安全拦截、IPC
│   │   ├── preload.js        # 受控 IPC API 暴露
│   │   └── appConfig.js      # 域名与应用配置
│   └── renderer/             # Vue + Vite 渲染进程
│       ├── App.vue           # 应用外壳
│       ├── components/       # Element Plus UI 组件
│       ├── api/              # IPC 适配层
│       └── styles/           # 全局样式与明暗色适配
├── build/                    # 构建配置文件
│   ├── installer.nsh         # Windows NSIS 安装脚本
│   └── sdut-oj-competition-client.desktop  # Linux 桌面文件
├── docs/                     # 文档目录
│   ├── install-windows.md    # Windows 安装指南
│   ├── install-macos.md      # macOS 安装指南
│   ├── install-linux.md      # Linux 安装指南
│   └── developer-guide.md    # 开发者指南
├── public/                   # 静态资源
│   ├── favicon.ico          # Windows 图标
│   ├── favicon.icns         # macOS 图标
│   ├── favicon.png          # Linux 图标
│   └── svg/                 # SVG 图标集合
├── scripts/                  # 构建脚本
│   ├── afterPack.js         # 打包后处理脚本
│   ├── beforePublish.js     # 发布前处理脚本
│   └── ...                  # 其他构建脚本
├── utils/                   # 工具模块
│   ├── domainHelper.js      # 域名控制工具
│   ├── updateManager.js     # 更新检测
│   ├── uaHelper.js          # User-Agent 处理
│   ├── versionHelper.js     # 版本号工具
│   └── ...                  # 其他工具模块
└── locales/                 # 国际化文件
    ├── zh-CN.json           # 中文语言包
    └── en-US.json           # 英文语言包
```

## 核心模块说明

### Electron 主进程 (`src/electron/main.js`)
- 创建应用窗口和内容 BrowserView
- 负责域名白名单、安全拦截和窗口复用
- 通过 IPC 接收 Vue 工具栏操作并执行浏览器行为

### Preload (`src/electron/preload.js`)
- 通过 `contextBridge` 暴露最小化 API
- 渲染进程只能调用受控 IPC，不能直接访问 Node.js

### Vue 渲染进程 (`src/renderer`)
- 基于 Vue 3 + Vite + Element Plus
- 工具栏、更新弹窗、重置弹窗均在 Vue 中维护
- 通过 Element Plus 和 CSS 变量完成明暗色适配

## 构建配置

### electron-builder 配置
配置位于 `package.json` 的 `build` 字段：

```json
{
  "build": {
    "appId": "cn.sdutacm.oj-competition-side-client",
    "productName": "SDUT OJ Competition Side Client",
    "directories": {
      "output": "dist"
    },
    "files": [
      "main.js",
      "src/electron/**/*",
      "dist/renderer/**/*",
      "utils/**/*",
      "public/**/*",
      "locales/**/*",
      "package.json"
    ]
  }
}
```

### 平台特定配置

#### Windows 配置
```json
{
  "win": {
    "target": [
      {
        "target": "nsis",
        "arch": ["x64", "arm64"]
      },
      {
        "target": "portable",
        "arch": ["x64", "arm64"]
      }
    ]
  }
}
```

#### macOS 配置
```json
{
  "mac": {
    "target": [
      {
        "target": "dmg",
        "arch": ["x64", "arm64"]
      }
    ]
  }
}
```

#### Linux 配置
```json
{
  "linux": {
    "target": [
      {
        "target": "AppImage",
        "arch": ["x64", "arm64"]
      },
      {
        "target": "deb",
        "arch": ["x64", "arm64"]
      }
    ]
  }
}
```

## 开发工作流

### 1. 功能开发
1. 创建功能分支：`git checkout -b feature/功能名称`
2. 进行开发和测试
3. 提交代码：`git commit -m "feat: 添加新功能"`
4. 推送分支：`git push origin feature/功能名称`
5. 创建 Pull Request

### 2. 调试技巧
```bash
# 启动时显示调试信息
npm run electron:dev -- --enable-logging

# 在开发模式下显示开发者工具
npm run electron:dev -- --dev

# 查看详细的 Electron 日志
DEBUG=electron* npm run electron:dev
```

### 3. 构建测试
```bash
# 仅打包不构建安装程序（快速测试）
npm run pack

# 构建当前平台版本
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## 代码规范

### JavaScript 规范
- 使用 ES6+ 语法
- 优先使用 `const`，需要重新赋值时使用 `let`
- 使用模板字符串而非字符串拼接
- 函数和变量使用 camelCase 命名
- 常量使用 UPPER_SNAKE_CASE 命名

### 文件组织
- 工具模块放在 `utils/` 目录
- 静态资源放在 `public/` 目录
- 构建脚本放在 `scripts/` 目录
- shell 脚本放在 `bin/` 目录
- 文档放在 `docs/` 目录

### 注释规范
```javascript
/**
 * 函数功能说明
 * @param {string} param1 - 参数说明
 * @param {Object} param2 - 参数说明
 * @returns {boolean} 返回值说明
 */
function exampleFunction(param1, param2) {
  // 实现逻辑
}
```

## 发布流程

### 1. 版本管理
```bash
# 更新版本号（会自动更新 package.json）
npm version patch  # 修复版本 1.0.0 -> 1.0.1
npm version minor  # 功能版本 1.0.0 -> 1.1.0
npm version major  # 主要版本 1.0.0 -> 2.0.0
```

**重要**: 项目使用 `utils/versionHelper.js` 统一管理版本号，所有显示版本信息的地方都会自动从 `package.json` 读取，包括：
- 启动页面版本显示
- 系统信息对话框
- User-Agent 标识
- 应用标题等

因此只需更新 `package.json` 中的版本号即可。

### 2. 构建发布版本
```bash
# 构建所有平台版本
npm run build

# 检查构建产物
ls -la dist/
```

### 3. 创建 GitHub Release
1. 推送 tag：`git push origin --tags`
2. 在 GitHub 上创建新的 Release
3. 上传构建产物到 Release
4. 编写 Release Notes

## 常见问题

### 构建问题

**Q: Windows 下构建失败，提示权限错误**
A: 以管理员身份运行命令行，或者排除杀毒软件干扰

**Q: macOS 下构建失败，提示代码签名错误**
A: 临时跳过代码签名：`export CSC_IDENTITY_AUTO_DISCOVERY=false`

**Q: Linux 下构建失败，提示依赖缺失**
A: 安装必要的构建依赖：
```bash
sudo apt install build-essential libnss3-dev libatk-bridge2.0-dev libdrm2-dev libxss1-dev libgtk-3-dev
```

### 开发问题

**Q: 应用启动后白屏**
A: 开发模式下先确认 Vite 是否运行在 `http://127.0.0.1:5173`，再检查竞赛站点网络连接。

**Q: 热重载不工作**
A: 重启开发服务器：`Ctrl+C` 后重新运行 `npm run dev`

**Q: 工具栏操作没有响应**
A: 检查 `src/electron/preload.js` 暴露的 IPC API 和 `src/electron/main.js` 中对应的 `ipcMain.handle`。

## 贡献指南

### 提交规范
使用 [Conventional Commits](https://conventionalcommits.org/) 规范：

- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建脚本、工具配置等

### Pull Request 流程
1. Fork 项目到个人仓库
2. 创建功能分支
3. 完成开发和测试
4. 提交代码并推送
5. 创建 Pull Request
6. 代码审查和讨论
7. 合并到主分支

### 问题报告
在 [GitHub Issues](https://github.com/sdutacm/oj-competition-side-client/issues) 中报告问题时，请提供：

- 操作系统和版本
- 应用版本
- 复现步骤
- 期望行为
- 实际行为
- 相关日志或截图

---

感谢您的贡献！如有疑问，欢迎在 Issues 中讨论。
