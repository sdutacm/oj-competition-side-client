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
      console.log('语言变更事件触发，延迟更新菜单...');
      setTimeout(() => {
        this.updateMenu();
      }, 200);
    });
    
    // 初始化菜单
    this.createMenu();
  }

  /**
   * 创建菜单
   */
  createMenu() {
    if (process.platform !== 'darwin') {
      console.log('当前系统不是 macOS，跳过创建国际化菜单');
      return;
    }

    // 延迟创建菜单，确保 i18n 完全初始化
    setTimeout(() => {
      this.updateMenu();
    }, 100);
  }

  /**
   * 更新菜单
   */
  updateMenu() {
    console.log('=== 菜单更新开始 ===');
    console.log('当前语言:', i18n.getCurrentLanguage());
    console.log('测试翻译:');
    console.log('  应用名称:', i18n.t('app.name'));
    console.log('  帮助:', i18n.t('menu.help'));
    console.log('  系统信息:', i18n.t('menu.systemInfo'));
    console.log('  报告问题:', i18n.t('menu.reportIssue'));
    
    // 清除之前的菜单
    Menu.setApplicationMenu(null);
    
    const template = this.createMenuTemplate();
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
    console.log('=== Mac 菜单已更新 ===');
  }

  /**
   * 强制刷新菜单
   */
  forceRefreshMenu() {
    console.log('强制刷新菜单...');
    this.updateMenu();
  }

  /**
   * 创建菜单模板
   */
  createMenuTemplate() {
    // 获取应用名称
    const appName = i18n.t('app.name');
    
    console.log('=== 创建菜单模板调试信息 ===');
    console.log('应用名称:', appName);
    console.log('当前语言:', i18n.getCurrentLanguage());
    
    return [
      // 应用菜单
      {
        label: appName,
        submenu: [
          {
            label: this.getAboutMenuLabel(),
            click: () => this.showAboutDialog()
          },
          { type: 'separator' },
          {
            label: i18n.t('menu.hide', { appName: appName }),
            accelerator: 'Cmd+H',
            click: () => {
              try {
                if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                  this.mainWindow.hide();
                }
              } catch (error) {
                console.warn('隐藏窗口失败:', error);
              }
            }
          },
          {
            label: i18n.t('menu.hideOthers'),
            accelerator: 'Cmd+Shift+H',
            click: () => {
              try {
                if (this.mainWindow && !this.mainWindow.isDestroyed() && this.mainWindow.setVisibleOnAllWorkspaces) {
                  // 在macOS上隐藏其他应用程序
                  const { app } = require('electron');
                  app.hide();
                }
              } catch (error) {
                console.warn('隐藏其他窗口失败:', error);
              }
            }
          },
          { type: 'separator' },
          {
            label: i18n.t('menu.quit', { appName: appName }),
            accelerator: 'Cmd+Q',
            click: () => {
              try {
                if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                  this.mainWindow.close();
                }
              } catch (error) {
                console.warn('退出应用失败:', error);
                // 如果窗口关闭失败，直接退出应用
                const { app } = require('electron');
                app.quit();
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
              try {
                if (this.mainWindow && !this.mainWindow.isDestroyed() && this.mainWindow.isVisible()) {
                  this.mainWindow.close();
                }
              } catch (error) {
                console.warn('关闭窗口失败:', error);
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
              try {
                if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                  this.mainWindow.minimize();
                }
              } catch (error) {
                console.warn('最小化窗口失败:', error);
              }
            }
          },
          {
            label: i18n.t('menu.zoom'),
            click: () => {
              try {
                if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                  if (this.mainWindow.isMaximized()) {
                    this.mainWindow.unmaximize();
                  } else {
                    this.mainWindow.maximize();
                  }
                }
              } catch (error) {
                console.warn('缩放窗口失败:', error);
              }
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
          { type: 'separator' },
          {
            label: i18n.t('menu.reportIssue'),
            click: () => this.reportIssue()
          }
        ]
      }
    ];
  }

  /**
   * 显示关于对话框
   */
  showAboutDialog() {
    try {
      const dialogHelper = require('./dialogHelper');
      if (dialogHelper && dialogHelper.showInfoDialog) {
        dialogHelper.showInfoDialog(this.mainWindow);
      } else {
        console.error('未找到自定义 info 窗口方法 dialogHelper.showInfoDialog');
      }
    } catch (error) {
      console.error('显示自定义 info 窗口失败:', error);
    }
  }

  /**
   * 获取关于菜单标签
   */
  getAboutMenuLabel() {
    const currentLanguage = i18n.getCurrentLanguage() || 'zh-CN';
    if (currentLanguage === 'en-US') {
      return 'About SDUT OJ Competition Side Client';
    } else {
      return '关于 SDUT OJ 竞赛客户端';
    }
  }

  /**
   * 显示系统关于对话框
   */
  showSystemAboutDialog() {
    const appName = i18n.t('app.name');
    const version = require('../package.json').version || '1.0.0';
    
    // 根据语言设置对话框标题
    const currentLanguage = i18n.getCurrentLanguage() || 'zh-CN';
    let title;
    if (currentLanguage === 'en-US') {
      title = 'About SDUT OJ Competition Side Client';
    } else {
      title = '关于 SDUT OJ 竞赛客户端';
    }
    
    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: title,
      message: appName,
      detail: i18n.t('app.description') + '\\n\\n' + i18n.t('app.version', { version }),
      buttons: [i18n.t('dialog.ok')]
    });
  }

  /**
   * 执行编辑操作
   */
  executeEditAction(action) {
    try {
      if (this.mainWindow && !this.mainWindow.isDestroyed() && this.mainWindow._contentViewManager) {
        const wc = this.mainWindow._contentViewManager.getWebContents();
        if (wc && !wc.isDestroyed()) {
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
    } catch (error) {
      console.warn(`执行编辑操作 ${action} 失败:`, error);
    }
  }

  /**
   * 朗读功能
   */
  startSpeaking() {
    try {
      if (this.mainWindow && !this.mainWindow.isDestroyed() && this.mainWindow._contentViewManager) {
        const wc = this.mainWindow._contentViewManager.getWebContents();
        if (wc && !wc.isDestroyed()) {
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
    } catch (error) {
      console.warn('开始朗读失败:', error);
    }
  }

  stopSpeaking() {
    try {
      if (this.mainWindow && !this.mainWindow.isDestroyed() && this.mainWindow._contentViewManager) {
        const wc = this.mainWindow._contentViewManager.getWebContents();
        if (wc && !wc.isDestroyed()) {
          wc.executeJavaScript(`
            if (window.speechSynthesis) {
              window.speechSynthesis.cancel();
            }
          `);
        }
      }
    } catch (error) {
      console.warn('停止朗读失败:', error);
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

  reportIssue() {
    shell.openExternal('https://github.com/ATRIOR-LCL/oj-client/issues');
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
