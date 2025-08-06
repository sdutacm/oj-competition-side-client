const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

/**
 * afterPack hook for electron-builder
 * Handles platform-specific post-packaging tasks
 */
module.exports = async function afterPack(context) {
  const platformName = context.platformName || context.platform?.name || process.platform;
  console.log('AfterPack hook called for:', platformName);
  console.log('Build platform:', process.platform);
  console.log('Context platform info:', {
    platformName: context.platformName,
    platform: context.platform,
    arch: context.arch
  });

  // Handle macOS builds
  if (platformName === 'darwin') {
    console.log('🍎 处理macOS应用...');
    
    // 查找.app文件
    const appFiles = fs.readdirSync(context.appOutDir).filter(file => file.endsWith('.app'));
    
    if (appFiles.length > 0) {
      const appPath = path.join(context.appOutDir, appFiles[0]);
      console.log(`📱 找到应用: ${appPath}`);
      
      try {
        // 移除隔离标记
        console.log('🧹 移除隔离标记...');
        await execPromise(`xattr -cr "${appPath}"`);
        
        // 移除现有签名
        console.log('🗑️  移除现有签名...');
        await execPromise(`codesign --remove-signature "${appPath}"`).catch(() => {
          // 忽略错误，可能没有签名
        });
        
        // 应用ad-hoc签名
        console.log('✍️  应用ad-hoc签名...');
        await execPromise(`codesign --force --deep --sign - "${appPath}"`);
        
        // 验证签名
        console.log('✅ 验证签名...');
        await execPromise(`codesign --verify --deep --strict "${appPath}"`);
        
        console.log('🎉 macOS应用处理完成!');
        
        // 创建用户说明文件
        const readmePath = path.join(context.appOutDir, 'README_MACOS.txt');
        const readmeContent = `SDUT OJ 竞赛客户端 - macOS 安装说明

✅ 此应用已经过自动化处理，可以直接使用！

📦 安装步骤:
1. 双击打开 DMG 文件
2. 将应用拖拽到 Applications 文件夹
3. 直接双击启动应用

⚠️ 如果仍然提示"无法打开"，请:
1. 右键点击应用 → 打开
2. 在弹出的对话框中点击"打开"

📞 技术支持: https://github.com/sdutacm/oj-competition-side-client/issues
`;
        
        fs.writeFileSync(readmePath, readmeContent);
        console.log('📝 创建macOS用户说明文件完成');
        
      } catch (error) {
        console.warn('⚠️  macOS处理过程中出现警告:', error.message);
        console.log('应用仍然可以使用，用户可能需要手动处理安全提示');
      }
    }
    return;
  }

  // Handle Windows builds (existing code)
  if (platformName !== 'win32') {
    console.log('Skipping afterPack for non-Windows/non-macOS platform:', platformName);
    return;
  }

  const executablePath = context.appOutDir + '/' + context.packager.appInfo.productFilename + '.exe';
  const iconPath = path.join(context.packager.projectDir, 'public', 'favicon.ico');

  console.log('Executable path:', executablePath);
  console.log('Icon path:', iconPath);

  // Check if files exist
  if (!fs.existsSync(executablePath)) {
    console.warn('Executable file not found:', executablePath);
    return;
  }

  if (!fs.existsSync(iconPath)) {
    console.warn('Icon file not found:', iconPath);
    return;
  }

  console.log('Both executable and icon files exist');

  // Create Windows user guide
  const readmePath = path.join(context.appOutDir, 'README_WINDOWS.txt');
  const readmeContent = `SDUT OJ 竞赛客户端 - Windows 安装说明

✅ 此应用包含自动白名单配置！

📦 安装步骤:
1. 运行安装程序
2. 安装过程会自动将应用添加到 Windows Defender 白名单
3. 安装完成后可直接使用

⚠️ 如果杀毒软件仍有提示:
- 请选择"允许"或"信任"此应用
- 或手动将应用添加到杀毒软件白名单

🔧 Windows性能优化:
- 应用已针对Windows进行滚动和渲染优化
- 建议关闭不必要的后台程序以获得最佳性能

📞 技术支持: https://github.com/sdutacm/oj-competition-side-client/issues
`;
  
  fs.writeFileSync(readmePath, readmeContent);
  console.log('📝 创建Windows用户说明文件完成');

  // Only attempt rcedit on Windows platform or if building for Windows
  if (process.platform === 'win32') {
    try {
      const rcedit = require('rcedit');
      console.log('🎨 使用rcedit设置Windows可执行文件图标和信息...');
      
      await rcedit(executablePath, {
        icon: iconPath,
        'version-string': {
          'CompanyName': 'SDUTACM',
          'ProductName': 'SDUT OJ 竞赛客户端',
          'FileDescription': 'SDUT OJ 竞赛客户端 - 专业的在线评测系统客户端',
          'FileVersion': context.packager.appInfo.buildVersion || '0.0.2',
          'ProductVersion': context.packager.appInfo.version || '0.0.2',
          'InternalName': 'SDUTOJCompetitionSideClient',
          'OriginalFilename': context.packager.appInfo.productFilename + '.exe',
          'LegalCopyright': 'Copyright © 2024 SDUTACM'
        }
      });
      
      console.log('✅ Windows可执行文件图标和版本信息设置完成');
      
      // 确保图标文件复制到输出目录供NSIS使用
      const outputIconPath = path.join(context.appOutDir, 'favicon.ico');
      if (!fs.existsSync(outputIconPath)) {
        fs.copyFileSync(iconPath, outputIconPath);
        console.log('✅ 图标文件复制到输出目录完成');
      }
      
    } catch (error) {
      console.warn('⚠️  rcedit设置失败:', error.message);
      // 尝试基本的图标复制
      try {
        const outputIconPath = path.join(context.appOutDir, 'favicon.ico');
        fs.copyFileSync(iconPath, outputIconPath);
        console.log('✅ 基本图标复制完成');
      } catch (copyError) {
        console.error('❌ 图标复制也失败:', copyError.message);
      }
    }
  } else {
    console.log('跳过rcedit - 在非Windows平台上构建，图标将在Windows构建时处理');
    // 但仍然复制图标文件
    try {
      const outputIconPath = path.join(context.appOutDir, 'favicon.ico');
      fs.copyFileSync(iconPath, outputIconPath);
      console.log('✅ 图标文件复制完成（跨平台构建）');
    } catch (copyError) {
      console.warn('⚠️  跨平台图标复制失败:', copyError.message);
    }
  }
};

function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}