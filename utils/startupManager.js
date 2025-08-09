const { app } = require('electron');
const fs = require('fs');
const path = require('path');

class StartupManager {
  constructor() {
    this.startupStateFile = path.join(app.getPath('userData'), 'startup-state.json');
  }

  /**
   * 检查是否需要显示启动窗口
   */
  shouldShowStartupWindow() {
    try {
      if (!fs.existsSync(this.startupStateFile)) {
        console.log('First time startup - will show startup window');
        return true;
      }
      const state = JSON.parse(fs.readFileSync(this.startupStateFile, 'utf8'));
      const shouldShow = state.showStartupOnNextLaunch === true;
      return shouldShow;
    } catch (error) {
      console.error('Error reading startup state:', error);
      return true;
    }
  }

  /**
   * 处理应用启动逻辑
   * @param {Function} onStartupComplete 启动完成后的回调
   */
  handleAppStartup(onStartupComplete) {
    console.log('HandleAppStartup called');

    if (this.shouldShowStartupWindow()) {
      console.log('Showing startup window - first time or after reset');
      this.showStartupWindow(() => {
        console.log('Startup window completed');
        if (onStartupComplete) onStartupComplete();
      });
    } else {
      console.log('Skipping startup window - not first time');
      if (onStartupComplete) onStartupComplete();
    }
  }

  /**
   * 显示启动窗口动画
   * @param {Function} callback 启动动画关闭后的回调
   */
  showStartupWindow(callback) {
    const { createStartupWindow } = require('./startupWindowHelper');
    return createStartupWindow(undefined, {
      width: 1000,
      height: 600,
      duration: 5000,
      onClose: () => {
        // 标记已显示，后续不再弹出
        try {
          this.markStartupShown();
        } catch (e) {}
        if (typeof callback === 'function') callback();
      }
    });
  }

  /**
   * 标记启动动画已播放，后续启动不再播放
   */
  markStartupShown() {
    try {
      const state = { showStartupOnNextLaunch: false };
      fs.writeFileSync(this.startupStateFile, JSON.stringify(state, null, 2), 'utf8');
      console.log('Startup animation marked as shown.');
    } catch (error) {
      console.error('Failed to mark startup animation as shown:', error);
    }
  }
}

module.exports = StartupManager;
