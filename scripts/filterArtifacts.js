// 过滤发布文件，排除 .yml 和 .blockmap 文件
module.exports = async function(context) {
  console.log('artifactBuildCompleted hook called');
  console.log('Context keys:', Object.keys(context));
  
  // 检查 context 中的文件属性
  if (context.file) {
    const fileName = context.file.toLowerCase();
    
    // 如果是 .yml、.yaml 或 .blockmap 文件，阻止发布
    if (fileName.endsWith('.yml') || 
        fileName.endsWith('.yaml') || 
        fileName.endsWith('.blockmap')) {
      console.log('🚫 过滤掉文件:', context.file);
      return false; // 返回 false 来阻止这个文件被发布
    }
    
    console.log('✅ 保留文件:', context.file);
    return true;
  }
  
  // 默认保留
  return true;
};
