const { globalShortcut } = require('electron');
const PlatformHelper = require('./platformHelper');
const { showInfoDialog } = require('./dialogHelper');

class ShortcutManager {
  constructor(contentViewManager, homeUrl, mainWindow = null) {
    this.contentViewManager = contentViewManager;
    this.homeUrl = homeUrl;
    this.mainWindow = mainWindow;
    this.shortcuts = PlatformHelper.getNavigationShortcuts();
  }

  /**
   * 设置主窗口引用
   */
  setMainWindow(mainWindow) {
    this.mainWindow = mainWindow;
  }

  /**
   * 注册所有快捷键
   */
  registerShortcuts() {
    try {
      // 后退 
      globalShortcut.register(this.shortcuts.back, () => {
        const webContents = this.contentViewManager.getWebContents();
        if (webContents) {
          try {
            if (webContents.navigationHistory && webContents.navigationHistory.canGoBack()) {
              webContents.navigationHistory.goBack();
            } else if (webContents.canGoBack()) {
              webContents.goBack();
            }
          } catch (error) {
            console.error('后退操作失败:', error);
          }
        }
      });

      // 前进
      globalShortcut.register(this.shortcuts.forward, () => {
        const webContents = this.contentViewManager.getWebContents();
        if (webContents) {
          try {
            if (webContents.navigationHistory && webContents.navigationHistory.canGoForward()) {
              webContents.navigationHistory.goForward();
            } else if (webContents.canGoForward()) {
              webContents.goForward();
            }
          } catch (error) {
            console.error('前进操作失败:', error);
          }
        }
      });

      // 刷新
      globalShortcut.register(this.shortcuts.refresh, () => {
        const webContents = this.contentViewManager.getWebContents();
        if (webContents) {
          webContents.reload();
        }
      });

      // 主页
      globalShortcut.register(this.shortcuts.home, () => {
        const webContents = this.contentViewManager.getWebContents();
        if (webContents) {
          webContents.loadURL(this.homeUrl);
        }
      });

      // 系统信息
      globalShortcut.register('Alt+I', () => {
        if (this.mainWindow) {
          showInfoDialog(this.mainWindow);
        }
      });
    } catch (error) {
      console.error('注册快捷键失败:', error);
    }
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

    try {
      switch(action) {
        case 'back':
          if (webContents.navigationHistory && webContents.navigationHistory.canGoBack()) {
            webContents.navigationHistory.goBack();
          } else if (webContents.canGoBack()) {
            webContents.goBack();
          }
          // 延迟更新状态，等待导航完成
          setTimeout(() => {
            this.contentViewManager.updateNavigationState();
          }, 100);
          break;
        case 'forward':
          if (webContents.navigationHistory && webContents.navigationHistory.canGoForward()) {
            webContents.navigationHistory.goForward();
          } else if (webContents.canGoForward()) {
            webContents.goForward();
          }
          // 延迟更新状态，等待导航完成
          setTimeout(() => {
            this.contentViewManager.updateNavigationState();
          }, 100);
          break;
        case 'refresh':
          webContents.reload();
          break;
        case 'home':
          webContents.loadURL(this.homeUrl);
          break;
        case 'info':
          if (this.mainWindow) {
            showInfoDialog(this.mainWindow);
          }
          break;
      }
    } catch (error) {
      console.error('处理工具栏动作失败:', error);
    }
  }
}

module.exports = ShortcutManager;
