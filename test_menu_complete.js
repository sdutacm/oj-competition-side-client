#!/usr/bin/env node

/**
 * 完整的菜单国际化测试脚本
 * 测试所有菜单项的中文显示
 */

const i18nManager = require('./utils/i18nManager');

console.log('=== 完整菜单国际化测试 ===\n');

// 设置为中文
i18nManager.setLanguage('zh-CN');
console.log('当前语言:', i18nManager.getCurrentLanguage());
console.log('');

// 测试所有菜单项
const menuItems = [
  // 应用菜单
  { key: 'app.name', expected: 'SDUT OJ 竞赛客户端' },
  { key: 'menu.about', expected: '关于' },
  { key: 'menu.preferences', expected: '偏好设置' },
  { key: 'menu.language', expected: '语言' },
  { key: 'menu.services', expected: '服务' },
  { key: 'menu.hide', params: { appName: 'SDUT OJ 竞赛客户端' }, expected: '隐藏 SDUT OJ 竞赛客户端' },
  { key: 'menu.hideOthers', expected: '隐藏其他' },
  { key: 'menu.showAll', expected: '显示全部' },
  { key: 'menu.quit', params: { appName: 'SDUT OJ 竞赛客户端' }, expected: '退出 SDUT OJ 竞赛客户端' },
  
  // 文件菜单
  { key: 'menu.file', expected: '文件' },
  { key: 'menu.close', expected: '关闭' },
  
  // 编辑菜单
  { key: 'menu.edit', expected: '编辑' },
  { key: 'menu.undo', expected: '撤销' },
  { key: 'menu.redo', expected: '重做' },
  { key: 'menu.cut', expected: '剪切' },
  { key: 'menu.copy', expected: '复制' },
  { key: 'menu.paste', expected: '粘贴' },
  { key: 'menu.pasteAndMatchStyle', expected: '粘贴并匹配样式' },
  { key: 'menu.delete', expected: '删除' },
  { key: 'menu.selectAll', expected: '全选' },
  { key: 'menu.speech', expected: '朗读' },
  { key: 'menu.startSpeaking', expected: '开始朗读' },
  { key: 'menu.stopSpeaking', expected: '停止朗读' },
  
  // 视图菜单
  { key: 'menu.view', expected: '视图' },
  { key: 'menu.navigation', expected: '导航' },
  { key: 'menu.goBack', expected: '后退' },
  { key: 'menu.goForward', expected: '前进' },
  { key: 'menu.goHome', expected: '首页' },
  { key: 'menu.refresh', expected: '刷新' },
  { key: 'menu.forceReload', expected: '强制重新加载' },
  { key: 'menu.resetZoom', expected: '实际大小' },
  { key: 'menu.zoomIn', expected: '放大' },
  { key: 'menu.zoomOut', expected: '缩小' },
  { key: 'menu.toggleFullscreen', expected: '切换全屏' },
  { key: 'menu.toggleDevTools', expected: '切换开发者工具' },
  
  // 窗口菜单
  { key: 'menu.window', expected: '窗口' },
  { key: 'menu.minimize', expected: '最小化' },
  { key: 'menu.zoom', expected: '缩放' },
  { key: 'menu.front', expected: '前置全部窗口' },
  
  // 帮助菜单
  { key: 'menu.help', expected: '帮助' },
  { key: 'menu.systemInfo', expected: '系统信息' },
  { key: 'menu.checkForUpdates', expected: '检查更新' },
  { key: 'menu.reportIssue', expected: '报告问题' },
  { key: 'menu.learnMore', expected: '了解更多' },
  
  // 语言菜单
  { key: 'menu.chinese', expected: '中文' },
  { key: 'menu.english', expected: 'English' }
];

let passCount = 0;
let failCount = 0;

console.log('🔍 测试所有菜单项翻译:');
console.log('');

menuItems.forEach((item, index) => {
  const actual = item.params ? 
    i18nManager.t(item.key, item.params) : 
    i18nManager.t(item.key);
  
  const passed = actual === item.expected;
  const status = passed ? '✅' : '❌';
  
  if (passed) {
    passCount++;
  } else {
    failCount++;
  }
  
  console.log(`${status} ${item.key}: "${actual}" ${!passed ? `(期望: "${item.expected}")` : ''}`);
});

console.log('');
console.log('=== 测试结果统计 ===');
console.log(`✅ 通过: ${passCount}`);
console.log(`❌ 失败: ${failCount}`);
console.log(`📊 总计: ${passCount + failCount}`);
console.log(`📈 成功率: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);

console.log('');
console.log('=== 特殊功能测试 ===');

// 测试语言切换
console.log('🔄 测试语言切换功能:');
console.log('切换到英文...');
i18nManager.setLanguage('en-US');
const englishAppName = i18nManager.t('app.name');
console.log(`✅ 英文应用名称: "${englishAppName}"`);

console.log('切换回中文...');
i18nManager.setLanguage('zh-CN');
const chineseAppName = i18nManager.t('app.name');
console.log(`✅ 中文应用名称: "${chineseAppName}"`);

console.log('');
console.log('🎯 关键修复验证:');
console.log('1. 参数插值测试:');
const hideText = i18nManager.t('menu.hide', { appName: chineseAppName });
const quitText = i18nManager.t('menu.quit', { appName: chineseAppName });
console.log(`   隐藏菜单: "${hideText}"`);
console.log(`   退出菜单: "${quitText}"`);

console.log('');
console.log('2. 编辑菜单测试 (之前的role冲突):');
console.log(`   撤销: "${i18nManager.t('menu.undo')}"`);
console.log(`   重做: "${i18nManager.t('menu.redo')}"`);
console.log(`   剪切: "${i18nManager.t('menu.cut')}"`);
console.log(`   复制: "${i18nManager.t('menu.copy')}"`);
console.log(`   粘贴: "${i18nManager.t('menu.paste')}"`);

console.log('');
console.log('3. 系统级菜单测试 (之前使用role属性):');
console.log(`   服务: "${i18nManager.t('menu.services')}"`);
console.log(`   隐藏其他: "${i18nManager.t('menu.hideOthers')}"`);
console.log(`   显示全部: "${i18nManager.t('menu.showAll')}"`);
console.log(`   前置全部窗口: "${i18nManager.t('menu.front')}"`);
console.log(`   开始朗读: "${i18nManager.t('menu.startSpeaking')}"`);
console.log(`   停止朗读: "${i18nManager.t('menu.stopSpeaking')}"`);

if (failCount === 0) {
  console.log('');
  console.log('🎉 所有菜单项翻译测试通过！Mac菜单栏现在应该完全显示为中文。');
} else {
  console.log('');
  console.log('⚠️  有部分翻译测试失败，请检查上述失败项目。');
}
