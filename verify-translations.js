#!/usr/bin/env node
/**
 * 翻译验证脚本
 * 检查菜单翻译是否正确
 */

const path = require('path');

// 模拟 electron app
const mockApp = {
  getLocale: () => 'zh-CN',
  setName: (name) => console.log(`App name set to: ${name}`)
};

// 创建模拟的 electron 模块
const electron = {
  app: mockApp
};

// 将模拟的 electron 设置到 require 缓存中
require.cache[require.resolve('electron')] = {
  exports: electron
};

try {
  const i18n = require('./utils/i18nManager');
  
  console.log('=== 菜单翻译验证 ===');
  console.log('当前语言:', i18n.getCurrentLanguage());
  
  // 测试应用名称
  const appName = i18n.t('app.name');
  console.log('应用名称:', appName);
  
  // 测试菜单项
  console.log('\\n=== 编辑菜单翻译 ===');
  console.log('撤销:', i18n.t('menu.undo'));
  console.log('重做:', i18n.t('menu.redo'));
  console.log('剪切:', i18n.t('menu.cut'));
  console.log('复制:', i18n.t('menu.copy'));
  console.log('粘贴:', i18n.t('menu.paste'));
  console.log('全选:', i18n.t('menu.selectAll'));
  
  // 测试带参数的翻译
  console.log('\\n=== 带参数的翻译 ===');
  console.log('隐藏应用:', i18n.t('menu.hide', { appName: appName }));
  console.log('退出应用:', i18n.t('menu.quit', { appName: appName }));
  
  // 测试英文
  console.log('\\n=== 英文翻译测试 ===');
  i18n.setLanguage('en-US');
  const appNameEn = i18n.t('app.name');
  console.log('App name:', appNameEn);
  console.log('Undo:', i18n.t('menu.undo'));
  console.log('Redo:', i18n.t('menu.redo'));
  console.log('Hide app:', i18n.t('menu.hide', { appName: appNameEn }));
  console.log('Quit app:', i18n.t('menu.quit', { appName: appNameEn }));
  
  console.log('\\n✅ 翻译验证完成！');
  
} catch (error) {
  console.error('❌ 翻译验证失败:', error);
  process.exit(1);
}
