# macOS 用户安装指南

## 🎉 好消息！应用已自动优化

从 v1.4.34 开始，我们的 macOS 应用已经在构建时自动处理了签名问题，大多数用户可以直接使用！

## 📦 简单安装步骤

1. **下载 DMG 文件**
2. **双击打开 DMG**
3. **拖拽应用到 Applications 文件夹**
4. **双击启动应用** ✨

## ⚠️ 如果仍然提示"无法打开"

### 方法1: 右键菜单（推荐）
1. 右键点击应用
2. 选择"打开"
3. 在弹出对话框中点击"打开"

### 方法2: 一键修复脚本
```bash
curl -s https://raw.githubusercontent.com/sdutacm/oj-competition-side-client/master/bin/user-fix-macos.sh | bash
```

### 方法3: 手动命令
```bash
sudo xattr -cr "/Applications/SDUT OJ 竞赛客户端.app"
sudo codesign --force --deep --sign - "/Applications/SDUT OJ 竞赛客户端.app"
```

## 🔧 技术说明

我们的构建流程现在包括：
- ✅ 自动移除隔离标记
- ✅ 自动应用 ad-hoc 签名
- ✅ 验证签名完整性
- ✅ 创建用户说明文件

## 📞 需要帮助？

如果您遇到任何问题，请：
1. 查看 DMG 中的 `README_MACOS.txt` 文件
2. 访问我们的 [GitHub Issues](https://github.com/sdutacm/oj-competition-side-client/issues)
3. 联系技术支持

## 🛡️ 安全提醒

- 仅从官方渠道下载应用
- 这些方法仅适用于您信任的软件
- 我们正在努力获得正式的 Apple 开发者证书
