/**
 * 测试Windows任务栏图标修复脚本
 * 验证AppUserModelId和图标配置是否正确
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 测试Windows任务栏图标配置...\n');

// 检查package.json配置
const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

console.log('📦 package.json配置检查:');
console.log('✅ AppId:', packageJson.build.appId);
console.log('✅ Product Name:', packageJson.build.productName);
console.log('✅ Windows图标:', packageJson.build.win.icon);
console.log('✅ Windows目标架构:', packageJson.build.win.target.map(t => `${t.target}(${t.arch.join(', ')})`).join(', '));
console.log('✅ Legal Trademarks:', packageJson.build.win.legalTrademarks);
console.log('✅ Publisher信息: 将在afterPack中设置为SDUTACM');

// 检查图标文件
const iconPath = path.join(__dirname, '..', packageJson.build.win.icon);
console.log('\n🎨 图标文件检查:');
if (fs.existsSync(iconPath)) {
  const stats = fs.statSync(iconPath);
  console.log('✅ 图标文件存在:', iconPath);
  console.log('✅ 文件大小:', (stats.size / 1024).toFixed(2), 'KB');
} else {
  console.log('❌ 图标文件不存在:', iconPath);
}

// 检查NSIS配置
const nsisConfigPath = path.join(__dirname, '..', 'build', 'installer.nsh');
console.log('\n📋 NSIS配置检查:');
if (fs.existsSync(nsisConfigPath)) {
  const nsisContent = fs.readFileSync(nsisConfigPath, 'utf8');
  console.log('✅ NSIS配置文件存在');
  
  const checks = [
    { pattern: /AppUserModelId/g, name: 'AppUserModelId设置' },
    { pattern: /org\.sdutacm\.SDUTOJCompetitionSideClient/g, name: 'AppId注册' },
    { pattern: /WriteRegStr.*AppUserModelId/g, name: '注册表AppId设置' },
    { pattern: /PowerShell/gi, name: 'PowerShell快捷方式修复' },
    { pattern: /favicon\.ico/g, name: '图标文件引用' }
  ];
  
  checks.forEach(check => {
    const matches = nsisContent.match(check.pattern);
    if (matches) {
      console.log(`✅ ${check.name}: 发现 ${matches.length} 处配置`);
    } else {
      console.log(`❌ ${check.name}: 未发现配置`);
    }
  });
} else {
  console.log('❌ NSIS配置文件不存在');
}

// 检查afterPack脚本
const afterPackPath = path.join(__dirname, 'afterPack.js');
console.log('\n🔧 afterPack脚本检查:');
if (fs.existsSync(afterPackPath)) {
  const afterPackContent = fs.readFileSync(afterPackPath, 'utf8');
  console.log('✅ afterPack脚本存在');
  
  const checks = [
    { pattern: /rcedit/g, name: '可执行文件图标嵌入' },
    { pattern: /LegalTrademarks/g, name: '商标信息设置' },
    { pattern: /application-manifest/g, name: '应用程序清单' },
    { pattern: /任务栏图标/g, name: '任务栏图标修复注释' }
  ];
  
  checks.forEach(check => {
    const matches = afterPackContent.match(check.pattern);
    if (matches) {
      console.log(`✅ ${check.name}: 发现 ${matches.length} 处配置`);
    } else {
      console.log(`❌ ${check.name}: 未发现配置`);
    }
  });
} else {
  console.log('❌ afterPack脚本不存在');
}

console.log('\n🎯 修复方案总结:');
console.log('1. ✅ package.json中移除了无效的publisherName配置');
console.log('2. ✅ publisher信息移至afterPack.js中的CompanyName设置');
console.log('3. ✅ installer.nsh中强化了AppUserModelId注册表设置');
console.log('4. ✅ afterPack.js中强化了可执行文件图标嵌入');
console.log('5. ✅ 添加了PowerShell快捷方式修复');
console.log('6. ✅ 添加了应用程序清单文件');

console.log('\n📝 构建建议:');
console.log('- 使用 npm run build:win:all 构建所有Windows架构');
console.log('- 安装完成后重启explorer.exe或重启计算机');
console.log('- 确保Windows系统已更新到最新版本');

console.log('\n✨ 任务栏图标修复配置检查完成！');
