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
            // 静默处理导航错误，避免在 macOS 上显示弹窗
            console.log('后退操作失败（已忽略）:', error.message);
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
            // 静默处理导航错误，避免在 macOS 上显示弹窗
            console.log('前进操作失败（已忽略）:', error.message);
          }
        }
      });

      // 刷新
      globalShortcut.register(this.shortcuts.refresh, () => {
        const webContents = this.contentViewManager.getWebContents();
        if (webContents) {
          try {
            webContents.reload();
          } catch (error) {
            console.log('刷新操作失败（已忽略）:', error.message);
          }
        }
      });

      // 主页
      globalShortcut.register(this.shortcuts.home, () => {
        const webContents = this.contentViewManager.getWebContents();
        if (webContents) {
          try {
            webContents.loadURL(this.homeUrl);
          } catch (error) {
            console.log('主页跳转失败（已忽略）:', error.message);
          }
        }
      });

      // 系统信息 - 根据平台使用不同快捷键
      const infoShortcut = process.platform === 'darwin' ? 'Cmd+I' : 'Alt+I';
      globalShortcut.register(infoShortcut, () => {
        if (this.mainWindow) {
          try {
            showInfoDialog(this.mainWindow);
          } catch (error) {
            console.log('显示系统信息失败（已忽略）:', error.message);
          }
        }
      });
    } catch (error) {
      console.log('注册快捷键失败（已忽略）:', error.message);
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
          try {
            if (webContents.navigationHistory && webContents.navigationHistory.canGoBack()) {
              webContents.navigationHistory.goBack();
            } else if (webContents.canGoBack()) {
              webContents.goBack();
            }
            // 延迟更新状态，等待导航完成
            setTimeout(() => {
              try {
                this.contentViewManager.updateNavigationState();
              } catch (error) {
                console.log('更新导航状态失败（已忽略）:', error.message);
              }
            }, 100);
          } catch (error) {
            console.log('后退操作失败（已忽略）:', error.message);
          }
          break;
        case 'forward':
          try {
            if (webContents.navigationHistory && webContents.navigationHistory.canGoForward()) {
              webContents.navigationHistory.goForward();
            } else if (webContents.canGoForward()) {
              webContents.goForward();
            }
            // 延迟更新状态，等待导航完成
            setTimeout(() => {
              try {
                this.contentViewManager.updateNavigationState();
              } catch (error) {
                console.log('更新导航状态失败（已忽略）:', error.message);
              }
            }, 100);
          } catch (error) {
            console.log('前进操作失败（已忽略）:', error.message);
          }
          break;
        case 'refresh':
          try {
            webContents.reload();
          } catch (error) {
            console.log('刷新操作失败（已忽略）:', error.message);
          }
          break;
        case 'home':
          try {
            webContents.loadURL(this.homeUrl);
          } catch (error) {
            console.log('主页跳转失败（已忽略）:', error.message);
          }
          break;
        case 'info':
          if (this.mainWindow) {
            try {
              showInfoDialog(this.mainWindow);
            } catch (error) {
              console.log('显示系统信息失败（已忽略）:', error.message);
            }
          }
          break;
      }
    } catch (error) {
      console.log('处理工具栏动作失败（已忽略）:', error.message);
    }
  }
}

module.exports = ShortcutManager;
