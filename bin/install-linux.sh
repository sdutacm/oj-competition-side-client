#!/bin/bash

# SDUT OJ 竞赛客户端 Linux 安装脚本
# 正确设置图标和桌面集成

echo "正在安装 SDUT OJ 竞赛客户端..."

# 查找 AppImage 文件
APPIMAGE_FILE=""
if [ -f "dist/SDUTOJCompetitionSideClient_linux_x86_64_1.0.0.AppImage" ]; then
    APPIMAGE_FILE="dist/SDUTOJCompetitionSideClient_linux_x86_64_1.0.0.AppImage"
elif [ -f "SDUTOJCompetitionSideClient_linux_x86_64_1.0.0.AppImage" ]; then
    APPIMAGE_FILE="SDUTOJCompetitionSideClient_linux_x86_64_1.0.0.AppImage"
else
    APPIMAGE_FILE=$(find . -name "*linux*.AppImage" -type f | head -1)
fi

if [ -z "$APPIMAGE_FILE" ]; then
    echo "❌ 未找到 AppImage 文件"
    echo "请先运行构建命令: npm run build:linux"
    exit 1
fi

# 创建用户程序目录
INSTALL_DIR="$HOME/.local/share/applications"
ICON_DIR="$HOME/.local/share/icons"
BIN_DIR="$HOME/.local/bin"

mkdir -p "$INSTALL_DIR"
mkdir -p "$ICON_DIR"
mkdir -p "$BIN_DIR"

# 获取绝对路径
APPIMAGE_FULL_PATH=$(realpath "$APPIMAGE_FILE")

echo "找到应用程序: $APPIMAGE_FULL_PATH"

# 确保文件有执行权限
chmod +x "$APPIMAGE_FULL_PATH"

# 复制图标文件
ICON_SOURCE=""
if [ -f "public/icon.png" ]; then
    ICON_SOURCE="public/icon.png"
elif [ -f "icon.png" ]; then
    ICON_SOURCE="icon.png"
fi

if [ -n "$ICON_SOURCE" ]; then
    cp "$ICON_SOURCE" "$ICON_DIR/sdut-oj-competition-client.png"
    echo "✅ 图标已安装到: $ICON_DIR/sdut-oj-competition-client.png"
else
    echo "⚠️  图标文件未找到"
fi

# 创建桌面文件
DESKTOP_FILE="$INSTALL_DIR/sdut-oj-competition-client.desktop"
cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=SDUT OJ 竞赛客户端
Name[en_US]=SDUT OJ Competition Side Client
Comment=专业的在线评测系统客户端
Comment[en_US]=Professional Online Judge System Client
GenericName=SDUT OJ Competition Side Client
Exec=$APPIMAGE_FULL_PATH
Icon=sdut-oj-competition-client
Terminal=false
StartupNotify=true
Categories=Education;Development;
StartupWMClass=sdut-oj-competition-client
Keywords=OJ;ACM;Programming;Contest;Judge;
EOF

chmod +x "$DESKTOP_FILE"
echo "✅ 桌面文件已创建: $DESKTOP_FILE"

# 创建符号链接到 bin 目录（可选）
SYMLINK_PATH="$BIN_DIR/sdut-oj-client"
ln -sf "$APPIMAGE_FULL_PATH" "$SYMLINK_PATH"
echo "✅ 命令行启动器已创建: $SYMLINK_PATH"

# 更新桌面数据库
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database "$INSTALL_DIR"
    echo "✅ 桌面数据库已更新"
fi

# 更新图标缓存
if command -v gtk-update-icon-cache &> /dev/null; then
    gtk-update-icon-cache "$ICON_DIR" 2>/dev/null || true
    echo "✅ 图标缓存已更新"
fi

echo ""
echo "🎉 安装完成！"
echo ""
echo "现在你可以："
echo "1. 在应用程序菜单中找到 'SDUT OJ 竞赛客户端'"
echo "2. 直接运行: $APPIMAGE_FULL_PATH"
echo "3. 使用命令: sdut-oj-client"
echo ""
echo "图标应该在任务栏和窗口管理器中正确显示。"
