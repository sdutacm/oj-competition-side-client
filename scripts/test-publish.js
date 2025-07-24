#!/usr/bin/env node

// 测试发布配置的脚本
const packageJson = require('../package.json');

console.log('=== 发布配置检查 ===');
console.log('Package name:', packageJson.name);
console.log('Package version:', packageJson.version);
console.log('Build configuration exists:', !!packageJson.build);
console.log('Publish configuration exists:', !!packageJson.build.publish);

if (packageJson.build.publish) {
  console.log('Publish provider:', packageJson.build.publish.provider);
  console.log('Publish owner:', packageJson.build.publish.owner);
  console.log('Publish repo:', packageJson.build.publish.repo);
}

console.log('\n=== 环境变量检查 ===');
console.log('GH_TOKEN exists:', !!process.env.GH_TOKEN);
console.log('GITHUB_TOKEN exists:', !!process.env.GITHUB_TOKEN);

console.log('\n=== Git 信息 ===');
const { execSync } = require('child_process');

try {
  const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  console.log('Current branch:', currentBranch);
  
  const latestTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
  console.log('Latest tag:', latestTag);
  
  const isTagMatch = latestTag === `v${packageJson.version}`;
  console.log('Tag matches package version:', isTagMatch);
  
  if (!isTagMatch) {
    console.log('⚠️  Warning: Git tag does not match package.json version');
    console.log(`Expected tag: v${packageJson.version}, Got: ${latestTag}`);
  }
} catch (error) {
  console.log('Git commands failed:', error.message);
}

console.log('\n=== 建议 ===');
console.log('1. 确保创建了正确格式的git标签：git tag v' + packageJson.version);
console.log('2. 推送标签到远程仓库：git push origin v' + packageJson.version);
console.log('3. 检查GitHub Actions的权限设置');
console.log('4. 确认repository settings中的Actions权限允许写入');
