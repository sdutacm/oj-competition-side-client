#!/usr/bin/env node

/**
 * 本地测试上传脚本
 * 用于在本地环境测试 COS 上传功能
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Local COS Upload Test Helper');
console.log('=====================================\n');

console.log('📋 Environment Variables Check:');
const requiredVars = ['COS_SECRET_ID', 'COS_SECRET_KEY', 'COS_REGION', 'COS_BUCKET'];
const optionalVars = ['COS_DOMAIN', 'TAG_NAME'];

let allSet = true;
requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        console.log(`✅ ${varName}: Set (${value.substring(0, 8)}...)`);
    } else {
        console.log(`❌ ${varName}: Missing`);
        allSet = false;
    }
});

optionalVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        console.log(`✅ ${varName}: ${value}`);
    } else {
        console.log(`⚠️  ${varName}: Not set (optional)`);
    }
});

console.log('\n📁 Downloads Directory Check:');
const downloadsDir = './downloads';
if (fs.existsSync(downloadsDir)) {
    const files = fs.readdirSync(downloadsDir).filter(f => {
        const filePath = path.join(downloadsDir, f);
        return fs.statSync(filePath).isFile();
    });
    
    console.log(`✅ Downloads directory exists with ${files.length} files:`);
    files.forEach(file => {
        const filePath = path.join(downloadsDir, file);
        const stats = fs.statSync(filePath);
        const sizeKB = (stats.size / 1024).toFixed(2);
        console.log(`   📄 ${file} (${sizeKB} KB)`);
    });
} else {
    console.log('❌ Downloads directory not found');
    allSet = false;
}

console.log('\n🚀 Test Commands:');
console.log('1. Test COS connection: npm run test:cos');
console.log('2. Test upload with current settings: npm run test:upload');
console.log('3. Upload with custom tag: TAG_NAME=v1.3.6 npm run upload:cos');

if (!allSet) {
    console.log('\n💡 Setup Instructions:');
    console.log('1. Set environment variables:');
    console.log('   export COS_SECRET_ID="your-secret-id"');
    console.log('   export COS_SECRET_KEY="your-secret-key"');
    console.log('   export COS_REGION="ap-beijing"');
    console.log('   export COS_BUCKET="your-bucket-name"');
    console.log('   export COS_DOMAIN="your-custom-domain" # optional');
    console.log('   export TAG_NAME="v1.3.6"');
    console.log('');
    console.log('2. Ensure downloads directory has files to upload');
    console.log('');
    console.log('3. Run: npm run test:upload');
    
    process.exit(1);
} else {
    console.log('\n🎉 All checks passed! Ready to test upload.');
    process.exit(0);
}
