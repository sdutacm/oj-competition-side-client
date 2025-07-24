// beforePublish 钩子 - 在发布前进行最后一次过滤
const fs = require('fs').promises;
const path = require('path');

module.exports = async function(context) {
  console.log('beforePublish hook called - 发布前最终检查');
  console.log('Context keys:', Object.keys(context));
  
  // 获取要发布的文件列表
  const { artifacts } = context;
  
  if (!artifacts || !Array.isArray(artifacts)) {
    console.log('No artifacts found or artifacts is not an array');
    return;
  }
  
  console.log('Original artifacts count:', artifacts.length);
  
  // 过滤掉不想要的文件
  const filteredArtifacts = [];
  
  for (const artifact of artifacts) {
    const fileName = path.basename(artifact.file);
    let shouldInclude = true;
    let filterReason = '';
    
    // 过滤 .yml, .yaml, .blockmap 文件
    if (fileName.endsWith('.yml') || fileName.endsWith('.yaml') || fileName.endsWith('.blockmap')) {
      shouldInclude = false;
      filterReason = '配置/映射文件';
    }
    
    // 过滤不带架构标识的 Windows 文件
    const isWindowsFile = fileName.includes('windows') && fileName.endsWith('.exe');
    const hasArchIdentifier = fileName.includes('_x64_') || fileName.includes('_arm64_');
    
    if (isWindowsFile && !hasArchIdentifier) {
      shouldInclude = false;
      filterReason = '不带架构标识的 Windows 文件';
    }
    
    if (shouldInclude) {
      filteredArtifacts.push(artifact);
      console.log('✅ 将发布:', fileName);
    } else {
      console.log(`🚫 跳过发布 (${filterReason}):`, fileName);
      
      // 尝试删除物理文件
      try {
        await fs.unlink(artifact.file);
        console.log('   📁 已删除物理文件');
      } catch (error) {
        console.log('   ❌ 删除物理文件失败:', error.message);
      }
    }
  }
  
  // 更新 artifacts 列表
  context.artifacts = filteredArtifacts;
  
  console.log(`Filtered artifacts: ${artifacts.length} → ${filteredArtifacts.length}`);
  console.log('beforePublish hook completed');
};
