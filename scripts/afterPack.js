const path = require('path');
const fs = require('fs');

exports.default = async function(context) {
  console.log('AfterPack hook called for:', context.packager.platform.name);
  
  if (context.packager.platform.name === 'windows') {
    const appOutDir = context.appOutDir;
    const executableName = 'SDUT OJ 竞赛客户端.exe';
    const executablePath = path.join(appOutDir, executableName);
    const iconPath = path.join(context.packager.info.projectDir, 'public', 'app.ico');
    
    console.log('Executable path:', executablePath);
    console.log('Icon path:', iconPath);
    
    // 检查文件是否存在
    if (fs.existsSync(executablePath) && fs.existsSync(iconPath)) {
      console.log('Both executable and icon files exist, trying to set icon...');
      
      try {
        // 尝试使用 rcedit 设置图标
        const { spawn } = require('child_process');
        
        // 首先尝试使用系统的 rcedit
        return new Promise((resolve, reject) => {
          const rcedit = spawn('rcedit', [executablePath, '--set-icon', iconPath], {
            stdio: 'inherit'
          });
          
          rcedit.on('close', (code) => {
            if (code === 0) {
              console.log('Icon set successfully using rcedit');
              resolve();
            } else {
              console.log('rcedit failed with code:', code);
              console.log('Icon embedding may not be available on this platform');
              resolve(); // 不要因为这个失败而阻止构建
            }
          });
          
          rcedit.on('error', (err) => {
            console.log('rcedit not available:', err.message);
            console.log('Icon embedding skipped');
            resolve(); // 继续构建
          });
        });
      } catch (error) {
        console.log('Error setting icon:', error.message);
      }
    } else {
      console.log('Missing files:');
      console.log('Executable exists:', fs.existsSync(executablePath));
      console.log('Icon exists:', fs.existsSync(iconPath));
    }
  }
};
