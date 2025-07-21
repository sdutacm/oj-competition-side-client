const { Menu, shell, dialog } = require('electron');
const i18n = require('./i18nManager');

/**
 * Mac菜单管理器
 * 提供国际化的菜单支持
 */
class MacMenuManager {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    
    // 监听语言变更事件
    i18n.on('languageChanged', () => {
      this.updateMenu();
    });
    
    // 初始化菜单
    this.createMenu();
  }

  /**
   * 创建菜单
   */
  createMenu() {
    if (process.platform !== 'darwin') {
      console.log('当前不是 macOS 系统，跳过创建 Mac 菜单');
      return;
    }

    this.updateMenu();
  }

  /**
   * 更新菜单
   */
  updateMenu() {
    const template = this.createMenuTemplate();
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
    console.log('Mac 菜单已更新，当前语言:', i18n.getCurrentLanguage());
  }

  /**
   * 创建菜单模板
   */
  createMenuTemplate() {
    const appName = i18n.t('app.name');
    
    return [
      // 应用菜单
      {
        label: appName,
        submenu: [
          {
            label: i18n.t('app.about'),
            click: () => this.showAboutDialog()
          },
          { type: 'separator' },
          {
            label: i18n.t('menu.hide', { appName: appName }),
            accelerator: 'Cmd+H',
            click: () => {
              if (this.mainWindow) {
                this.mainWindow.hide();
              }
            }
          },
          {
            label: i18n.t('menu.hideOthers'),
            accelerator: 'Cmd+Shift+H',
            click: () => {
              if (this.mainWindow && this.mainWindow.setVisibleOnAllWorkspaces) {
                // 在macOS上隐藏其他应用程序
                const { app } = require('electron');
                app.hide();
              }
            }
          },
          {
            label: i18n.t('menu.showAll'),
            click: () => {
              const { app } = require('electron');
              app.show();
            }
          },
          { type: 'separator' },
          {
            label: i18n.t('menu.quit', { appName: appName }),
            accelerator: 'Cmd+Q',
            click: () => {
              if (this.mainWindow) {
                this.mainWindow.close();
              }
            }
          }
        ]
      },
      
      // 文件菜单
      {
        label: i18n.t('menu.file'),
        submenu: [
          {
            label: i18n.t('menu.close'),
            accelerator: 'Cmd+W',
            click: () => {
              if (this.mainWindow && this.mainWindow.isVisible()) {
                this.mainWindow.close();
              }
            }
          }
        ]
      },
      
      // 编辑菜单
      {
        label: i18n.t('menu.edit'),
        submenu: [
          {
            label: i18n.t('menu.undo'),
            accelerator: 'Cmd+Z',
            click: () => this.executeEditAction('undo')
          },
          {
            label: i18n.t('menu.redo'),
            accelerator: 'Shift+Cmd+Z',
            click: () => this.executeEditAction('redo')
          },
          { type: 'separator' },
          {
            label: i18n.t('menu.cut'),
            accelerator: 'Cmd+X',
            click: () => this.executeEditAction('cut')
          },
          {
            label: i18n.t('menu.copy'),
            accelerator: 'Cmd+C',
            click: () => this.executeEditAction('copy')
          },
          {
            label: i18n.t('menu.paste'),
            accelerator: 'Cmd+V',
            click: () => this.executeEditAction('paste')
          },
          {
            label: i18n.t('menu.pasteAndMatchStyle'),
            accelerator: 'Shift+Cmd+V',
            click: () => this.executeEditAction('pasteAndMatchStyle')
          },
          {
            label: i18n.t('menu.delete'),
            click: () => this.executeEditAction('delete')
          },
          {
            label: i18n.t('menu.selectAll'),
            accelerator: 'Cmd+A',
            click: () => this.executeEditAction('selectAll')
          },
          { type: 'separator' },
          {
            label: i18n.t('menu.speech'),
            submenu: [
              {
                label: i18n.t('menu.startSpeaking'),
                click: () => this.startSpeaking()
              },
              {
                label: i18n.t('menu.stopSpeaking'),
                click: () => this.stopSpeaking()
              }
            ]
          }
        ]
      },
      
      // 窗口菜单
      {
        label: i18n.t('menu.window'),
        submenu: [
          {
            label: i18n.t('menu.minimize'),
            accelerator: 'Cmd+M',
            click: () => {
              if (this.mainWindow) {
                this.mainWindow.minimize();
              }
            }
          },
          {
            label: i18n.t('menu.zoom'),
            click: () => {
              if (this.mainWindow) {
                if (this.mainWindow.isMaximized()) {
                  this.mainWindow.unmaximize();
                } else {
                  this.mainWindow.maximize();
                }
              }
            }
          },
          { type: 'separator' },
          {
            label: i18n.t('menu.front'),
            click: () => {
              const { app } = require('electron');
              app.focus();
            }
          }
        ]
      },
      
      // 帮助菜单
      {
        label: i18n.t('menu.help'),
        submenu: [
          {
            label: i18n.t('menu.systemInfo'),
            click: () => this.showSystemInfo()
          },
          {
            label: i18n.t('menu.reportIssue'),
            click: () => this.reportIssue()
          }
        ]
      }
    ];
  }

  /**
   * 创建语言子菜单
   */
  createLanguageSubmenu() {
    const currentLang = i18n.getCurrentLanguage();
    const availableLanguages = i18n.getAvailableLanguages();
    
    return availableLanguages.map(lang => ({
      label: i18n.getLanguageDisplayName(lang),
      type: 'radio',
      checked: lang === currentLang,
      click: () => {
        i18n.setLanguage(lang);
        console.log(`菜单语言已切换到: ${lang}`);
      }
    }));
  }

  /**
   * 显示关于对话框
   */
  showAboutDialog() {
    try {
      // 尝试使用自定义的 dialogHelper
      const dialogHelper = require('./dialogHelper');
      if (dialogHelper && dialogHelper.showInfoDialog) {
        dialogHelper.showInfoDialog(this.mainWindow);
      } else {
        // 使用系统默认对话框
        this.showSystemAboutDialog();
      }
    } catch (error) {
      console.error('显示关于对话框失败:', error);
      this.showSystemAboutDialog();
    }
  }

  /**
   * 显示系统关于对话框
   */
  showSystemAboutDialog() {
    const appName = i18n.t('app.name');
    const version = require('../package.json').version || '1.0.0';
    
    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: i18n.t('app.about'),
      message: appName,
      detail: i18n.t('app.description') + '\\n\\n' + i18n.t('app.version', { version }),
      buttons: [i18n.t('dialog.ok')]
    });
  }

  /**
   * 显示偏好设置
   */
  showPreferences() {
    console.log('显示偏好设置');
    // TODO: 实现偏好设置界面
  }

  /**
   * 导航操作
   */
  navigateBack() {
    if (this.mainWindow && this.mainWindow._contentViewManager) {
      const wc = this.mainWindow._contentViewManager.getWebContents();
      if (wc && wc.canGoBack()) {
        wc.goBack();
      }
    }
  }

  navigateForward() {
    if (this.mainWindow && this.mainWindow._contentViewManager) {
      const wc = this.mainWindow._contentViewManager.getWebContents();
      if (wc && wc.canGoForward()) {
        wc.goForward();
      }
    }
  }

  navigateHome() {
    if (this.mainWindow && this.mainWindow._shortcutManager) {
      const wc = this.mainWindow._contentViewManager?.getWebContents();
      const initialUrl = this.mainWindow._shortcutManager.initialUrl;
      console.log('菜单主页跳转使用URL:', initialUrl);
      if (wc && initialUrl) {
        wc.loadURL(initialUrl);
      }
    }
  }

  refresh() {
    if (this.mainWindow && this.mainWindow._contentViewManager) {
      const wc = this.mainWindow._contentViewManager.getWebContents();
      if (wc) {
        wc.reload();
      }
    }
  }

  forceReload() {
    if (this.mainWindow && this.mainWindow._contentViewManager) {
      const wc = this.mainWindow._contentViewManager.getWebContents();
      if (wc) {
        wc.reloadIgnoringCache();
      }
    }
  }

  /**
   * 执行编辑操作
   */
  executeEditAction(action) {
    if (this.mainWindow && this.mainWindow._contentViewManager) {
      const wc = this.mainWindow._contentViewManager.getWebContents();
      if (wc) {
        switch (action) {
          case 'undo':
            wc.undo();
            break;
          case 'redo':
            wc.redo();
            break;
          case 'cut':
            wc.cut();
            break;
          case 'copy':
            wc.copy();
            break;
          case 'paste':
            wc.paste();
            break;
          case 'pasteAndMatchStyle':
            wc.pasteAndMatchStyle();
            break;
          case 'delete':
            wc.delete();
            break;
          case 'selectAll':
            wc.selectAll();
            break;
          default:
            console.warn('未知的编辑操作:', action);
        }
      }
    }
  }

  /**
   * 缩放操作
   */
  resetZoom() {
    if (this.mainWindow && this.mainWindow._contentViewManager) {
      const wc = this.mainWindow._contentViewManager.getWebContents();
      if (wc) {
        wc.setZoomLevel(0);
      }
    }
  }

  zoomIn() {
    if (this.mainWindow && this.mainWindow._contentViewManager) {
      const wc = this.mainWindow._contentViewManager.getWebContents();
      if (wc) {
        const currentZoom = wc.getZoomLevel();
        wc.setZoomLevel(currentZoom + 0.5);
      }
    }
  }

  zoomOut() {
    if (this.mainWindow && this.mainWindow._contentViewManager) {
      const wc = this.mainWindow._contentViewManager.getWebContents();
      if (wc) {
        const currentZoom = wc.getZoomLevel();
        wc.setZoomLevel(currentZoom - 0.5);
      }
    }
  }

  /**
   * 窗口操作
   */
  toggleFullscreen() {
    if (this.mainWindow) {
      this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
    }
  }

  toggleDevTools() {
    if (this.mainWindow && this.mainWindow._contentViewManager) {
      const wc = this.mainWindow._contentViewManager.getWebContents();
      if (wc) {
        wc.toggleDevTools();
      }
    }
  }

  /**
   * 帮助菜单操作
   */
  showSystemInfo() {
    try {
      // 尝试使用自定义的 dialogHelper
      const dialogHelper = require('./dialogHelper');
      if (dialogHelper && dialogHelper.showInfoDialog) {
        dialogHelper.showInfoDialog(this.mainWindow);
      } else {
        console.log('显示系统信息');
      }
    } catch (error) {
      console.error('显示系统信息失败:', error);
    }
  }

  /**
   * 朗读功能
   */
  startSpeaking() {
    if (this.mainWindow && this.mainWindow._contentViewManager) {
      const wc = this.mainWindow._contentViewManager.getWebContents();
      if (wc) {
        // 获取选中的文本
        wc.executeJavaScript(`
          const selection = window.getSelection();
          selection.toString();
        `).then(selectedText => {
          if (selectedText) {
            // 使用系统语音合成
            wc.executeJavaScript(`
              if (window.speechSynthesis) {
                const utterance = new SpeechSynthesisUtterance('${selectedText.replace(/'/g, "\\'")}');
                window.speechSynthesis.speak(utterance);
              }
            `);
          }
        }).catch(err => {
          console.error('朗读失败:', err);
        });
      }
    }
  }

  stopSpeaking() {
    if (this.mainWindow && this.mainWindow._contentViewManager) {
      const wc = this.mainWindow._contentViewManager.getWebContents();
      if (wc) {
        wc.executeJavaScript(`
          if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
          }
        `);
      }
    }
  }

  checkForUpdates() {
    console.log('检查更新');
    // TODO: 实现更新检查
  }

  reportIssue() {
    shell.openExternal('https://github.com/ATRIOR-LCL/oj-competition-side-client/issues');
  }

  learnMore() {
    shell.openExternal('https://oj.sdutacm.cn/onlinejudge3/');
  }

  /**
   * 销毁菜单管理器
   */
  destroy() {
    // 移除事件监听
    i18n.off('languageChanged', this.updateMenu);
  }
}

module.exports = MacMenuManager;
