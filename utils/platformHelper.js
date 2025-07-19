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
   * 获取平台特定的导航快捷键（返回 accelerator 和可读字符串）
   */
  static getNavigationShortcuts() {
    const isWin = this.isWindows();
    const isMac = this.isMacOS();
    // accelerator: Electron 菜单用
    // label: 鼠标悬浮提示用
    return {
      back: isMac ? 'Cmd+Left' : 'Alt+Left',
      forward: isMac ? 'Cmd+Right' : 'Alt+Right',
      refresh: isMac ? 'Cmd+R' : (isWin ? 'F5' : 'Ctrl+R'),
      home: isMac ? 'Cmd+Shift+H' : 'Alt+H', // 避免 Cmd+H 冲突
      // 兼容 label 字段，前端可用 shortcuts.backLabel
      backLabel: isMac ? '⌘+←' : 'Alt+Left',
      forwardLabel: isMac ? '⌘+→' : 'Alt+Right',
      refreshLabel: isMac ? '⌘+R' : (isWin ? 'F5' : 'Ctrl+R'),
      homeLabel: isMac ? '⌘+⇧+H' : 'Alt+H' // 动态悬浮提示
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

  /**
   * 辅助函数，判断 input 是否匹配 accelerator
   */
  static matchShortcut(input, accelerator) {
    // accelerator 形如 'CmdOrCtrl+Left'、'Alt+I' 等
    const parts = accelerator.split('+');
    let ctrl = false, alt = false, shift = false, meta = false, key = '';
    for (const part of parts) {
      const p = part.toLowerCase();
      if (p === 'cmd' || p === 'command' || p === 'meta' || p === 'cmdorctrl') meta = true;
      else if (p === 'ctrl' || p === 'control') ctrl = true;
      else if (p === 'alt' || p === 'option') alt = true;
      else if (p === 'shift') shift = true;
      else key = part;
    }
    // Electron input 结构
    if (ctrl !== !!input.control) return false;
    if (alt !== !!input.alt) return false;
    if (shift !== !!input.shift) return false;
    if (meta !== !!input.meta) return false;
    if (key && key.toLowerCase() !== input.key.toLowerCase()) return false;
    return true;
  }
}

module.exports = PlatformHelper;
