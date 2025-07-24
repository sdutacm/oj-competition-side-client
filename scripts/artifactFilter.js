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
  
  console.log('✅ 允许发布文件:', fileName);
  return context.file; // 返回文件路径表示继续发布
};
