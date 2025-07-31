# macOS 安装指南

## 系统要求
- macOS 10.14 (Mojave) 或更高版本
- 推荐 macOS 12 (Monterey) 或更高版本以获得最佳体验
- 支持架构：Intel (x64)、Apple Silicon (ARM64)

## 下载安装包

### 方式一：从 GitHub Releases 下载（推荐）
1. 访问 [GitHub Releases 页面](https://github.com/sdutacm/oj-competition-side-client/releases)
2. 选择最新版本
3. 下载对应的安装包：
   - **DMG 格式**：`SDUT-OJ-Competition-Client-{version}.dmg`（推荐）
   - **ZIP 格式**：`SDUT-OJ-Competition-Client-{version}-mac.zip`

### 方式二：从官方网站下载
1. 访问 [SDUT OJ 官网](https://oj.sdutacm.cn)
2. 在下载页面选择 macOS 版本

## 安装步骤

### DMG 安装（推荐）
1. 双击下载的 `.dmg` 文件
2. 在打开的窗口中，将应用图标拖拽到"Applications"文件夹
3. 等待复制完成
4. 从 Launchpad 或 Applications 文件夹启动应用

### ZIP 安装
1. 双击下载的 `.zip` 文件进行解压
2. 将解压出的应用程序拖拽到"Applications"文件夹
3. 从 Launchpad 或 Applications 文件夹启动应用

## 首次运行设置

### 处理"未知开发者"警告
由于应用尚未获得 Apple 开发者认证，首次运行时可能出现警告：

**方法一：通过安全性与隐私设置**
1. 尝试打开应用，会出现警告对话框
2. 打开"系统偏好设置" > "安全性与隐私"
3. 在"通用"选项卡底部，点击"仍要打开"按钮
4. 在确认对话框中点击"打开"

**方法二：通过右键菜单**
1. 在 Applications 文件夹中右键点击应用
2. 选择"打开"
3. 在警告对话框中点击"打开"

**方法三：通过终端命令**
```bash
# 移除应用的隔离属性
sudo xattr -rd com.apple.quarantine /Applications/SDUT\ OJ\ Competition\ Client.app
```

### 赋予网络访问权限
首次运行时，系统可能询问是否允许网络访问，请选择"允许"。

## 疑难解答

### 应用无法打开 - "应用已损坏"
这通常是因为下载过程中文件损坏或系统安全设置过严格：

**解决方法**：
1. 重新下载安装包
2. 使用终端移除隔离属性：
   ```bash
   sudo xattr -rd com.apple.quarantine /Applications/SDUT\ OJ\ Competition\ Client.app
   ```

### 应用闪退或无法启动
1. **检查系统版本**：确保系统为 macOS 10.14 或更高
2. **重启应用**：完全退出应用后重新启动
3. **清理缓存**：删除应用缓存文件
   ```bash
   rm -rf ~/Library/Application\ Support/sdut-oj-competition-client
   rm -rf ~/Library/Caches/sdut-oj-competition-client
   ```

### 在 Apple Silicon Mac 上运行 Intel 版本
如果下载了 Intel 版本但在 Apple Silicon Mac 上运行：
1. 应用会通过 Rosetta 2 运行
2. 确保已安装 Rosetta 2：
   ```bash
   /usr/sbin/softwareupdate --install-rosetta --agree-to-license
   ```

### 网络连接问题
1. 检查网络连接是否正常
2. 检查防火墙设置，确保允许应用访问网络
3. 如使用企业网络，可能需要配置代理设置

## 卸载方法

### 完全卸载
1. **删除应用程序**：
   - 将 Applications 文件夹中的应用拖拽到废纸篓
   - 或使用 Finder 选中应用后按 `Cmd + Delete`

2. **清理用户数据**（可选）：
   ```bash
   # 删除应用数据
   rm -rf ~/Library/Application\ Support/sdut-oj-competition-client
   
   # 删除缓存文件
   rm -rf ~/Library/Caches/sdut-oj-competition-client
   
   # 删除日志文件
   rm -rf ~/Library/Logs/sdut-oj-competition-client
   
   # 删除偏好设置
   rm -rf ~/Library/Preferences/cn.sdutacm.oj-competition-side-client.plist
   ```

## 更新方法
1. 下载最新版本的安装包
2. 删除旧版本应用（拖拽到废纸篓）
3. 按照安装步骤安装新版本
4. 用户数据和设置通常会保留

## 高级设置

### 命令行启动
```bash
# 从 Applications 文件夹启动
open -a "SDUT OJ Competition Client"

# 带调试信息启动
open -a "SDUT OJ Competition Client" --args --enable-logging
```

### 创建 Dock 快捷方式
应用安装后会自动出现在 Launchpad 中，也可以：
1. 从 Applications 文件夹将应用拖拽到 Dock
2. 右键 Dock 中的应用选择"在 Dock 中保留"

---

如有其他问题，请访问 [GitHub Issues](https://github.com/sdutacm/oj-competition-side-client/issues) 获取帮助。
