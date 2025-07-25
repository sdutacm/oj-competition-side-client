#!/usr/bin/env node

/**
 * 测试 COS 连接配置脚本
 * 用于验证 COS 配置是否正确，不进行实际文件上传
 */

console.log('🧪 Testing COS connection configuration...');

// 动态安装依赖
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

console.log(`📋 Configuration check:`);
console.log(`   COS_SECRET_ID: ${secretId ? '✅ Set' : '❌ Missing'}`);
console.log(`   COS_SECRET_KEY: ${secretKey ? '✅ Set' : '❌ Missing'}`);
console.log(`   COS_REGION: ${region || '❌ Missing'}`);
console.log(`   COS_BUCKET: ${bucket || '❌ Missing'}`);
console.log(`   COS_DOMAIN: ${domain || '⚠️  Not set (optional)'}`);

if (!secretId || !secretKey || !region || !bucket) {
    console.error('\n❌ Missing required environment variables');
    console.error('Required: COS_SECRET_ID, COS_SECRET_KEY, COS_REGION, COS_BUCKET');
    console.error('Optional: COS_DOMAIN');
    process.exit(1);
}

console.log(`\n🔧 Configuring COS client for region: ${region}, bucket: ${bucket}`);
if (domain) {
    console.log(`🌐 Using custom domain: ${domain}`);
}

// 创建COS客户端
const cosConfig = {
    SecretId: secretId,
    SecretKey: secretKey,
    Timeout: 30000, // 30秒超时，用于测试
};

// 如果提供了自定义域名，则添加到配置中
if (domain) {
    cosConfig.Domain = domain;
}

const cos = new COS(cosConfig);
console.log('✅ COS client created successfully');

// 测试连接
console.log('\n🧪 Testing COS connection...');
cos.getBucket({
    Bucket: bucket,
    Region: region,
}, function(err, data) {
    if (err) {
        console.error('❌ COS connection test failed:', err.message);
        console.error('💡 Please check your credentials and configuration');
        process.exit(1);
    } else {
        console.log('✅ COS connection test successful!');
        console.log(`📁 Bucket: ${bucket}`);
        console.log(`🌍 Region: ${region}`);
        if (domain) {
            console.log(`🌐 Custom Domain: ${domain}`);
        }
        console.log('\n🎉 Configuration is working correctly!');
        console.log('💡 You can now run the upload script with actual files.');
    }
});
