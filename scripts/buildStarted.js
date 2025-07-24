// 在发布之前进行最终的文件过滤
const fs = require('fs').promises;
const path = require('path');

module.exports = async function(context) {
  console.log('artifactBuildStarted hook called');
  console.log('Target:', context.targetPresentableName);
  console.log('Arch:', context.arch);
  console.log('Platform:', context.platform.name);
  
  // 我们可以在这里预先清理一些文件
  // 但主要的过滤还是依赖 artifactBuildCompleted
  
  return context;
};
