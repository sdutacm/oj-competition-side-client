const os = require('os');
const path = require('path');

/**
 * 跨平台兼容性帮助工具
 */
class PlatformHelper {
  /**
   * 获取当前平台
   */
  static getPlatform() {
    return process.platform;
  }

  /**
   * 是否为 Windows 平台
   */
  static isWindows() {
    return process.platform === 'win32';
  }

  /**
   * 是否为 macOS 平台
   */
  static isMacOS() {
    return process.platform === 'darwin';
  }

  /**
   * 是否为 Linux 平台
   */
  static isLinux() {
    return process.platform === 'linux';
  }

  /**
   * 获取平台特定的路径分隔符
   */
  static getPathSeparator() {
    return path.sep;
  }

  /**
   * 规范化路径（确保跨平台兼容）
   */
  static normalizePath(inputPath) {
    return path.normalize(inputPath);
  }

  /**
   * 安全地构建路径
   */
  static joinPath(...paths) {
    return path.join(...paths);
  }

  /**
   * 获取平台特定的快捷键修饰符
   */
  static getModifierKey() {
    return this.isMacOS() ? 'Cmd' : 'Ctrl';
  }

  /**
   * 获取平台特定的导航快捷键
   */
  static getNavigationShortcuts() {
    const isWin = this.isWindows();
    const isMac = this.isMacOS();
    
    return {
      back: isMac ? 'Cmd+Left' : 'Alt+Left',
      forward: isMac ? 'Cmd+Right' : 'Alt+Right',
      refresh: isMac ? 'Cmd+R' : (isWin ? 'F5' : 'Ctrl+R'),
      home: isMac ? 'Cmd+H' : 'Alt+H'
    };
  }

  /**
   * 获取平台特定的应用配置
   */
  static getPlatformConfig() {
    const isWin = this.isWindows();
    const isMac = this.isMacOS();
    
    return {
      // Windows 需要更严格的安全设置
      webSecurity: isWin,
      // macOS 默认禁用节点集成
      nodeIntegration: false,
      // 上下文隔离在所有平台都启用
      contextIsolation: true,
      // Windows 需要禁用不安全内容
      allowRunningInsecureContent: !isWin,
      // 沙盒模式
      sandbox: false,
      // 是否启用实验性功能
      experimentalFeatures: !isWin
    };
  }

  /**
   * 获取系统信息
   */
  static getSystemInfo() {
    return {
      platform: this.getPlatform(),
      arch: os.arch(),
      release: os.release(),
      nodeVersion: process.version,
      electronVersion: process.versions.electron
    };
  }
}

module.exports = PlatformHelper;
