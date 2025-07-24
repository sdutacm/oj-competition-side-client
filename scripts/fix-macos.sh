#!/bin/bash

# macOS 应用程序修复脚本
# 用于解决 "应用程序已损坏" 的问题

echo "正在修复 macOS 应用程序..."

# 检查应用程序是否存在
APP_PATH=""
if [ -f "dist/SDUTOJCompetitionSideClient_mac_x64_1.0.0.app/Contents/MacOS/SDUT OJ 竞赛客户端" ]; then
    APP_PATH="dist/SDUTOJCompetitionSideClient_mac_x64_1.0.0.app"
elif [ -f "dist/mac/SDUT OJ 竞赛客户端.app/Contents/MacOS/SDUT OJ 竞赛客户端" ]; then
    APP_PATH="dist/mac/SDUT OJ 竞赛客户端.app"
else
    echo "❌ 未找到应用程序文件"
    echo "请先运行: npm run build:mac"
    exit 1
fi

echo "找到应用程序: $APP_PATH"

# 移除扩展属性（隔离标志）
echo "🔧 移除隔离标志..."
xattr -dr com.apple.quarantine "$APP_PATH" 2>/dev/null || true

# 清除代码签名
echo "🔧 清除现有签名..."
codesign --remove-signature "$APP_PATH" 2>/dev/null || true

# 添加执行权限
echo "🔧 添加执行权限..."
chmod +x "$APP_PATH/Contents/MacOS/"*

echo "✅ 修复完成！"
echo ""
echo "现在你可以直接双击运行应用程序了。"
echo "如果仍然提示损坏，请："
echo "1. 右键点击应用程序"
echo "2. 选择 '打开'"
echo "3. 在弹出的对话框中点击 '打开'"
