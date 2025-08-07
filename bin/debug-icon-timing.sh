#!/bin/bash

# Windows 任务栏图标首次启动调试脚本
# 用于验证 AppUserModelId 早期设置和图标缓存修复

echo "🔍 Windows 任务栏图标首次启动问题调试工具"
echo "================================================"

# 检查关键文件是否存在
echo ""
echo "📁 检查关键文件..."
files_to_check=(
    "public/favicon.ico"
    "main.js"
    "build/installer.nsh"
    "scripts/afterPack.js"
)

for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file 存在"
    else
        echo "❌ $file 缺失"
    fi
done

echo ""
echo "🔧 检查 main.js 中的早期 AppUserModelId 设置..."

# 检查 AppUserModelId 是否在最早的位置设置
early_appusermodel=$(grep -n "setAppUserModelId.*org.sdutacm.SDUTOJCompetitionSideClient" main.js | head -1)
if [ -n "$early_appusermodel" ]; then
    line_num=$(echo "$early_appusermodel" | cut -d: -f1)
    echo "✅ 找到早期 AppUserModelId 设置在第 $line_num 行"
    echo "   内容: $(echo "$early_appusermodel" | cut -d: -f2-)"
    
    # 检查设置位置是否足够早（应该在前 20 行内）
    if [ "$line_num" -le 20 ]; then
        echo "✅ 设置位置合适（前 20 行内）"
    else
        echo "⚠️  设置位置可能太晚（第 $line_num 行），建议移到更早位置"
    fi
else
    echo "❌ 未找到早期 AppUserModelId 设置"
fi

echo ""
echo "🔧 检查 package.json 图标配置..."

# 检查 favicon.ico 配置
favicon_config=$(grep -A 5 -B 5 "favicon.ico" package.json)
if [ -n "$favicon_config" ]; then
    echo "✅ 找到 favicon.ico 配置"
else
    echo "❌ 未找到 favicon.ico 配置"
fi

echo ""
echo "🔧 检查 NSIS 安装脚本图标缓存刷新..."

# 检查图标缓存刷新命令
cache_refresh=$(grep -n "ie4uinit.exe.*ClearIconCache" build/installer.nsh)
if [ -n "$cache_refresh" ]; then
    echo "✅ 找到图标缓存清理命令"
    echo "   $cache_refresh"
else
    echo "❌ 未找到图标缓存清理命令"
fi

# 检查 Explorer 重启命令
explorer_restart=$(grep -n "taskkill.*explorer.exe" build/installer.nsh)
if [ -n "$explorer_restart" ]; then
    echo "✅ 找到 Explorer 重启命令"
else
    echo "❌ 未找到 Explorer 重启命令"
fi

echo ""
echo "📊 修复总结:"
echo "============"
echo "1. 早期 AppUserModelId 设置: $([ -n "$early_appusermodel" ] && echo "✅ 已配置" || echo "❌ 需要修复")"
echo "2. favicon.ico 图标配置: $([ -n "$favicon_config" ] && echo "✅ 已配置" || echo "❌ 需要修复")"
echo "3. NSIS 图标缓存刷新: $([ -n "$cache_refresh" ] && echo "✅ 已配置" || echo "❌ 需要修复")"
echo "4. Explorer 重启机制: $([ -n "$explorer_restart" ] && echo "✅ 已配置" || echo "❌ 需要修复")"

echo ""
echo "🚀 建议测试步骤:"
echo "================"
echo "1. 提交当前修复: git add . && git commit -m 'fix: Windows任务栏图标首次启动修复 - 极早期AppUserModelId设置'"
echo "2. 推送到 GitHub: git push origin main"
echo "3. 触发 GitHub Actions 构建"
echo "4. 下载构建的 Windows 安装包"
echo "5. 在 Windows 机器上安装并测试首次启动是否显示正确图标"

echo ""
echo "🎯 预期结果:"
echo "============"
echo "- 首次启动应立即显示正确的应用程序图标"
echo "- 不再需要重启应用程序来显示图标"
echo "- 任务栏图标应与应用程序图标保持一致"

echo ""
echo "调试完成！"
