const { globalShortcut } = require('electron');

class ShortcutManager {
  constructor(contentViewManager, homeUrl) {
    this.contentViewManager = contentViewManager;
    this.homeUrl = homeUrl;
  }

  /**
   * 注册所有快捷键
   */
  registerShortcuts() {
    // 后退
    globalShortcut.register('Alt+Left', () => {
      const webContents = this.contentViewManager.getWebContents();
      if (webContents && webContents.navigationHistory.canGoBack()) {
        webContents.navigationHistory.goBack();
      }
    });

    // 前进
    globalShortcut.register('Alt+Right', () => {
      const webContents = this.contentViewManager.getWebContents();
      if (webContents && webContents.navigationHistory.canGoForward()) {
        webContents.navigationHistory.goForward();
      }
    });

    // 刷新
    globalShortcut.register('Alt+R', () => {
      const webContents = this.contentViewManager.getWebContents();
      if (webContents) {
        webContents.reload();
      }
    });

    // 主页
    globalShortcut.register('Alt+H', () => {
      const webContents = this.contentViewManager.getWebContents();
      if (webContents) {
        webContents.loadURL(this.homeUrl);
      }
    });
  }

  /**
   * 取消注册所有快捷键
   */
  unregisterAll() {
    globalShortcut.unregisterAll();
  }

  /**
   * 处理工具栏动作
   */
  handleToolbarAction(action) {
    const webContents = this.contentViewManager.getWebContents();
    if (!webContents) return;

    switch(action) {
      case 'back':
        if (webContents.navigationHistory.canGoBack()) {
          webContents.navigationHistory.goBack();
          // 延迟更新状态，等待导航完成
          setTimeout(() => {
            this.contentViewManager.updateNavigationState();
          }, 100);
        }
        break;
      case 'forward':
        if (webContents.navigationHistory.canGoForward()) {
          webContents.navigationHistory.goForward();
          // 延迟更新状态，等待导航完成
          setTimeout(() => {
            this.contentViewManager.updateNavigationState();
          }, 100);
        }
        break;
      case 'refresh':
        webContents.reload();
        break;
      case 'home':
        webContents.loadURL(this.homeUrl);
        break;
    }
  }
}

module.exports = ShortcutManager;
