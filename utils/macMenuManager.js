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
            label: i18n.t('menu.about'),
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
      title: i18n.t('menu.about'),
      message: appName,
      detail: i18n.t('app.description') + '\\n\\n' + i18n.t('app.version', { version }),
      buttons: [i18n.t('dialog.ok')]
    });
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
