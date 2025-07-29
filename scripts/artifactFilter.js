// artifactBuildCompleted 钩子 - 过滤单个构建产物
const fs = require('fs').promises;
const path = require('path');

module.exports = async function(context) {
  console.log('artifactBuildCompleted hook called');
  console.log('Artifact file:', context.file);
  console.log('Context keys:', Object.keys(context));
  console.log('Context arch:', context.arch);
  
  // 只记录 target 的基本信息，避免循环引用
  if (context.target) {
    console.log('Context target name:', context.target.name);
    console.log('Context target arch:', context.target.arch);
  }
  
  const fileName = path.basename(context.file);
  console.log('Processing file:', fileName);
  
  // 如果是 .yml 或 .blockmap 文件，不发布此文件
  if (fileName.endsWith('.yml') || fileName.endsWith('.yaml') || fileName.endsWith('.blockmap')) {
    console.log('🚫 跳过发布文件 (配置/映射文件):', fileName);
    return null; // 返回 null 表示不发布此文件
  }
  
  // 更精确的 Windows 文件过滤逻辑
  const isWindowsFile = fileName.includes('windows');
  
  if (isWindowsFile) {
    // 检查文件名是否包含架构标识符
    const hasX64 = fileName.includes('_x64_');
    const hasArm64 = fileName.includes('_arm64_');
    const hasArchIdentifier = hasX64 || hasArm64;
    
    console.log(`Windows file analysis for: ${fileName}`);
    console.log(`  - Has x64 identifier: ${hasX64}`);
    console.log(`  - Has arm64 identifier: ${hasArm64}`);
    console.log(`  - Has any arch identifier: ${hasArchIdentifier}`);
    
    if (!hasArchIdentifier) {
      // 这是一个不带架构标识符的 Windows 文件，需要过滤掉
      console.log('🚫 跳过不带架构标识的 Windows 文件:', fileName);
      console.log('   理由: Windows 文件必须包含 _x64_ 或 _arm64_ 标识符');
      return null; // 不发布不带架构标识的文件
    } else {
      console.log('✅ 允许发布带架构标识的 Windows 文件:', fileName);
    }
  }
  
  console.log('✅ 允许发布文件:', fileName);
  return context.file; // 返回文件路径表示继续发布
};
