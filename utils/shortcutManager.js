const PlatformHelper = require('./platformHelper');
const { showInfoDialog } = require('./dialogHelper');

class ShortcutManager {
  constructor(contentViewManager, homeUrl, mainWindow = null) {
    this.contentViewManager = contentViewManager;
    this.homeUrl = homeUrl;
    this.mainWindow = mainWindow;
    // 统一使用 PlatformHelper 默认快捷键
    this.shortcuts = PlatformHelper.getNavigationShortcuts();
    this.keyHandlers = new Map(); // 存储按键处理器
  }

  /**
   * 设置主窗口引用
   */
  setMainWindow(mainWindow) {
    this.mainWindow = mainWindow;
  }

  /**
   * 注册所有快捷键（每个窗口用 setMenu，快捷键只在当前窗口生效）
   */
  registerShortcuts() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    try {
      this.unregisterAll();
      this.setupKeyHandlers();
      const { Menu } = require('electron');
      const isMac = process.platform === 'darwin';
      if (!isMac) {
        // 仅非 Mac 下自定义菜单和快捷键
        const shortcuts = this.shortcuts;
        const template = [
          {
            label: '导航',
            submenu: [
              {
                label: '后退 (Alt+Left)',
                accelerator: shortcuts.back,
                click: () => this.keyHandlers.get(shortcuts.back)?.()
              },
              {
                label: '前进 (Alt+Right)',
                accelerator: shortcuts.forward,
                click: () => this.keyHandlers.get(shortcuts.forward)?.()
              },
              {
                label: '刷新 (F5/Ctrl+R)',
                accelerator: shortcuts.refresh,
                click: () => this.keyHandlers.get(shortcuts.refresh)?.()
              },
              {
                label: '主页 (Alt+H)',
                accelerator: shortcuts.home,
                click: () => this.keyHandlers.get(shortcuts.home)?.()
              },
              {
                label: '系统信息 (Alt+I)',
                accelerator: shortcuts.info,
                click: () => this.keyHandlers.get(shortcuts.info)?.()
              }
            ]
          }
        ];
        const menu = Menu.buildFromTemplate(template);
        this.mainWindow.setMenu(menu);
        if (this.mainWindow.setMenuBarVisibility) {
          this.mainWindow.setMenuBarVisibility(false);
        }
      }
      // Mac 下不做任何菜单和快捷键处理，保留原生
    } catch (error) {
      console.log('注册快捷键失败（已忽略）:', error.message);
    }
  }

  /**
   * 取消注册所有快捷键
   */
  unregisterAll() {
    this.keyHandlers.clear();
    if (this.mainWindow && this._beforeInputHandler) {
      const webContents = this.mainWindow.webContents;
      if (webContents) {
        webContents.removeListener('before-input-event', this._beforeInputHandler);
      }
      this._beforeInputHandler = null;
    }
  }

  /**
   * 处理按键输入
   */
  handleKeyInput() {}

  /**
   * 检查是否是开发者工具快捷键
   */
  isDevToolsShortcut(input) {
    return (
      input.key === 'F12' ||
      (input.control && input.shift && input.key === 'I') ||
      (input.meta && input.alt && input.key === 'I') ||
      (input.control && input.shift && input.key === 'J') ||
      (input.meta && input.alt && input.key === 'J') ||
      (input.control && input.key === 'U') ||
      (input.meta && input.key === 'U')
    );
  }

  /**
   * 设置按键处理器映射
   */
  setupKeyHandlers() {
    const isMac = process.platform === 'darwin';
    const macShortcuts = {
      back: 'Cmd+Left',
      forward: 'Cmd+Right',
      refresh: 'Cmd+R',
      home: 'Cmd+Shift+H',
      info: 'Cmd+I'
    };
    const shortcuts = isMac ? macShortcuts : this.shortcuts;
    // 后退
    this.keyHandlers.set(shortcuts.back, () => {
      const webContents = this.contentViewManager.getWebContents();
      if (webContents) {
        try {
          if (webContents.navigationHistory && webContents.navigationHistory.canGoBack()) {
            webContents.navigationHistory.goBack();
          } else if (webContents.canGoBack()) {
            webContents.goBack();
          }
        } catch (error) {
          console.log('后退操作失败（已忽略）:', error.message);
        }
      }
    });
    // 前进
    this.keyHandlers.set(shortcuts.forward, () => {
      const webContents = this.contentViewManager.getWebContents();
      if (webContents) {
        try {
          if (webContents.navigationHistory && webContents.navigationHistory.canGoForward()) {
            webContents.navigationHistory.goForward();
          } else if (webContents.canGoForward()) {
            webContents.goForward();
          }
        } catch (error) {
          console.log('前进操作失败（已忽略）:', error.message);
        }
      }
    });
    // 刷新
    this.keyHandlers.set(shortcuts.refresh, () => {
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
    this.keyHandlers.set(shortcuts.home, () => {
      const webContents = this.contentViewManager.getWebContents();
      if (webContents) {
        try {
          webContents.loadURL(this.homeUrl);
        } catch (error) {
          console.log('主页跳转失败（已忽略）:', error.message);
        }
      }
    });
    // 系统信息
    this.keyHandlers.set(shortcuts.info, () => {
      if (this.mainWindow) {
        try {
          showInfoDialog(this.mainWindow);
        } catch (error) {
          console.log('显示系统信息失败（已忽略）:', error.message);
        }
      }
    });
  }

  /**
   * 将输入事件转换为快捷键字符串
   */
  getShortcutKey(input) {
    const keys = [];

    // 修饰键
    if (input.control) keys.push('Ctrl');
    if (input.alt) keys.push('Alt');
    if (input.shift) keys.push('Shift');
    if (input.meta) keys.push('Cmd');

    // 主键 - 处理特殊键
    if (input.key) {
      let key = input.key;

      // 处理方向键
      if (key === 'ArrowLeft') key = 'Left';
      else if (key === 'ArrowRight') key = 'Right';
      else if (key === 'ArrowUp') key = 'Up';
      else if (key === 'ArrowDown') key = 'Down';
      // 处理功能键
      else if (key.startsWith('F') && key.length > 1) key = key.toUpperCase();
      // 处理字母键
      else if (key.length === 1) key = key.toUpperCase();

      keys.push(key);
    }

    return keys.join('+');
  }

  /**
   * 处理工具栏动作
   */
  handleToolbarAction(action) {
    const webContents = this.contentViewManager.getWebContents();
    if (!webContents) return;

    try {
      switch (action) {
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
