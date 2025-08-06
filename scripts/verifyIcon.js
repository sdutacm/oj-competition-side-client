const fs = require('fs');
const path = require('path');

// 验证图标文件是否存在且有效
function verifyIcon() {
  const iconPath = path.join(__dirname, '..', 'public', 'favicon.ico');
  
  console.log('验证图标文件...');
  console.log('图标路径:', iconPath);
  
  if (!fs.existsSync(iconPath)) {
    console.error('❌ 图标文件不存在:', iconPath);
    process.exit(1);
  }
  
  const stats = fs.statSync(iconPath);
  console.log('✅ 图标文件存在');
  console.log('文件大小:', (stats.size / 1024).toFixed(2), 'KB');
  
  // 检查文件是否为有效的ICO格式
  const buffer = fs.readFileSync(iconPath);
  if (buffer.length < 4 || buffer[0] !== 0x00 || buffer[1] !== 0x00 || buffer[2] !== 0x01 || buffer[3] !== 0x00) {
    console.error('❌ 图标文件不是有效的ICO格式');
    process.exit(1);
  }
  
  console.log('✅ 图标文件格式有效');
  console.log('图标验证完成');
}

if (require.main === module) {
  verifyIcon();
}

module.exports = verifyIcon;
