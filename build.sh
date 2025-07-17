#!/bin/bash

# SDUT OJ 竞赛客户端 - 跨平台构建脚本

echo "🚀 SDUT OJ 竞赛客户端 - 跨平台构建脚本"
echo "=============================================="

# 检查 Node.js 和 npm
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装，请先安装 npm"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"
echo "✅ npm 版本: $(npm --version)"

# 安装依赖
echo "📦 安装依赖..."
npm install

# 构建应用
echo "🔨 构建应用..."

# 根据操作系统选择构建目标
case "$(uname -s)" in
    Linux*)
        echo "🐧 检测到 Linux 系统，构建 Linux 版本..."
        npm run make
        echo "✅ Linux 版本构建完成！"
        echo "📍 DEB 包位置: out/make/deb/x64/"
        echo "📍 ZIP 包位置: out/make/zip/linux/x64/"
        ;;
    Darwin*)
        echo "🍎 检测到 macOS 系统，构建 macOS 版本..."
        npm run make
        echo "✅ macOS 版本构建完成！"
        echo "📍 ZIP 包位置: out/make/zip/darwin/x64/"
        ;;
    CYGWIN*|MINGW32*|MSYS*|MINGW*)
        echo "🪟 检测到 Windows 系统，构建 Windows 版本..."
        npm run make
        echo "✅ Windows 版本构建完成！"
        echo "📍 安装包位置: out/make/squirrel.windows/x64/"
        echo "📍 ZIP 包位置: out/make/zip/win32/x64/"
        ;;
    *)
        echo "❓ 未知操作系统，尝试构建当前平台版本..."
        npm run make
        ;;
esac

echo ""
echo "🎉 构建完成！"
echo "📂 所有构建文件位于: out/make/"
echo ""
echo "📋 下一步："
echo "1. 检查 out/make/ 目录中的安装包"
echo "2. 根据目标平台选择相应的安装包"
echo "3. 参考 README.md 了解安装说明"
echo ""
echo "💡 提示："
echo "- DEB 包适用于 Ubuntu/Debian"
echo "- ZIP 包为便携版，适用于所有平台"
echo "- Windows 版本包含安装程序"
echo "- macOS 版本包含 DMG 文件"
