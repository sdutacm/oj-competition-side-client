const PlatformHelper = require('./platformHelper');
const { showInfoDialog } = require('./dialogHelper');

class ShortcutManager {
  constructor(contentViewManager, homeUrl, mainWindow = null) {
    this.contentViewManager = contentViewManager;
    this.homeUrl = homeUrl;
    this.mainWindow = mainWindow;
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
   * 注册所有快捷键（窗口级别）
   */
  registerShortcuts() {
    if (!this.mainWindow || !this.mainWindow.webContents || this.mainWindow.isDestroyed() || this.mainWindow.webContents.isDestroyed()) return;

    try {
      // 设置按键处理器映射
      this.setupKeyHandlers();
      
      // 先移除可能存在的监听器，避免重复注册
      this.mainWindow.webContents.removeAllListeners('before-input-event');
      
      // 监听按键事件
      this.mainWindow.webContents.on('before-input-event', (event, input) => {
        if (!this.mainWindow || this.mainWindow.isDestroyed() || !this.mainWindow.webContents || this.mainWindow.webContents.isDestroyed()) return;
        this.handleKeyInput(event, input);
      });
    } catch (error) {
      console.log('注册快捷键失败（已忽略）:', error.message);
    }
  }

  /**
   * 处理按键输入
   */
  handleKeyInput(event, input) {
    try {
      // 先检查是否是开发者工具相关的快捷键，如果是则直接阻止
      if (this.isDevToolsShortcut(input)) {
        event.preventDefault();
        return;
      }

      // 只在窗口聚焦时处理快捷键
      if (!this.mainWindow.isFocused()) {
        return;
      }

      const shortcutKey = this.getShortcutKey(input);
      // 调试日志，输出当前快捷键信息和所有已注册快捷键
      console.log('[快捷键调试] 按下:', shortcutKey, '已注册:', Array.from(this.keyHandlers.keys()));
      console.log('[快捷键调试] 原始input:', input);
      if (shortcutKey && this.keyHandlers.has(shortcutKey)) {
        event.preventDefault();
        const handler = this.keyHandlers.get(shortcutKey);
        handler();
      }
    } catch (error) {
      console.log('处理快捷键失败（已忽略）:', error.message);
    }
  }

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
    // 后退
    this.keyHandlers.set(this.shortcuts.back, () => {
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
    this.keyHandlers.set(this.shortcuts.forward, () => {
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
    this.keyHandlers.set(this.shortcuts.refresh, () => {
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
    this.keyHandlers.set(this.shortcuts.home, () => {
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
    this.keyHandlers.set(infoShortcut, () => {
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
   * 取消注册所有快捷键
   */
  unregisterAll() {
    // 清空按键处理器
    this.keyHandlers.clear();
    // 彻底防御：只要有任何一方已销毁，直接跳过
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    if (!this.mainWindow.webContents || this.mainWindow.webContents.isDestroyed()) return;
    this.mainWindow.webContents.removeAllListeners('before-input-event');
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
