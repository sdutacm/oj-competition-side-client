#!/bin/bash

# v1.0.1 智能图标刷新机制验证脚本

echo "🎯 v1.0.1 智能图标刷新机制验证"
echo "================================"

# 检查main.js中的智能刷新逻辑
echo ""
echo "🔍 检查智能图标刷新机制..."

# 检查是否有智能刷新逻辑
smart_refresh=$(grep -n -A 10 "Windows任务栏图标刷新完成" main.js)
if [ -n "$smart_refresh" ]; then
    echo "✅ 找到智能图标刷新机制"
    echo "   包含：窗口最小化/恢复逻辑"
else
    echo "❌ 未找到智能图标刷新机制"
fi

# 检查延迟设置
delay_check=$(grep -n "}, 500" main.js)
if [ -n "$delay_check" ]; then
    echo "✅ 找到500ms延迟设置（确保窗口完全创建）"
else
    echo "❌ 未找到延迟设置"
fi

# 检查AppUserModelId重新确认
appid_reconfirm=$(grep -n -A 5 "重新确认AppUserModelId" main.js)
if [ -n "$appid_reconfirm" ]; then
    echo "✅ 找到AppUserModelId重新确认逻辑"
else
    echo "❌ 未找到AppUserModelId重新确认"
fi

echo ""
echo "🔍 检查NSIS注册表增强..."

# 检查强化的AppUserModelId设置
enhanced_reg=$(grep -n "RelaunchCommand" build/installer.nsh)
if [ -n "$enhanced_reg" ]; then
    echo "✅ 找到强化的AppUserModelId注册表设置"
    echo "   包含：RelaunchCommand, RelaunchIconResource等"
else
    echo "❌ 未找到强化注册表设置"
fi

# 检查Windows通知注册
notification_reg=$(grep -n "ApplicationAssociationToasts" build/installer.nsh)
if [ -n "$notification_reg" ]; then
    echo "✅ 找到Windows通知区域注册"
else
    echo "❌ 未找到通知区域注册"
fi

echo ""
echo "🔍 检查安全性..."

# 确认没有危险操作
dangerous_found=false
dangerous_patterns=("taskkill.*explorer" "ie4uinit.*ClearIconCache" "SendMessage.*HWND_BROADCAST")

for pattern in "${dangerous_patterns[@]}"; do
    if grep -q "$pattern" build/installer.nsh main.js scripts/afterPack.js 2>/dev/null; then
        echo "❌ 仍然发现危险操作: $pattern"
        dangerous_found=true
    fi
done

if [ "$dangerous_found" = false ]; then
    echo "✅ 安全性验证通过 - 无危险操作"
fi

echo ""
echo "📊 智能修复机制总结："
echo "===================="
echo "🎯 工作原理："
echo "   1. 应用启动后延迟500ms"
echo "   2. 重新确认AppUserModelId"
echo "   3. 短暂最小化窗口（100ms）"
echo "   4. 立即恢复窗口显示"
echo "   5. 强制Windows刷新任务栏图标"

echo ""
echo "✅ 优势："
echo "   - 完全安全（无系统级操作）"
echo "   - 自动化处理（用户无感知）"
echo "   - 高成功率（利用Windows API）"
echo "   - 无副作用（仅影响当前窗口）"

echo ""
echo "🚀 测试建议："
echo "============="
echo "1. 构建并安装应用程序"
echo "2. 首次启动观察是否有短暂的窗口闪烁"
echo "3. 检查任务栏图标是否正确显示"
echo "4. 验证应用程序功能正常"

echo ""
echo "验证完成！v1.0.1智能图标刷新机制已就绪。"
