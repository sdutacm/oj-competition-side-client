// artifactBuildCompleted 钩子 - 过滤单个构建产物
const fs = require('fs').promises;
const path = require('path');

module.exports = async function(context) {
  console.log('artifactBuildCompleted hook called');
  console.log('Artifact file:', context.file);
  
  const fileName = path.basename(context.file);
  
  // 如果是 .yml 或 .blockmap 文件，删除它
  if (fileName.endsWith('.yml') || fileName.endsWith('.yaml') || fileName.endsWith('.blockmap')) {
    try {
      await fs.unlink(context.file);
      console.log('🚫 删除构建产物:', fileName);
      return null; // 返回 null 表示不发布此文件
    } catch (error) {
      console.log('删除构建产物失败:', context.file, error.message);
    }
  }
  
  // 构建完成后，额外清理 dist 目录中的其他 yml 文件
  try {
    const distDir = path.dirname(context.file);
    const files = await fs.readdir(distDir);
    
    for (const file of files) {
      if (file.endsWith('.yml') || file.endsWith('.yaml') || file.endsWith('.blockmap')) {
        const filePath = path.join(distDir, file);
        try {
          await fs.unlink(filePath);
          console.log('🚫 额外删除文件:', file);
        } catch (error) {
          console.log('删除额外文件失败:', file, error.message);
        }
      }
    }
    
    // 也检查 resources 子目录
    const resourcesDir = path.join(distDir, 'linux-unpacked', 'resources');
    try {
      const resourceFiles = await fs.readdir(resourcesDir);
      for (const file of resourceFiles) {
        if (file.endsWith('.yml') || file.endsWith('.yaml')) {
          const filePath = path.join(resourcesDir, file);
          try {
            await fs.unlink(filePath);
            console.log('🚫 删除 resources 中的文件:', file);
          } catch (error) {
            console.log('删除 resources 文件失败:', file, error.message);
          }
        }
      }
    } catch (error) {
      // resources 目录可能不存在，忽略错误
    }
  } catch (error) {
    console.log('清理额外文件时出错:', error.message);
  }
  
  return context.file; // 返回文件路径表示继续发布
};
