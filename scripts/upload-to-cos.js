#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function uploadToCOS() {
    console.log('🔧 Setting up Tencent Cloud COS upload with JavaScript SDK...');
    
    // 安装腾讯云COS JavaScript SDK
    console.log('📥 Installing Tencent Cloud COS JavaScript SDK...');
    const { execSync } = require('child_process');
    
    try {
        execSync('npm install cos-nodejs-sdk-v5', { stdio: 'inherit' });
        console.log('✅ COS JavaScript SDK installed successfully');
    } catch (error) {
        console.error('❌ Failed to install COS SDK:', error.message);
        process.exit(1);
    }
    
    // 导入COS SDK
    console.log('📦 Importing COS SDK...');
    const COS = require('cos-nodejs-sdk-v5');
    console.log('✅ COS SDK imported successfully');
    
    // 从环境变量获取配置
    console.log('🔍 Reading environment variables...');
    const secretId = process.env.COS_SECRET_ID;
    const secretKey = process.env.COS_SECRET_KEY;
    const region = process.env.COS_REGION;
    const bucket = process.env.COS_BUCKET;
    const domain = process.env.COS_DOMAIN;
    const tagName = process.env.TAG_NAME;
    
    if (!secretId || !secretKey || !region || !bucket || !tagName) {
        console.error('❌ Missing required environment variables');
        console.error('Required: COS_SECRET_ID, COS_SECRET_KEY, COS_REGION, COS_BUCKET, TAG_NAME');
        process.exit(1);
    }
    
    console.log(`🔧 Configuring COS client for region: ${region}, bucket: ${bucket}`);
    if (domain) {
        console.log(`🌐 Using custom domain: ${domain}`);
    }
    
    // 创建COS客户端
    const cosConfig = {
        SecretId: secretId,
        SecretKey: secretKey,
        Timeout: 1800000, // 30分钟超时，适合大文件上传
    };
    
    // 如果提供了自定义域名，则添加到配置中
    if (domain) {
        cosConfig.Domain = domain;
    }
    
    const cos = new COS(cosConfig);
    console.log('✅ COS client created successfully');
    
    // 工具函数：格式化文件大小
    function formatFileSize(bytes) {
        if (bytes === 0) return '0B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
    }
    
// 检查下载目录
console.log('📁 Checking downloads directory...');
const downloadsDir = './downloads';

// 如果不是在 GitHub Actions 环境中，检查是否有 dist 目录作为备选
if (!fs.existsSync(downloadsDir)) {
    console.log('⚠️  Downloads directory not found, checking for alternative directories...');
    
    // 检查是否有 dist 目录（本地构建目录）
    const distDir = './dist';
    if (fs.existsSync(distDir)) {
        console.log(`📁 Using dist directory: ${distDir}`);
        // 可以在这里添加从 dist 目录上传的逻辑
        console.log('💡 Note: This script is designed to run in GitHub Actions environment.');
        console.log('💡 If you want to upload local build files, please ensure they are in the downloads directory.');
        process.exit(0);
    } else {
        console.error('❌ Neither downloads nor dist directory found');
        console.error('💡 This script is designed to run in GitHub Actions workflow after downloading release assets.');
        console.error('💡 To run locally, you need to:');
        console.error('   1. Create a "downloads" directory');
        console.error('   2. Place the files you want to upload in that directory');
        console.error('   3. Set the required environment variables: COS_SECRET_ID, COS_SECRET_KEY, COS_REGION, COS_BUCKET, TAG_NAME');
        process.exit(1);
    }
}    // 扫描文件
    console.log(`📁 Scanning directory: ${downloadsDir}`);
    const allFiles = fs.readdirSync(downloadsDir);
    const files = allFiles.filter(f => {
        const filePath = path.join(downloadsDir, f);
        return fs.statSync(filePath).isFile() && f !== 'assets.json';
    });
    
    console.log(`📦 Found ${files.length} files to upload`);
    
    // 计算总大小
    let totalSize = 0;
    const fileSizes = {};
    
    for (const filename of files) {
        const filePath = path.join(downloadsDir, filename);
        const size = fs.statSync(filePath).size;
        fileSizes[filename] = size;
        totalSize += size;
    }
    
    console.log(`📊 Total size to upload: ${formatFileSize(totalSize)}`);
    
    // 上传文件函数
    function uploadFile(filePath, key) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            cos.uploadFile({
                Bucket: bucket,
                Region: region,
                Key: key,
                FilePath: filePath,
                onProgress: function(progressData) {
                    // 可选：显示上传进度
                    // console.log(`Progress: ${Math.round(progressData.percent * 100)}%`);
                }
            }, function(err, data) {
                const uploadTime = (Date.now() - startTime) / 1000;
                
                if (err) {
                    console.error(`❌ Upload failed: ${err.message}`);
                    reject(err);
                } else {
                    const fileSize = fileSizes[path.basename(filePath)];
                    const speed = uploadTime > 0 ? fileSize / uploadTime : 0;
                    
                    console.log(`✅ Successfully uploaded: ${path.basename(filePath)}`);
                    console.log(`   Time: ${uploadTime.toFixed(1)}s, Speed: ${formatFileSize(speed)}/s`);
                    resolve(data);
                }
            });
        });
    }
    
    // 开始上传
    const uploadedFiles = [];
    let uploadedSize = 0;
    let success = true;
    
    for (let i = 0; i < files.length; i++) {
        const filename = files[i];
        const filePath = path.join(downloadsDir, filename);
        const fileSize = fileSizes[filename];
        
        try {
            const key = `release/${tagName}/${filename}`;
            console.log(`📤 [${i + 1}/${files.length}] Uploading: ${filename} (${formatFileSize(fileSize)})`);
            console.log(`   Local: ${filePath}`);
            console.log(`   Remote: ${key}`);
            
            await uploadFile(filePath, key);
            
            uploadedSize += fileSize;
            const progress = (uploadedSize / totalSize * 100).toFixed(1);
            console.log(`   Progress: ${uploadedSize}/${totalSize} (${progress}%)`);
            
            uploadedFiles.push(filename);
        } catch (error) {
            console.error(`❌ Failed to upload ${filename}: ${error.message}`);
            success = false;
        }
    }
    
    // 上传摘要
    console.log('\n📊 Upload Summary:');
    console.log(`✅ Successfully uploaded: ${uploadedFiles.length} files`);
    if (uploadedFiles.length > 0) {
        uploadedFiles.forEach(f => console.log(`  - ${f}`));
    }
    
    if (success) {
        console.log(`\n🎉 All ${files.length} files uploaded successfully to COS!`);
        console.log(`📂 Remote path: release/${tagName}/`);
        
        // 上传index.json
        const indexFile = path.join(downloadsDir, 'index.json');
        if (fs.existsSync(indexFile)) {
            try {
                const indexSize = fs.statSync(indexFile).size;
                const indexKey = `release/${tagName}/index.json`;
                console.log(`📋 Uploading index.json (${formatFileSize(indexSize)})...`);
                
                await uploadFile(indexFile, indexKey);
                console.log('✅ Successfully uploaded index.json');
            } catch (error) {
                console.error(`❌ Failed to upload index.json: ${error.message}`);
            }
        }
    } else {
        console.error('\n❌ Some uploads failed');
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    uploadToCOS().catch(error => {
        console.error('❌ Upload process failed:', error);
        process.exit(1);
    });
}

module.exports = uploadToCOS;
