#!/usr/bin/env node
/**
 * 国际化测试脚本
 * 验证 i18n-js 的功能是否正常
 */

const path = require('path');
const fs = require('fs');

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
  // 测试 i18n 管理器
  const i18n = require('./utils/i18nManager');
  
  console.log('=== 国际化测试 ===');
  console.log('当前语言:', i18n.getCurrentLanguage());
  console.log('可用语言:', i18n.getAvailableLanguages());
  
  console.log('\\n=== 中文测试 ===');
  console.log('应用名称:', i18n.t('app.name'));
  console.log('菜单-文件:', i18n.t('menu.file'));
  console.log('菜单-编辑:', i18n.t('menu.edit'));
  console.log('菜单-关于:', i18n.t('menu.about'));
  console.log('退出应用:', i18n.t('menu.quit', { appName: i18n.t('app.name') }));
  
  console.log('\\n=== 切换到英文 ===');
  i18n.setLanguage('en-US');
  console.log('当前语言:', i18n.getCurrentLanguage());
  console.log('应用名称:', i18n.t('app.name'));
  console.log('菜单-文件:', i18n.t('menu.file'));
  console.log('菜单-编辑:', i18n.t('menu.edit'));
  console.log('菜单-关于:', i18n.t('menu.about'));
  console.log('退出应用:', i18n.t('menu.quit', { appName: i18n.t('app.name') }));
  
  console.log('\\n=== 参数插值测试 ===');
  console.log('版本信息:', i18n.t('app.version', { version: '1.0.0' }));
  console.log('系统信息:', i18n.t('system.electron', { version: '27.0.0' }));
  
  console.log('\\n=== 回退到中文 ===');
  i18n.setLanguage('zh-CN');
  console.log('当前语言:', i18n.getCurrentLanguage());
  console.log('应用名称:', i18n.t('app.name'));
  
  console.log('\\n=== 翻译键存在性检查 ===');
  console.log('app.name 存在:', i18n.exists('app.name'));
  console.log('nonexistent.key 存在:', i18n.exists('nonexistent.key'));
  
  console.log('\\n✅ 国际化测试完成！');
  
} catch (error) {
  console.error('❌ 国际化测试失败:', error);
  process.exit(1);
}
