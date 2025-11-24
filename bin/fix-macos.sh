#!/bin/bash

# macOS 应用修复脚本
# 用于解决未签名应用的"文件已损坏"问题

set -e

APP_NAME="SDUT OJ 竞赛客户端"
DIST_DIR="dist"

echo "🔧 开始修复macOS应用的签名和安全问题..."

# 检查是否存在构建产物
if [ ! -d "$DIST_DIR" ]; then
    echo "❌ 错误: 构建目录 $DIST_DIR 不存在，请先构建应用"
    exit 1
fi

# 查找.app文件
APP_PATH=$(find "$DIST_DIR" -name "*.app" -type d | head -1)

if [ -z "$APP_PATH" ]; then
    echo "❌ 错误: 未找到.app文件"
    exit 1
fi

echo "📱 找到应用: $APP_PATH"

# 1. 移除扩展属性（隔离标记）
echo "🧹 移除隔离标记..."
xattr -cr "$APP_PATH" || true

# 2. 移除所有可能的签名
echo "🗑️  移除现有签名..."
codesign --remove-signature "$APP_PATH" 2>/dev/null || true

# 3. 使用ad-hoc签名重新签名
echo "✍️  应用ad-hoc签名..."
codesign --force --deep --sign - "$APP_PATH"

# 4. 验证签名
echo "✅ 验证签名..."
codesign --verify --deep --strict "$APP_PATH"

# 5. 显示签名信息
echo "📋 签名信息:"
codesign -dv "$APP_PATH" 2>&1 || true

echo "🎉 macOS应用修复完成!"
