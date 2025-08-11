const fs = require('fs');
const path = require('path');

function createReleaseIndex(tagName, cdnUrl, context) {
  const versionPath = `oj-competition-side-client/release/${tagName}`;  // 修改为完整路径

  console.log('Creating release index...');

  // 读取下载的文件信息
  const downloadDir = './downloads';
  const files = [];
  
  if (fs.existsSync(downloadDir)) {
    const fileList = fs.readdirSync(downloadDir);
    
    for (const fileName of fileList) {
      if (fileName !== 'assets.json') {
        const filePath = path.join(downloadDir, fileName);
        const stats = fs.statSync(filePath);
        
        // CDN URL 应该匹配实际的上传路径
        const safeKey = `${versionPath}/${fileName}`.replace(/ /g, '_');
        
        // 智能处理 CDN URL，避免路径重复
        let cdnFileUrl;
        const normalizedCdnUrl = cdnUrl.replace(/\/$/, '');
        
        // 检查 CDN URL 是否已经包含项目路径
        if (normalizedCdnUrl.includes('oj-competition-side-client')) {
          // CDN URL 已包含项目路径，只添加 release/tagName/fileName
          cdnFileUrl = `${normalizedCdnUrl}/release/${tagName}/${fileName}`;
        } else {
          // CDN URL 是基础路径，添加完整路径
          cdnFileUrl = `${normalizedCdnUrl}/${safeKey}`;
        }
        
        files.push({
          name: fileName,
          cos_key: safeKey,
          cdn_url: cdnFileUrl,
          size: stats.size
        });
        
        console.log(`${fileName} -> ${cdnFileUrl}`);
      }
    }
  }
  
  // 创建完整的索引数据（用于其他用途）
  const indexData = {
    version: tagName,
    upload_time: Math.floor(Date.now() / 1000),
    files: files,
    total_files: files.length,
    repository: context.repo.owner + '/' + context.repo.repo
  };
  
  // 保存完整索引文件
  const fullIndexFile = path.join(downloadDir, 'release-index.json');
  fs.writeFileSync(fullIndexFile, JSON.stringify(indexData, null, 2));

  // 创建简单的版本索引文件给更新检测使用
  const versionData = {
    version: tagName.replace(/^v/, '') // 移除v前缀，确保版本号格式正确
  };
  
  // 保存简单版本索引文件到 release 目录下
  const releaseDir = path.join(downloadDir, 'release');
  if (!fs.existsSync(releaseDir)) {
    fs.mkdirSync(releaseDir, { recursive: true });
  }
  
  const versionIndexFile = path.join(releaseDir, 'index.json');
  fs.writeFileSync(versionIndexFile, JSON.stringify(versionData, null, 2));

  console.log(`Created full index with ${files.length} files: release-index.json`);
  console.log(`Created version index for update detection: release/index.json`);
  console.log(`Version for update detection: ${versionData.version}`);
  console.log(`Version directory: ${cdnUrl.replace(/\/$/, '')}/${versionPath}/`);
  
  // 显示 CDN URL 处理逻辑信息
  const normalizedCdnUrl = cdnUrl.replace(/\/$/, '');
  if (normalizedCdnUrl.includes('oj-competition-side-client')) {
    console.log(`🔧 CDN URL contains project path, using simplified path structure`);
    console.log(`📂 Base CDN URL: ${normalizedCdnUrl}`);
    console.log(`📁 File URL pattern: ${normalizedCdnUrl}/release/${tagName}/[filename]`);
  } else {
    console.log(`🔧 CDN URL is base path, using full path structure`);
    console.log(`📂 Base CDN URL: ${normalizedCdnUrl}`);
    console.log(`📁 File URL pattern: ${normalizedCdnUrl}/${versionPath}/[filename]`);
  }
}

// 当直接运行脚本时，从环境变量读取参数
if (require.main === module) {
  const tagName = process.env.TAG_NAME;
  const cdnUrl = process.env.CDN_URL;
  
  if (!tagName || !cdnUrl) {
    console.error('Error: TAG_NAME and CDN_URL environment variables are required');
    process.exit(1);
  }
  
  // 创建一个简化的 context 对象
  const context = {
    repo: {
      owner: 'sdutacm',
      repo: 'oj-competition-side-client'
    }
  };
  
  createReleaseIndex(tagName, cdnUrl, context);
}

module.exports = { createReleaseIndex };
