# Windows 构建说明

## 在 Windows 上构建

1. 确保已安装 Node.js 16+ 和 npm
2. 安装依赖：
   ```bash
   npm install
   ```

3. 构建 Windows 应用程序：
   ```bash
   # 构建所有格式
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

## 故障排除

1. 如果构建失败，检查 Node.js 版本是否 >= 16
2. 如果图标显示不正确，确保 `public/favicon.ico` 文件包含多个分辨率
3. 如果在服务器上构建，可能需要安装额外的依赖（如 wine）

## 服务器部署注意事项

在 Linux 服务器上为 Windows 交叉编译时：
- 可能需要安装 wine 和 wine32 来处理 Windows 可执行文件
- 使用环境变量 `ELECTRON_BUILDER_ALLOW_UNRESOLVED_DEPENDENCIES=true` 来跳过某些依赖检查
- 考虑在 Docker 容器中构建以保证环境一致性
