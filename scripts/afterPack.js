const path = require('path');
const fs = require('fs');

/**
 * afterPack hook for electron-builder
 * Handles platform-specific post-packaging tasks
 */
module.exports = async function afterPack(context) {
  console.log('AfterPack hook called for:', context.platformName);
  console.log('Build platform:', process.platform);

  // Only process Windows builds for icon embedding
  if (context.platformName !== 'win32') {
    console.log('Skipping afterPack for non-Windows platform:', context.platformName);
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

  // Only attempt rcedit on Windows platform or if building for Windows
  if (process.platform === 'win32') {
    try {
      const rcedit = require('rcedit');
      console.log('Attempting to set icon using rcedit...');
      
      await rcedit(executablePath, {
        icon: iconPath
      });
      
      console.log('Icon set successfully using rcedit');
    } catch (error) {
      console.warn('Failed to set icon using rcedit:', error.message);
      // Don't throw error, just warn - this is not critical for functionality
    }
  } else {
    console.log('Skipping rcedit on non-Windows platform - will be handled during Windows build');
  }
};