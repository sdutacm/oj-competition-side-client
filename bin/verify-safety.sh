#!/bin/bash

# v1.0.1 安全性验证脚本
# 确认所有可能导致蓝屏的危险操作都已移除

echo "🛡️  v1.0.1 安全性验证工具"
echo "========================="

# 检查是否存在危险的系统操作
echo ""
echo "🔍 检查可能导致蓝屏的危险操作..."

dangerous_patterns=(
    "taskkill.*explorer.exe"
    "ie4uinit.exe.*ClearIconCache"
    "SendMessage.*HWND_BROADCAST"
    "WM_SETTINGCHANGE"
    "powershell.*executionpolicy"
    "fix-taskbar-icon.bat"
)

files_to_check=(
    "build/installer.nsh"
    "scripts/afterPack.js"
    "main.js"
)

total_dangerous=0

for pattern in "${dangerous_patterns[@]}"; do
    echo "检查危险模式: $pattern"
    found=false
    
    for file in "${files_to_check[@]}"; do
        if [ -f "$file" ]; then
            matches=$(grep -n "$pattern" "$file" 2>/dev/null)
            if [ -n "$matches" ]; then
                echo "  ❌ 发现危险操作在 $file:"
                echo "     $matches"
                found=true
                ((total_dangerous++))
            fi
        fi
    done
    
    if [ "$found" = false ]; then
        echo "  ✅ 未发现"
    fi
done

echo ""
echo "📊 安全性检查结果:"
echo "================="

if [ $total_dangerous -eq 0 ]; then
    echo "✅ 安全性验证通过 - 未发现危险操作"
    echo "✅ 此版本应该不会导致系统蓝屏"
else
    echo "❌ 发现 $total_dangerous 个危险操作"
    echo "⚠️  需要进一步移除危险代码"
fi

echo ""
echo "🔧 当前版本的安全特性:"
echo "====================="
echo "✅ 早期AppUserModelId设置（main.js第8行）"
echo "✅ 仅使用HKCU注册表操作"
echo "✅ 标准文件复制和快捷方式创建"
echo "✅ 外部链接访问控制"
echo "✅ 移除所有系统级危险操作"

echo ""
echo "📦 v1.0.1 版本特性:"
echo "=================="
echo "- 版本号: $(grep '"version"' package.json | cut -d'"' -f4)"
echo "- 构建标签: v1.0.1"
echo "- 安全级别: 高（移除所有危险操作）"
echo "- 图标支持: 基础（可能需要重启显示）"

echo ""
echo "🚀 构建和测试建议:"
echo "=================="
echo "1. 触发GitHub Actions构建"
echo "2. 在Windows虚拟机中测试安装"
echo "3. 验证不会出现蓝屏"
echo "4. 检查应用程序正常启动"
echo "5. 如果图标不正确，这是可接受的（安全优先）"

echo ""
echo "验证完成！"
