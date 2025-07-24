// artifactBuildCompleted 钩子 - 过滤单个构建产物
const fs = require('fs').promises;
const path = require('path');

module.exports = async function(context) {
  console.log('artifactBuildCompleted hook called');
  console.log('Artifact file:', context.file);
  console.log('Context keys:', Object.keys(context));
  
  const fileName = path.basename(context.file);
  
  // 如果是 .yml 或 .blockmap 文件，不发布此文件
  if (fileName.endsWith('.yml') || fileName.endsWith('.yaml') || fileName.endsWith('.blockmap')) {
    console.log('🚫 跳过发布文件:', fileName);
    return null; // 返回 null 表示不发布此文件
  }
  
  // 过滤不带架构标识的 Windows 文件
  // 这些文件通常是默认生成的，我们只要带有 x64 或 arm64 标识的版本
  const isWindowsFile = fileName.includes('windows');
  const hasArchIdentifier = fileName.includes('_x64_') || fileName.includes('_arm64_');
  
  if (isWindowsFile && !hasArchIdentifier) {
    // 检查是否存在对应的带架构标识的文件
    const hasX64Version = fileName.replace(/(_\d+\.\d+\.\d+)\./, '_x64$1.');
    const hasArm64Version = fileName.replace(/(_\d+\.\d+\.\d+)\./, '_arm64$1.');
    
    console.log('🚫 跳过不带架构标识的 Windows 文件:', fileName);
    console.log('   (应该有对应的 x64 和 arm64 版本)');
    return null; // 不发布不带架构标识的文件
  }
  
  console.log('✅ 允许发布文件:', fileName);
  return context.file; // 返回文件路径表示继续发布
};
