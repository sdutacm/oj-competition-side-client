// 在所有构建产物完成后执行清理（只清理不影响发布的文件）
const fs = require('fs').promises;
const path = require('path');

module.exports = async function(context) {
  console.log('afterAllArtifactBuild hook called - 开始清理非发布文件');
  
  const { outDir } = context;
  console.log('Output directory:', outDir);
  
  try {
    // 只清理特定的非发布文件
    await cleanNonPublishFiles(outDir);
    console.log('✅ 非发布文件清理完成');
  } catch (error) {
    console.error('清理过程中出错:', error);
  }
};

async function cleanNonPublishFiles(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // 特别处理 resources 目录中的 app-update.yml
        if (entry.name.includes('unpacked') || entry.name === 'mac' || entry.name === 'mac-arm64') {
          await cleanResourcesDirectory(fullPath);
        }
        // 递归清理子目录
        await cleanNonPublishFiles(fullPath);
      } else if (entry.isFile()) {
        const fileName = entry.name;
        // 只删除明确不需要发布的文件
        if (fileName === 'builder-debug.yml' || fileName === 'builder-effective-config.yaml') {
          try {
            await fs.unlink(fullPath);
            console.log('🚫 删除构建调试文件:', path.relative(process.cwd(), fullPath));
          } catch (error) {
            console.log('删除文件失败:', fileName, error.message);
          }
        }
      }
    }
  } catch (error) {
    console.log('读取目录失败:', dir, error.message);
  }
}

async function cleanResourcesDirectory(appDir) {
  try {
    const resourcesPath = path.join(appDir, 'Contents', 'Resources');
    
    try {
      const resourceFiles = await fs.readdir(resourcesPath);
      for (const file of resourceFiles) {
        if (file === 'app-update.yml') {
          const filePath = path.join(resourcesPath, file);
          try {
            await fs.unlink(filePath);
            console.log('🚫 删除应用内更新文件:', path.relative(process.cwd(), filePath));
          } catch (error) {
            console.log('删除应用内文件失败:', file, error.message);
          }
        }
      }
    } catch (error) {
      // resources 目录可能不存在或结构不同，忽略错误
    }
  } catch (error) {
    // 忽略错误
  }
}
