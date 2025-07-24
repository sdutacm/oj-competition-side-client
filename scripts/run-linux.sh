#!/bin/bash

# SDUT OJ 竞赛客户端 Linux 启动脚本
# 自动处理 Linux 下的沙箱权限问题

echo "正在启动 SDUT OJ 竞赛客户端..."

# 查找 AppImage 文件
APPIMAGE_FILE=""
if [ -f "dist/SDUTOJCompetitionSideClient_linux_x86_64_1.0.0.AppImage" ]; then
    APPIMAGE_FILE="dist/SDUTOJCompetitionSideClient_linux_x86_64_1.0.0.AppImage"
elif [ -f "SDUTOJCompetitionSideClient_linux_x86_64_1.0.0.AppImage" ]; then
    APPIMAGE_FILE="SDUTOJCompetitionSideClient_linux_x86_64_1.0.0.AppImage"
else
    # 尝试找到任何 AppImage 文件
    APPIMAGE_FILE=$(find . -name "*linux*.AppImage" -type f | head -1)
fi

if [ -z "$APPIMAGE_FILE" ]; then
    echo "❌ 未找到 AppImage 文件"
    echo "请先运行构建命令: npm run build:linux"
    exit 1
fi

echo "找到应用程序: $APPIMAGE_FILE"

# 确保文件有执行权限
chmod +x "$APPIMAGE_FILE"

# 启动应用程序（不需要 --no-sandbox，因为已在代码中禁用沙箱）
echo "🚀 启动应用程序..."
"$APPIMAGE_FILE" &

echo "✅ 应用程序已启动"
echo "如果遇到任何问题，请查看控制台输出"
