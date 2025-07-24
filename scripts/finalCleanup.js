// 在所有构建产物完成后进行最终清理
const fs = require('fs').promises;
const path = require('path');

module.exports = async function(context) {
  console.log('afterAllArtifactBuild hook called - 开始最终清理');
  console.log('Context keys:', Object.keys(context));
  console.log('Artifact build results:', context.artifactPaths);
  
  const { outDir, artifactPaths } = context;
  console.log('Output directory:', outDir);
  
  try {
    // 删除所有 .yml, .yaml 和 .blockmap 文件
    await cleanAllUnwantedFiles(outDir);
    
    // 如果有 artifactPaths，也从中过滤
    if (artifactPaths && Array.isArray(artifactPaths)) {
      const filteredPaths = artifactPaths.filter(filePath => {
        const fileName = path.basename(filePath);
        const shouldExclude = fileName.endsWith('.yml') || fileName.endsWith('.yaml') || fileName.endsWith('.blockmap');
        if (shouldExclude) {
          console.log('🚫 从构建结果中移除:', fileName);
        }
        return !shouldExclude;
      });
      
      // 尝试修改 context（虽然可能不会生效）
      context.artifactPaths = filteredPaths;
    }
    
    console.log('✅ 最终清理完成');
  } catch (error) {
    console.error('清理过程中出错:', error);
  }
};

async function cleanAllUnwantedFiles(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // 递归清理子目录
        await cleanAllUnwantedFiles(fullPath);
      } else if (entry.isFile()) {
        const fileName = entry.name;
        let shouldDelete = false;
        let reason = '';
        
        // 删除 .yml, .yaml, .blockmap 文件
        if (fileName.endsWith('.yml') || fileName.endsWith('.yaml') || fileName.endsWith('.blockmap')) {
          shouldDelete = true;
          reason = '配置/映射文件';
        }
        
        // 删除不带架构标识的 Windows 文件
        const isWindowsFile = fileName.includes('windows') && fileName.endsWith('.exe');
        const hasArchIdentifier = fileName.includes('_x64_') || fileName.includes('_arm64_');
        
        if (isWindowsFile && !hasArchIdentifier) {
          shouldDelete = true;
          reason = '不带架构标识的 Windows 文件';
        }
        
        if (shouldDelete) {
          try {
            await fs.unlink(fullPath);
            console.log(`🚫 物理删除文件 (${reason}):`, path.relative(process.cwd(), fullPath));
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
