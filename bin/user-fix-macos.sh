#!/bin/bash

# macOS 用户端修复脚本 v1.4.34
# 用于修复下载后的"文件已损坏"问题

set -e

APP_NAME="SDUT OJ 竞赛客户端"
APP_PATH="/Applications/$APP_NAME.app"

echo "🔧 SDUT OJ 竞赛客户端 - macOS修复工具 v1.4.34"
echo "=================================================="

# 检查应用是否存在
if [ ! -d "$APP_PATH" ]; then
    echo "❌ 错误: 未找到应用 $APP_PATH"
    echo "请确保已将应用拖拽到Applications文件夹中"
    exit 1
fi

echo "📱 找到应用: $APP_PATH"

# 检查是否需要sudo
if [ -w "$APP_PATH" ]; then
    echo "✅ 检测到写入权限，使用用户权限处理..."
    USE_SUDO=""
else
    echo "🔒 需要管理员权限，将使用sudo..."
    USE_SUDO="sudo"
fi

# 1. 移除隔离标记
echo "🧹 移除隔离标记..."
$USE_SUDO xattr -cr "$APP_PATH" 2>/dev/null || {
    echo "⚠️  移除隔离标记失败，尝试无sudo方式..."
    xattr -cr "$APP_PATH" 2>/dev/null || echo "继续处理..."
}

# 2. 移除现有签名
echo "🗑️  移除现有签名..."
$USE_SUDO codesign --remove-signature "$APP_PATH" 2>/dev/null || {
    echo "ℹ️  没有找到现有签名，继续..."
}

# 3. 重新签名
echo "✍️  重新签名应用..."
$USE_SUDO codesign --force --deep --sign - "$APP_PATH" || {
    echo "⚠️  签名失败，尝试无sudo方式..."
    codesign --force --deep --sign - "$APP_PATH" 2>/dev/null || {
        echo "❌ 签名失败，但应用可能仍可正常运行"
    }
}

# 4. 验证修复
echo "✅ 验证修复结果..."
if codesign --verify --deep --strict "$APP_PATH" 2>/dev/null; then
    echo "🎉 修复成功! 现在可以正常启动应用了"
    echo ""
    echo "📦 启动应用:"
    echo "   方式1: 直接双击应用"
    echo "   方式2: 右键点击应用 → 打开"
else
    echo "⚠️  签名验证失败，但应用可能仍可正常运行"
    echo ""
    echo "📦 启动应用建议:"
    echo "   1. 右键点击应用 → 打开"
    echo "   2. 在弹出对话框中点击'打开'"
fi

echo ""
echo "📌 其他解决方案:"
echo "   系统偏好设置 → 安全性与隐私 → 通用 → 点击'仍要打开'"
echo ""
echo "📞 技术支持: https://github.com/sdutacm/oj-competition-side-client/issues"
echo ""
