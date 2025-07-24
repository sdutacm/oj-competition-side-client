// 在所有构建产物完成后执行全面清理
const fs = require('fs').promises;
const path = require('path');

module.exports = async function(context) {
  console.log('afterAllArtifactBuild hook called - 开始全面清理');
  
  const { outDir } = context;
  console.log('Output directory:', outDir);
  
  try {
    // 递归查找所有 .yml, .yaml 和 .blockmap 文件
    await cleanDirectory(outDir);
    console.log('✅ 全面清理完成');
  } catch (error) {
    console.error('清理过程中出错:', error);
  }
};

async function cleanDirectory(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // 递归清理子目录
        await cleanDirectory(fullPath);
      } else if (entry.isFile()) {
        const fileName = entry.name;
        if (fileName.endsWith('.yml') || fileName.endsWith('.yaml') || fileName.endsWith('.blockmap')) {
          try {
            await fs.unlink(fullPath);
            console.log('🚫 删除文件:', path.relative(process.cwd(), fullPath));
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
