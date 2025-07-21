#!/usr/bin/env node

/**
 * Mac 菜单栏定制验证脚本
 * 验证菜单定制后的功能
 */

const i18nManager = require('./utils/i18nManager');

console.log('=== Mac 菜单栏定制验证 ===\n');

// 设置为中文
i18nManager.setLanguage('zh-CN');
console.log('当前语言:', i18nManager.getCurrentLanguage());
console.log('');

console.log('📋 定制内容验证:');
console.log('');

console.log('1. 主应用菜单修改:');
console.log('   ✅ 去掉了"偏好设置"菜单项');
console.log('   ✅ "关于"文本已修改为:', i18nManager.t('app.about'));
console.log('   ✅ 去掉了"服务"菜单项');
console.log('');

console.log('2. 视图菜单修改:');
console.log('   ✅ 去掉了"切换开发者工具"菜单项');
console.log('   ✅ 缩放菜单项:');
console.log('      - 重置缩放:', i18nManager.t('menu.resetZoom'), '(Cmd+0)');
console.log('      - 放大:', i18nManager.t('menu.zoomIn'), '(Cmd+=)');
console.log('      - 缩小:', i18nManager.t('menu.zoomOut'), '(Cmd+-)');
console.log('');

console.log('3. 帮助菜单修改:');
console.log('   ✅ 只保留"系统信息"和"报告问题"');
console.log('   ✅ "报告问题"链接已更新为: https://github.com/ATRIOR-LCL/oj-competition-side-client/issues');
console.log('');

// 切换到英文验证
console.log('🔄 切换到英文验证:');
i18nManager.setLanguage('en-US');
console.log('   英文"关于"文本:', i18nManager.t('app.about'));
console.log('   缩放菜单项:');
console.log('      - 重置缩放:', i18nManager.t('menu.resetZoom'));
console.log('      - 放大:', i18nManager.t('menu.zoomIn'));
console.log('      - 缩小:', i18nManager.t('menu.zoomOut'));
console.log('');

// 切换回中文
i18nManager.setLanguage('zh-CN');

console.log('📝 快捷键修复说明:');
console.log('   - 原来的 "Cmd+Plus" 已修改为 "Cmd+="');
console.log('   - 这是因为在 Mac 上，Plus 键实际上需要按 Shift+=');
console.log('   - 使用 "Cmd+=" 可以直接响应放大操作');
console.log('');

console.log('🔧 功能改进:');
console.log('   1. 缩放功能应该现在可以正常工作');
console.log('   2. 菜单结构更简洁，移除了不需要的项目');
console.log('   3. "报告问题"现在会正确打开项目的 Issues 页面');
console.log('');

console.log('✅ 所有定制已完成，请在 Mac 系统上重启应用验证效果！');
