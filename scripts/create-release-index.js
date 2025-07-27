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
        const cdnFileUrl = `${cdnUrl.replace(/\/$/, '')}/${safeKey}`;
        
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
  
  // 创建索引数据
  const indexData = {
    version: tagName,
    upload_time: Math.floor(Date.now() / 1000),
    files: files,
    total_files: files.length,
    repository: context.repo.owner + '/' + context.repo.repo
  };
  
  // 保存索引文件
  const indexFile = path.join(downloadDir, 'index.json');
  fs.writeFileSync(indexFile, JSON.stringify(indexData, null, 2));

  console.log(`Created index with ${files.length} files`);
  console.log(`Version directory: ${cdnUrl.replace(/\/$/, '')}/${versionPath}/`);
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
      owner: 'ATRIOR-LCL',
      repo: 'oj-competition-side-client'
    }
  };
  
  createReleaseIndex(tagName, cdnUrl, context);
}

module.exports = { createReleaseIndex };
