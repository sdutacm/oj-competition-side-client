# Windows 安装指南

## 系统要求
- Windows 10 (1903) 或更高版本
- 推荐 Windows 11 以获得最佳体验
- 支持架构：x64、ARM64

## 下载安装包

### 方式一：从 GitHub Releases 下载（推荐）
1. 访问 [GitHub Releases 页面](https://github.com/sdutacm/oj-competition-side-client/releases)
2. 选择最新版本
3. 下载对应的安装包：
   - **安装版**：`SDUT-OJ-Competition-Client-Setup-{version}.exe`
   - **便携版**：`SDUT-OJ-Competition-Client-Portable-{version}.exe`

### 方式二：从官方网站下载
1. 访问 [SDUT OJ 官网](https://oj.sdutacm.cn)
2. 在下载页面选择 Windows 版本

## 安装步骤

### 安装版（推荐）
1. 运行下载的 `.exe` 安装程序
2. 如果出现 Windows Defender SmartScreen 警告：
   - 点击"更多信息"
   - 选择"仍要运行"
3. 按照安装向导完成安装：
   - 选择安装目录（默认：`C:\Program Files\SDUT OJ Competition Client`）
   - 选择是否创建桌面快捷方式
   - 选择是否添加到开始菜单
4. 安装完成后可以：
   - 从桌面快捷方式启动
   - 从开始菜单启动
   - 从安装目录启动

### 便携版
1. 下载 `SDUT-OJ-Competition-Client-Portable-{version}.exe`
2. 双击运行即可，无需安装
3. 建议将文件放在固定文件夹中使用

## 疑难解答

### 安装时出现"此应用可能会损害你的设备"
这是因为应用尚未获得 Microsoft 代码签名证书。请按以下步骤操作：
1. 点击"更多信息"
2. 点击"仍要运行"
3. 应用是安全的，可以放心使用

### 杀毒软件误报
部分杀毒软件可能会误报，这是因为：
1. 应用使用了 Electron 框架
2. 应用具有网络访问功能
3. 应用尚未建立数字签名信任

**解决方法**：
- 将应用添加到杀毒软件白名单
- 临时关闭实时防护进行安装
- 从官方渠道下载确保文件完整性

### 应用无法启动
1. **检查系统版本**：确保系统为 Windows 10 1903 或更高
2. **更新系统**：安装最新的 Windows 更新
3. **安装 VC++ 运行库**：下载并安装 Microsoft Visual C++ Redistributable
4. **清理缓存**：删除 `%APPDATA%\sdut-oj-competition-client` 文件夹

### 网络连接问题
1. 检查防火墙设置，允许应用访问网络
2. 检查代理设置是否正确
3. 确保能够访问 `op.sdutacm.cn` 域名

## 卸载方法

### 安装版
1. **通过控制面板**：
   - 打开"控制面板" > "程序" > "程序和功能"
   - 找到"SDUT OJ Competition Client"
   - 右键选择"卸载"

2. **通过 Windows 设置**：
   - 打开"设置" > "应用"
   - 搜索"SDUT OJ Competition Client"
   - 点击"卸载"

### 便携版
直接删除可执行文件即可

### 清理用户数据（可选）
如需完全清理，可删除以下文件夹：
- `%APPDATA%\sdut-oj-competition-client`
- `%LOCALAPPDATA%\sdut-oj-competition-client`

## 更新方法
1. 下载最新版本的安装包
2. 直接安装即可覆盖旧版本（安装版）
3. 便携版需要手动替换可执行文件

---

如有其他问题，请访问 [GitHub Issues](https://github.com/sdutacm/oj-competition-side-client/issues) 获取帮助。
