// 过滤发布文件，排除 .yml 和 .blockmap 文件
const fs = require('fs').promises;
const path = require('path');

module.exports = async function(context) {
  console.log('beforePublish hook called');
  console.log('Context keys:', Object.keys(context));
  
  if (context.outDir) {
    console.log('Output directory:', context.outDir);
  }
  
  // 对于 beforePublish 钩子，我们需要过滤 context 中的发布信息
  if (context.publishOptions && context.publishOptions.publish) {
    console.log('Publish options found:', context.publishOptions);
  }
  
  // 尝试访问所有可能的文件路径
  const possibleDirs = [
    context.outDir,
    context.buildDir,
    context.appDir,
    path.join(process.cwd(), 'dist')
  ].filter(Boolean);
  
  for (const dir of possibleDirs) {
    if (await dirExists(dir)) {
      console.log('Checking directory:', dir);
      await removeUnwantedFiles(dir);
    }
  }
  
  console.log('✅ beforePublish 钩子执行完成');
};

async function dirExists(dir) {
  try {
    const stat = await fs.stat(dir);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function removeUnwantedFiles(dir) {
  try {
    const files = await fs.readdir(dir, { recursive: true });
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      
      if (file.endsWith('.yml') || file.endsWith('.yaml') || file.endsWith('.blockmap')) {
        try {
          const stat = await fs.stat(fullPath);
          if (stat.isFile()) {
            await fs.unlink(fullPath);
            console.log('🚫 删除文件:', path.relative(dir, fullPath));
          }
        } catch (error) {
          console.log('删除文件失败:', fullPath, error.message);
        }
      }
    }
  } catch (error) {
    console.error('扫描目录失败:', dir, error.message);
  }
}
