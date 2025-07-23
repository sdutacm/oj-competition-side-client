# Windows 构建说明

## 前置要求

1. **Node.js 16+ 和 npm**
   - 从 [nodejs.org](https://nodejs.org/) 下载并安装 LTS 版本
   - 验证安装：`node --version` 和 `npm --version`

2. **Git**
   - 从 [git-scm.com](https://git-scm.com/) 下载并安装
   - 或使用 GitHub Desktop

3. **Visual Studio Build Tools** (可选，用于原生模块)
   - 如果构建过程中遇到原生模块编译问题，安装 Visual Studio Build Tools

## 在 Windows 上构建

1. 克隆项目：
   ```bash
   git clone https://github.com/ATRIOR-LCL/oj-competition-side-client.git
   cd oj-competition-side-client
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 构建 Windows 应用程序：
   ```bash
   # 构建所有格式（推荐）
   npm run build:win
   
   # 只构建 NSIS 安装程序
   npm run build:win:nsis
   
   # 只构建便携版
   npm run build:win:portable
   ```

## 构建产物

- `dist/SDUTOJCompetitionSideClient_windows_installer_x64_1.0.0.exe` - NSIS 安装程序
- `dist/SDUTOJCompetitionSideClient_windows_x64_1.0.0.exe` - 便携版应用程序
- `dist/win-unpacked/` - 解包的应用程序目录

## 图标配置

应用程序使用以下图标：
- Windows: `public/favicon.ico` (包含多个分辨率: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256)
- 安装程序图标: 同样使用 `public/favicon.ico`
- 桌面快捷方式图标: 使用安装目录中的 `favicon.ico` 文件
- 卸载程序图标: 同样使用 `public/favicon.ico`

## 图标显示说明

- ✅ **可执行文件图标**: 通过 `signAndEditExecutable: true` 和 afterPack 钩子自动嵌入
- ✅ **安装程序图标**: 使用 `installerIcon` 配置
- ✅ **桌面快捷方式图标**: 通过自定义 NSIS 脚本使用独立的图标文件
- ✅ **开始菜单图标**: 同样使用独立的图标文件
- ✅ **卸载程序图标**: 使用 `uninstallerIcon` 配置

## 故障排除

### 常见问题

1. **构建失败 - Node.js 版本问题**
   ```
   错误：Engine "node" is incompatible with this module
   ```
   解决：升级 Node.js 到 16+ 版本

2. **构建失败 - 原生模块编译问题**
   ```
   错误：MSBuild not found
   ```
   解决：安装 Visual Studio Build Tools 或 Visual Studio Community

3. **图标显示不正确**
   - 确保 `public/favicon.ico` 文件存在且包含多个分辨率
   - 检查文件大小不超过 1MB
   - 桌面快捷方式图标问题：重新安装应用程序
   - 所有图标现在都使用 `favicon.ico` 保持一致性

4. **权限问题**
   - 以管理员身份运行 PowerShell 或 Command Prompt
   - 或在用户目录下构建项目

5. **网络问题**
   ```bash
   # 如果下载 Electron 失败，可以设置镜像
   npm config set electron_mirror https://npmmirror.com/mirrors/electron/
   ```

### Windows 特定配置

项目已针对 Windows 构建进行了优化：

- ✅ 启用了 `signAndEditExecutable: true` 用于图标嵌入
- ✅ 配置了 `rcedit` 依赖用于可执行文件编辑
- ✅ 设置了正确的中文应用程序名称
- ✅ 配置了 NSIS 安装程序的中文界面
- ✅ 添加了 afterPack 钩子用于额外的图标处理
- ✅ 自定义 NSIS 脚本确保桌面快捷方式图标正确显示
- ✅ 所有程序组件（安装程序、卸载程序、快捷方式）统一使用 favicon.ico

### 构建输出详解

构建成功后，`dist/` 目录将包含：

```
dist/
├── SDUTOJCompetitionSideClient_windows_installer_x64_1.0.0.exe  # NSIS 安装程序
├── SDUTOJCompetitionSideClient_windows_x64_1.0.0.exe           # 便携版
├── win-unpacked/                                               # 解包目录
│   ├── SDUT OJ 竞赛客户端.exe                                   # 主程序
│   ├── favicon.ico                                             # 应用图标
│   └── resources/                                              # 应用资源
└── ...其他文件
```

## 服务器部署注意事项

在 Linux 服务器上为 Windows 交叉编译时：
- 可能需要安装 wine 和 wine32 来处理 Windows 可执行文件
- 使用环境变量 `ELECTRON_BUILDER_ALLOW_UNRESOLVED_DEPENDENCIES=true` 来跳过某些依赖检查
- 考虑在 Docker 容器中构建以保证环境一致性
