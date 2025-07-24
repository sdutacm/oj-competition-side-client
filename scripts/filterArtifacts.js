// 过滤发布文件，排除 .yml 和 .blockmap 文件
const fs = require('fs').promises;
const path = require('path');
const { glob } = require('glob');

module.exports = async function(context) {
  console.log('afterAllArtifactBuild hook called');
  
  const { outDir } = context;
  console.log('Output directory:', outDir);
  
  try {
    // 查找所有 .yml, .yaml 和 .blockmap 文件
    const patterns = [
      '**/*.yml',
      '**/*.yaml', 
      '**/*.blockmap'
    ];
    
    for (const pattern of patterns) {
      const files = await glob(pattern, { cwd: outDir, absolute: true });
      
      for (const file of files) {
        try {
          await fs.unlink(file);
          console.log('🚫 删除文件:', path.relative(outDir, file));
        } catch (error) {
          console.log('删除文件失败:', file, error.message);
        }
      }
    }
    
    console.log('✅ 文件过滤完成');
  } catch (error) {
    console.error('过滤文件时出错:', error);
  }
};
