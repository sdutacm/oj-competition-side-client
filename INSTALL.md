# 安装指南

## 快速开始

### Windows 用户

1. 下载 `SDUT OJ Contest Client-win32-x64-1.0.0.zip` (约 105 MB)
2. 解压到任意目录（建议：`C:\Program Files\SDUT OJ Client\`）
3. 运行 `sdut-oj-contest-client.exe`
4. 可选：右键创建桌面快捷方式

### Linux 用户

**Ubuntu/Debian 用户**：
```bash
# 下载 DEB 包后
sudo dpkg -i sdut-oj-contest-client_1.0.0_amd64.deb

# 如果有依赖问题
sudo apt-get install -f
```

**其他 Linux 发行版**：
```bash
# 下载 ZIP 包后
unzip sdut-oj-contest-client-linux-x64-1.0.0.zip
cd sdut-oj-contest-client-linux-x64
./sdut-oj-contest-client
```

### macOS 用户

1. 下载 ZIP 包
2. 解压后将 `.app` 文件拖拽到应用程序文件夹
3. 首次运行需要在系统偏好设置中允许运行

## 系统要求

- **Windows**: Windows 10 或更高版本
- **Linux**: 现代 Linux 发行版（推荐 Ubuntu 18.04+）
- **macOS**: macOS 10.13 或更高版本

## 功能特性

- 🌐 专用 OJ 系统浏览器
- 🔧 自定义工具栏
- ⌨️ 快捷键支持
- 🔒 域名访问控制
- 📱 响应式界面

## 使用说明

应用启动后将自动打开 SDUT OJ 系统主页。

### 快捷键

- `Alt + ←`: 后退
- `Alt + →`: 前进  
- `F5`: 刷新页面
- `Alt + H`: 返回主页

### 工具栏

- 后退/前进按钮
- 刷新按钮
- 主页按钮

## 常见问题

### Windows

**Q: 提示"Windows 保护了你的电脑"**
A: 点击"更多信息"，然后点击"仍要运行"。这是因为应用未经 Microsoft 签名验证。

**Q: 杀毒软件报警**
A: 这是误报，可以添加信任或暂时关闭杀毒软件。Electron 应用经常被误判。

**Q: 应用启动慢**
A: 首次启动会较慢，因为需要初始化 Electron 运行时。后续启动会更快。

**Q: 构建时出现 Deprecation 警告**
A: 这些警告不影响应用功能，是构建工具的正常提示。

### Linux

**Q: 运行时提示缺少依赖**
A: 安装必要的依赖：
```bash
sudo apt-get install libnss3-dev libatk-bridge2.0-dev libxss1
```

### macOS

**Q: 应用无法打开**
A: 在系统偏好设置 → 安全性与隐私中允许运行

## 卸载

### Windows
直接删除解压的文件夹即可

### Linux
```bash
# DEB 包安装的
sudo dpkg -r sdut-oj-contest-client

# ZIP 包安装的
直接删除文件夹
```

### macOS
将 `.app` 文件移动到废纸篓

## 支持

如遇问题，请：
1. 查看本安装指南
2. 检查系统要求
3. 在项目页面提交 Issue
