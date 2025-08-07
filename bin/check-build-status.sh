#!/bin/bash

# GitHub Actions 构建状态检查脚本
# 监控构建状态并检查图标修复是否生效

echo "🚀 GitHub Actions 构建状态检查"
echo "=============================="

# 获取最新提交信息
latest_commit=$(git log -1 --oneline)
echo "📝 最新提交: $latest_commit"

# 检查当前分支和标签
current_branch=$(git branch --show-current)
echo "🌿 当前分支: $current_branch"

latest_tag=$(git describe --tags --abbrev=0 2>/dev/null)
if [ -n "$latest_tag" ]; then
    echo "🏷️  最新标签: $latest_tag"
else
    echo "🏷️  无标签"
fi

echo ""
echo "🔗 GitHub Actions 链接："
echo "https://github.com/sdutacm/oj-competition-side-client/actions"

echo ""
echo "📦 构建完成后的测试步骤："
echo "========================="
echo "1. 下载 Windows 安装包 (.exe)"
echo "2. 在 Windows 机器上安装"
echo "3. 首次启动应用程序"
echo "4. 检查任务栏图标是否立即显示正确"
echo "5. 验证不需要重启即可看到图标"

echo ""
echo "🎯 预期行为变化："
echo "=================="
echo "修复前: 首次启动 → 任务栏显示通用图标 → 重启应用 → 显示正确图标"
echo "修复后: 首次启动 → 任务栏立即显示正确图标 ✅"

echo ""
echo "🔍 如需调试，可运行："
echo "==================="
echo "./bin/debug-icon-timing.sh  # 验证修复配置"
echo "npm run build:win          # 本地Windows构建测试"

echo ""
echo "监控完成！等待 GitHub Actions 构建结果..."
