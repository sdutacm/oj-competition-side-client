const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    asar: true,
    name: 'SDUT OJ 竞赛客户端',
    executableName: 'sdut-oj-contest-client', // 设置可执行文件名
    // 根据平台设置不同的图标
    icon: process.platform === 'darwin' ? 'public/favicon.icns' : 
          process.platform === 'linux' ? 'public/favicon.png' : 'public/favicon.ico',
    // 应用程序包标识符
    appBundleId: 'com.sdutacm.oj.client',
    // 应用程序版本
    appVersion: '1.0.0',
    // 应用程序类别 (macOS)
    appCategoryType: 'public.app-category.education',
    // 应用程序版权信息
    appCopyright: '© 2008-2025 SDUTACM. All Rights Reserved.',
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        // Windows 安装程序配置
        name: 'SDUT OJ 竞赛客户端',
        authors: 'SDUTACM',
        description: 'SDUT OJ 竞赛客户端 - 专业的在线评测系统客户端应用程序',
        iconUrl: 'public/favicon.ico',
        setupIcon: 'public/favicon.ico',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux', 'win32'],
      config: {
        // 跨平台 ZIP 包配置
      },
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        // Linux DEB 包配置
        options: {
          name: 'sdut-oj-contest-client',
          productName: 'SDUT OJ 竞赛客户端',
          description: 'SDUT OJ 竞赛客户端 - 专业的在线评测系统客户端应用程序',
          categories: ['Education'],
          maintainer: 'SDUTACM',
          icon: 'public/favicon.png',
        },
      },
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
