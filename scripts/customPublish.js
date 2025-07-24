// 自定义发布脚本，只上传我们想要的文件
const { Octokit } = require('@octokit/rest');
const fs = require('fs').promises;
const path = require('path');

module.exports = async function(context) {
  console.log('Custom publish hook called');
  console.log('Publishing info:', {
    version: context.packager.appInfo.version,
    buildVersion: context.packager.appInfo.buildVersion
  });

  // 这里可以实现自定义的发布逻辑
  // 但对于简单的过滤，我们还是依赖其他钩子
  
  return context;
};
