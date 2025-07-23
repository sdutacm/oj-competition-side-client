const path = require('path');
const fs = require('fs');

exports.default = async function(context) {
  console.log('AfterPack hook called for:', context.packager.platform.name);
  console.log('Build platform:', process.platform);
  
  if (context.packager.platform.name === 'windows') {
    const appOutDir = context.appOutDir;
    const executableName = 'SDUT OJ 竞赛客户端.exe';
    const executablePath = path.join(appOutDir, executableName);
    const iconPath = path.join(context.packager.info.projectDir, 'public', 'favicon.ico');
    
    console.log('Executable path:', executablePath);
    console.log('Icon path:', iconPath);
    
    // 检查文件是否存在
    if (fs.existsSync(executablePath) && fs.existsSync(iconPath)) {
      console.log('Both executable and icon files exist');
      
      // 如果是在 Windows 上构建，尝试使用 rcedit
      if (process.platform === 'win32') {
        try {
          const rcedit = require('rcedit');
          console.log('Attempting to set icon using rcedit...');
          
          await rcedit(executablePath, {
            'icon': iconPath
          });
          
          console.log('Icon set successfully using rcedit');
        } catch (error) {
          console.log('Error setting icon with rcedit:', error.message);
          console.log('Relying on electron-builder for icon embedding');
        }
      } else {
        console.log('Cross-platform build detected, relying on electron-builder for icon embedding');
      }
    } else {
      console.log('Missing files:');
      console.log('Executable exists:', fs.existsSync(executablePath));
      console.log('Icon exists:', fs.existsSync(iconPath));
    }
  }
};
