#!/bin/bash

# SDUT OJ Contest Client Build Script
# 构建脚本 - 生成所有平台的安装包

set -e

echo "========================================="
echo "SDUT OJ Contest Client Build Script"
echo "========================================="
echo

# 清理之前的构建产物
echo "🧹 清理之前的构建产物..."
rm -rf dist/
echo "✅ 清理完成"
echo

# 构建 Linux 版本
echo "🐧 构建 Linux 版本..."
npm run build:linux
echo "✅ Linux 构建完成"
echo

# 构建 Windows 版本
echo "🪟 构建 Windows 版本..."
npm run build:win || echo "⚠️  Windows 构建可能需要 wine 环境"
echo "✅ Windows 构建完成"
echo

# 构建 macOS 版本
echo "🍎 构建 macOS 版本..."
npm run build:mac
echo "✅ macOS 构建完成"
echo

# 显示构建结果
echo "📦 构建产物列表："
find dist/ -name "*.exe" -o -name "*.deb" -o -name "*.AppImage" -o -name "*.zip" -o -name "*.dmg" | sort
echo

# 显示文件大小
echo "📏 文件大小信息："
ls -lh dist/SDUTOJ* | grep -E '\.(exe|deb|AppImage|zip|dmg)$'
echo

echo "🎉 构建完成！所有产物已生成在 dist/ 目录中"
echo "产品名称: SDUTOJContestClient"
echo "版本: 1.0.0"
echo "命名规范: 产品名_版本_系统_架构.扩展名"
echo
echo "安装说明请查看 RELEASE.md 文件"
