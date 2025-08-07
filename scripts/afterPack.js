const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

/**
 * afterPack hook for electron-builder
 * Handles platform-specific post-packaging tasks
 */
module.exports = async function afterPack(context) {
  const platformName = context.electronPlatformName || context.platformName || context.platform?.name || process.platform;
  console.log('AfterPack hook called for:', platformName);
  console.log('Build platform:', process.platform);
  console.log('Context platform info:', {
    electronPlatformName: context.electronPlatformName,
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

  // Handle Windows builds
  if (platformName === 'win32' || context.electronPlatformName === 'win32') {
    console.log('Processing Windows build...');

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

✅ 此应用包含自动白名单配置和运行时依赖检查！

📦 安装步骤:
1. 运行安装程序
2. 安装过程会自动检查并安装必需的 Visual C++ Redistributable
3. 自动将应用添加到 Windows Defender 白名单
4. 安装完成后可直接使用

⚠️ 如果遇到运行时错误:
1. 确保已安装 Microsoft Visual C++ Redistributable (x64)
   下载地址: https://aka.ms/vs/17/release/vc_redist.x64.exe
2. 如果杀毒软件有提示，请选择"允许"或"信任"此应用
3. 对于 C 盘安装问题，请尝试安装到其他驱动器
4. 确保 Windows 系统已更新到最新版本

🔧 Windows性能优化:
- 应用已针对Windows进行滚动和渲染优化
- 建议关闭不必要的后台程序以获得最佳性能
- 如果遇到显示问题，请更新显卡驱动程序

🛠️ 故障排除:
- "该文件没有与之关联的应用" 错误：重新安装 Visual C++ Redistributable
- "sxstrace.exe" 相关错误：运行 'sxstrace trace' 命令查看详细错误信息
- 应用无法启动：检查 Windows 事件查看器中的应用程序日志

📞 技术支持: https://github.com/sdutacm/oj-competition-side-client/issues

构建环境信息: ${process.platform === 'win32' ? 'Windows Native' : 'Cross-platform (macOS/Linux)'}
构建时间: ${new Date().toISOString()}
`;
    
    fs.writeFileSync(readmePath, readmeContent);
    console.log('📝 创建Windows用户说明文件完成');

    // Only attempt rcedit on Windows platform or use alternative approach for cross-platform builds
    console.log('Host platform:', process.platform);
    console.log('Target platform:', platformName);
    
    if (process.platform === 'win32') {
      // We're building on Windows, use rcedit directly
      try {
        const rcedit = require('rcedit');
        console.log('🎨 使用rcedit设置Windows可执行文件图标和信息（任务栏图标修复）...');
        
        await rcedit(executablePath, {
          icon: iconPath,
          'version-string': {
            'CompanyName': 'SDUTACM',
            'ProductName': 'SDUT OJ 竞赛客户端', 
            'FileDescription': 'SDUT OJ 竞赛客户端 - 专业的在线评测系统客户端',
            'FileVersion': context.packager.appInfo.buildVersion || '1.0.0',
            'ProductVersion': context.packager.appInfo.version || '1.0.0',
            'InternalName': 'SDUTOJCompetitionSideClient',
            'OriginalFilename': context.packager.appInfo.productFilename + '.exe',
            'LegalCopyright': 'Copyright © 2024 SDUTACM',
            'LegalTrademarks': 'SDUT OJ Competition Side Client',
            'PrivateBuild': '',
            'SpecialBuild': '',
            'Comments': '专业的在线评测系统客户端应用程序'
          },
          // 强化可执行文件图标嵌入 - 任务栏图标修复的关键
          'requested-execution-level': 'asInvoker'
        });
        
        console.log('✅ Windows可执行文件图标和版本信息设置完成（任务栏图标已修复）');
        
      } catch (error) {
        console.warn('⚠️  rcedit设置失败:', error.message);
        console.log('将依赖 electron-builder 的内置图标嵌入功能');
      }
    } else {
      // Cross-platform build - rely on electron-builder's built-in capabilities
      console.log('🔄 跨平台构建 - 依赖 electron-builder 内置图标嵌入功能');
      console.log('注意：任务栏图标修复主要依赖 NSIS 安装脚本和 main.js 中的 AppUserModelId 设置');
      
      // GitHub Actions 特殊处理：确保图标正确嵌入
      if (process.env.GITHUB_ACTIONS) {
        console.log('🤖 检测到 GitHub Actions 环境，应用强化图标嵌入...');
        
        // 在 GitHub Actions 中，强化图标嵌入以防止首次启动图标失效
        try {
          // 1. 确保图标文件被正确复制到多个位置
          const ciIconPaths = [
            path.join(context.appOutDir, 'favicon.ico'),
            path.join(context.appOutDir, 'app.ico'),
            path.join(context.appOutDir, 'icon.ico'),
            path.join(context.appOutDir, 'resources', 'favicon.ico'),
            path.join(context.appOutDir, 'resources', 'app', 'favicon.ico')
          ];
          
          ciIconPaths.forEach(targetPath => {
            try {
              const targetDir = path.dirname(targetPath);
              if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
              }
              if (!fs.existsSync(targetPath)) {
                fs.copyFileSync(iconPath, targetPath);
                console.log(`✅ CI: 图标复制到 ${path.basename(targetPath)}`);
              }
            } catch (copyErr) {
              console.warn(`⚠️  CI: 图标复制失败 ${path.basename(targetPath)}:`, copyErr.message);
            }
          });
          
          // 2. GitHub Actions 专用：创建启动脚本以确保图标正确显示
          const startupScriptPath = path.join(context.appOutDir, 'fix-taskbar-icon.bat');
          const startupScript = `@echo off
REM GitHub Actions build - Windows taskbar icon fix
REM This script helps fix the first-launch icon issue

echo Fixing Windows taskbar icon cache...
ie4uinit.exe -ClearIconCache >nul 2>&1
timeout /t 1 /nobreak >nul

echo Starting application...
start "" "%~dp0${context.packager.appInfo.productFilename}.exe"
`;
          
          fs.writeFileSync(startupScriptPath, startupScript);
          console.log('✅ CI: 创建图标修复启动脚本');
          
        } catch (ciError) {
          console.warn('⚠️  GitHub Actions 特殊处理失败:', ciError.message);
        }
      }
    }
    
    // Always ensure icon files are copied (works on all platforms)
    try {
      const outputIconPath = path.join(context.appOutDir, 'favicon.ico');
      if (!fs.existsSync(outputIconPath)) {
        fs.copyFileSync(iconPath, outputIconPath);
        console.log('✅ 图标文件复制到输出目录完成');
      }
    } catch (copyError) {
      console.warn('⚠️  图标文件复制失败:', copyError.message);
    }
    
    return;
  }

  // For other platforms
  console.log('Skipping afterPack for platform:', platformName);
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
