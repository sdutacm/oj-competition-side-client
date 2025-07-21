const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const ToolbarManager = require('./utils/toolbarManager');
const ContentViewManager = require('./utils/contentViewManager');
const ShortcutManager = require('./utils/shortcutManager');
const { LayoutManager } = require('./utils/windowHelper');
const PlatformHelper = require('./utils/platformHelper');
const { isWhiteDomain } = require('./utils/domainHelper');
const { showBlockedDialog } = require('./utils/dialogHelper');

let mainWindow = null;
let toolbarManager = null;
let contentViewManager = null;
let shortcutManager = null;
let layoutManager = null;

// 应用配置
const APP_CONFIG = {
  // 主页面地址
  HOME_URL: 'https://op.sdutacm.cn/',

  // 主窗口允许访问的根域名（支持子路径）
  MAIN_DOMAIN: 'op.sdutacm.cn',

  // 新窗口白名单域名
  POPUP_WHITELIST: new Set([
    'rl.algoux.cn',
    'rl.algoux.org',
    'rank.ac',
    'acm.sdut.edu.cn'
  ]),

  // 显式禁止的域名
  BLOCKED_DOMAINS: new Set([
    'oj.sdutacm.cn'
  ])
};

// 重定向拦截器，应用于任意 BrowserView
function applyRedirectInterceptor(view, win, isMainWindow = false) {
  if (view && view.webContents) {
    let lastRedirectBlockedUrl = '';
    let lastRedirectBlockedTime = 0;
    view.webContents.on('will-navigate', (event, url) => {
      const domain = require('./utils/urlHelper').getHostname(url);
      if (isMainWindow && isWhiteDomain(url, APP_CONFIG)) {
        event.preventDefault();
        openNewWindow(url);
        return;
      }
      if (domain !== APP_CONFIG.MAIN_DOMAIN && !isWhiteDomain(url, APP_CONFIG)) {
        event.preventDefault();
        showBlockedDialogWithDebounce(win, domain, '该域名不在允许访问范围', 'default');
        return;
      }
      if (domain === APP_CONFIG.MAIN_DOMAIN || domain.endsWith('.' + APP_CONFIG.MAIN_DOMAIN)) {
        return;
      }
      event.preventDefault();
    });
    view.webContents.on('will-redirect', (event, url) => {
      const domain = require('./utils/urlHelper').getHostname(url);
      if (domain !== APP_CONFIG.MAIN_DOMAIN && !isWhiteDomain(url, APP_CONFIG)) {
        event.preventDefault();
        showBlockedDialogWithDebounce(win, domain, '非法重定向拦截，已自动回退主页', 'redirect');
        // 自动回退主页（仅新窗口需要，主窗口不回退）
        if (!isMainWindow) {
          try {
            // 禁止覆盖 ShortcutManager 的 homeUrl/initialUrl
            // 只回退页面，不修改主页记录
            const shortcutManager = win._shortcutManager;
            if (shortcutManager && shortcutManager.initialUrl) {
              view.webContents.loadURL(shortcutManager.initialUrl);
            }
          } catch {}
        }
      }
    });
  }
}

// 独立的新窗口创建函数，不放在 APP_CONFIG 内，避免 require 副作用
let lastOpenedUrl = '';
let lastOpenedTime = 0;
// openNewWindow 只负责弹新窗口，不再做白名单判断和拦截
function openNewWindow(url) {
  // 防止同一 url 在极短时间内弹两次窗口
  const now = Date.now();
  if (url === lastOpenedUrl && now - lastOpenedTime < 1000) {
    return;
  }
  lastOpenedUrl = url;
  lastOpenedTime = now;
  const width = 1400, height = 900;
  let iconPath = undefined;
  if (process.platform === 'win32') {
    iconPath = path.join(__dirname, 'public/favicon.ico');
  }
  const win = new BrowserWindow({
    width,
    height,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false,
    },
    show: true,
    autoHideMenuBar: true
  });
  if (process.platform !== 'darwin') {
    win.setMenuBarVisibility(false);
  }
  win.on('ready-to-show', () => {
    win.setMenuBarVisibility(false);
  });
  // 记录初始 url 作为主页（确保是完整 url）
  const initialUrl = url;  // 使用 const 确保不被修改
  
  // 先声明 contentViewManager，便于 action handler 使用
  const contentViewManager = new ContentViewManager(win, APP_CONFIG, openNewWindow);
  let shortcutManager;
  const toolbarManager = new ToolbarManager(win, (action) => {
    if (shortcutManager) {
      shortcutManager.handleToolbarAction(action);
    }
  });
  toolbarManager.createToolbarView();
  contentViewManager.setToolbarManager(toolbarManager);
  const layoutManager = new LayoutManager(win, toolbarManager, contentViewManager);
  layoutManager.layoutViews();
  layoutManager.setupResizeListener();
  contentViewManager.createContentView(win, initialUrl);  // 使用 initialUrl
  
  // 新增：确保新窗口内容区获得焦点，快捷键才生效
  const view = contentViewManager.getView && contentViewManager.getView();
  if (view && view.webContents && view.webContents.focus) {
    view.webContents.focus();
  }
  
  // 使用完整的 initialUrl 初始化 ShortcutManager
  shortcutManager = new ShortcutManager(contentViewManager, initialUrl, win, false);
  // 强制确保两个 url 都设置为完整初始 url
  Object.defineProperties(shortcutManager, {
    initialUrl: {
      value: initialUrl,
      writable: false  // 设为只读，防止被修改
    },
    homeUrl: {
      value: initialUrl,
      writable: false  // 设为只读，防止被修改
    }
  });
  shortcutManager.registerShortcuts();
  // 新增：重定向拦截，非白名单自动回退到 homeUrl
  if (contentViewManager.getView && typeof contentViewManager.getView === 'function') {
    const contentView = contentViewManager.getView();
    if (contentView && contentView.webContents) {
      applyRedirectInterceptor(contentView, win, false); // 新窗口
      contentView.webContents.on('page-title-updated', (event, title) => {
        win.setTitle(title);
      });
      // 新窗口 setWindowOpenHandler 拦截非法域名并弹窗
      contentView.webContents.setWindowOpenHandler(({ url }) => {
        const domain = require('./utils/urlHelper').getHostname(url);
        if (isWhiteDomain(url, APP_CONFIG)) {
          openNewWindow(url);
          return { action: 'deny' };
        }
        // 非白名单/主域名弹窗拦截
        if (domain !== APP_CONFIG.MAIN_DOMAIN && !isWhiteDomain(url, APP_CONFIG)) {
          showBlockedDialogWithDebounce(win, domain, '该域名不在允许访问范围', 'default');
          return { action: 'deny' };
        }
        // 主域名允许跳转
        return { action: 'allow' };
      });
    }
  }
  win.on('closed', () => {
    shortcutManager.unregisterAll();
  });
  win._toolbarManager = toolbarManager;
  win._contentViewManager = contentViewManager;
  win._shortcutManager = shortcutManager;
  win._layoutManager = layoutManager;

  // 新增：为每个新弹窗设置独立菜单栏和快捷键
  if (process.platform === 'darwin') {
    const { showInfoDialog } = require('./utils/dialogHelper');
    const template = [
      {
        label: app.name,
        submenu: [
          {
            label: '关于 SDUT OJ 竞赛客户端',
            click: () => showInfoDialog(win)
          },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideothers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      },
      {
        label: '文件',
        submenu: [
          { role: 'close' }
        ]
      },
      {
        label: '编辑',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' }
        ]
      },
      {
        label: '视图',
        submenu: [
          {
            label: '后退',
            accelerator: 'Cmd+Left',
            click: () => {
              const wc = contentViewManager?.getWebContents();
              if (wc && wc.canGoBack()) wc.goBack();
            }
          },
          {
            label: '前进',
            accelerator: 'Cmd+Right',
            click: () => {
              const wc = contentViewManager?.getWebContents();
              if (wc && wc.canGoForward()) wc.goForward();
            }
          },
          {
            label: '刷新',
            accelerator: 'Cmd+R',
            click: () => {
              const wc = contentViewManager?.getWebContents();
              if (wc) wc.reload();
            }
          },
          {
            label: '主页',
            accelerator: 'Cmd+Shift+H',
            click: () => {
              const wc = contentViewManager?.getWebContents();
              // 统一跳转到窗口创建时的完整初始 url
              const initialUrl = win._shortcutManager?.initialUrl;
              if (wc && initialUrl) {
                wc.loadURL(initialUrl);
              }
            }
          },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: '窗口',
        role: 'window',
        submenu: [
          { role: 'minimize' },
          { role: 'zoom' },
          { role: 'front' }
        ]
      },
      {
        label: '帮助',
        role: 'help',
        submenu: [
          {
            label: '系统信息',
            accelerator: 'Cmd+I',
            click: () => showInfoDialog(win)
          }
        ]
      }
    ];
    const menu = Menu.buildFromTemplate(template);
    win.setMenu(menu);
  }
  // 新增：所有新弹窗/子窗口全部隐藏菜单栏，彻底避免菜单栏 accelerator 污染
  if (process.platform === 'darwin') {
    win.setMenuBarVisibility(false);
    win.setMenu(null);
  }
  return win;
}

app.whenReady().then(() => {
  // Windows 兼容性设置
  if (PlatformHelper.isWindows()) {
    // 添加 Windows 特定的命令行开关来解决 GPU 问题
    app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor');
    app.commandLine.appendSwitch('disable-gpu-sandbox');
    app.commandLine.appendSwitch('disable-software-rasterizer');
    app.commandLine.appendSwitch('disable-gpu');
    app.commandLine.appendSwitch('no-sandbox');
  }

  // macOS 特定设置
  if (PlatformHelper.isMacOS()) {
    // 设置 Dock 图标
    try {
      const iconPath = path.join(__dirname, 'public/favicon.icns');
      if (app.dock) {
        app.dock.setIcon(iconPath);
      }
    } catch (error) {
      console.error('设置 Dock 图标失败:', error);
    }

    // 设置应用程序名称
    app.setName('SDUT OJ 竞赛客户端');
  }

  try {
    // 获取平台特定配置
    const platformConfig = PlatformHelper.getPlatformConfig();

    // 根据平台选择图标
    const os = require('os');
    const platform = os.platform();
    let iconPath;

    if (platform === 'linux') {
      iconPath = path.join(__dirname, 'public/favicon.png');
    } else if (platform === 'darwin') {
      iconPath = path.join(__dirname, 'public/favicon.icns');
    } else {
      // Windows 使用 .ico 文件
      iconPath = path.join(__dirname, 'public/favicon.ico');
    }

    // 创建主窗口
    mainWindow = new BrowserWindow({
      width: 1440,
      height: 900,
      icon: iconPath, // 设置应用图标
      webPreferences: {
        nodeIntegration: platformConfig.nodeIntegration,
        contextIsolation: platformConfig.contextIsolation,
        webSecurity: platformConfig.webSecurity,
        allowRunningInsecureContent: platformConfig.allowRunningInsecureContent,
        sandbox: platformConfig.sandbox,
        experimentalFeatures: platformConfig.experimentalFeatures,
        devTools: false, // 禁用开发者工具
        preload: path.join(__dirname, 'preload.js') // 注入 preload 脚本
      },
      show: false, // 初始不显示，等待准备完成
    });

    // 设置自定义 User-Agent
    const defaultUserAgent = mainWindow.webContents.getUserAgent();
    const customUserAgent = `${defaultUserAgent} SDUTOJCompetitionSideClient/1.0.0`;
    mainWindow.webContents.setUserAgent(customUserAgent);

    // 设置窗口标题
    mainWindow.setTitle('SDUT OJ 竞赛客户端');
    // 隐藏菜单栏，但保留菜单以支持快捷键（除 Mac 外）
    try {
      mainWindow.setMenuBarVisibility(false);
      // 只在 Mac 系统上清除菜单，其他系统保留菜单以支持快捷键
      if (process.platform === 'darwin') {
        mainWindow.setMenu(null);
      }
    } catch {}

    // 禁用开发者工具相关功能
    disableDevTools();

    // 初始化管理器
    initializeManagers();

    // 创建视图
    createViews();

    // 新增：主窗口内容区页面标题变化时，同步主窗口标题
    if (contentViewManager && contentViewManager.getView && typeof contentViewManager.getView === 'function') {
      const contentView = contentViewManager.getView();
      if (contentView && contentView.webContents) {
        // 标题同步
        contentView.webContents.on('page-title-updated', (event, title) => {
          mainWindow.setTitle(title);
        });
        // 主窗口只做 will-navigate 和 will-redirect 拦截，不做 did-navigate 拦截，不绑定 applyRedirectInterceptor
        contentView.webContents.on('will-navigate', (event, url) => {
          const domain = require('./utils/urlHelper').getHostname(url);
          // 白名单：页面内点击立即弹新窗口
          if (isWhiteDomain(url, APP_CONFIG)) {
            event.preventDefault();
            openNewWindow(url);
            return;
          }
          // 非主域名/白名单，全部弹窗拦截
          if (domain !== APP_CONFIG.MAIN_DOMAIN && !isWhiteDomain(url, APP_CONFIG)) {
            event.preventDefault();
            showBlockedDialogWithDebounce(mainWindow, domain, '该域名不在允许访问范围', 'default');
            return;
          }
          // 主域名页面允许跳转
          if (domain === APP_CONFIG.MAIN_DOMAIN || domain.endsWith('.' + APP_CONFIG.MAIN_DOMAIN)) {
            return;
          }
          // 其它场景一律拦截但不弹窗（如 SPA 跳转等）
          event.preventDefault();
        });
        // 主窗口 will-redirect 拦截，非法重定向弹窗
        contentView.webContents.on('will-redirect', (event, url) => {
          const domain = require('./utils/urlHelper').getHostname(url);
          if (domain !== APP_CONFIG.MAIN_DOMAIN && !isWhiteDomain(url, APP_CONFIG)) {
            event.preventDefault();
            showBlockedDialogWithDebounce(mainWindow, domain, '非法重定向拦截，已阻止跳转', 'redirect');
            return;
          }
          // 主域名和白名单允许跳转
        });
        contentView.webContents.setWindowOpenHandler(({ url }) => {
          const domain = require('./utils/urlHelper').getHostname(url);
          if (isWhiteDomain(url, APP_CONFIG)) {
            openNewWindow(url);
            return { action: 'deny' };
          }
          // 非白名单/主域名弹窗拦截
          if (domain !== APP_CONFIG.MAIN_DOMAIN && !isWhiteDomain(url, APP_CONFIG)) {
            showBlockedDialogWithDebounce(mainWindow, domain, '该域名不在允许访问范围', 'default');
            return { action: 'deny' };
          }
          // 主域名允许跳转
          return { action: 'allow' };
        });
      }
    }

    // 设置布局（所有平台都调用，确保 toolbar 正常显示）
    setupLayout();

    // 注册快捷键（在所有初始化完成后注册）
    shortcutManager.registerShortcuts();

    // 监听窗口关闭，清理资源
    mainWindow.on('closed', () => {
      if (shortcutManager) shortcutManager.unregisterAll();
      mainWindow = null;
    });

    // 显示窗口
    mainWindow.show();
  } catch (error) {
    console.error('应用初始化失败:', error);
  }
}).catch(error => {
  console.error('应用启动失败:', error);
});

/**
 * 禁用开发者工具相关功能
 */
function disableDevTools() {
  // 禁用主窗口的开发者工具
  const webContents = mainWindow?.webContents;
  if (webContents) {
    // 移除禁止右键菜单的监听，恢复系统默认行为

    // 禁用开发者工具的打开
    webContents.on('devtools-opened', () => {
      webContents.closeDevTools();
    });
  }
}

/**
 * 初始化所有管理器
 */
function initializeManagers() {
  try {
    // 创建工具栏管理器
    toolbarManager = new ToolbarManager(mainWindow, (action) => {
      if (shortcutManager) {
        shortcutManager.handleToolbarAction(action);
      }
    });

    // 创建内容视图管理器
    contentViewManager = new ContentViewManager(mainWindow, APP_CONFIG, openNewWindow);

    // 连接工具栏管理器和内容视图管理器
    contentViewManager.setToolbarManager(toolbarManager);

    // 创建快捷键管理器（在内容视图管理器创建后）
    shortcutManager = new ShortcutManager(contentViewManager, APP_CONFIG.HOME_URL, mainWindow, true);
    // 主窗口也设置只读的 initialUrl 和 homeUrl
    Object.defineProperties(shortcutManager, {
      initialUrl: {
        value: APP_CONFIG.HOME_URL,
        writable: false
      },
      homeUrl: {
        value: APP_CONFIG.HOME_URL,
        writable: false
      }
    });

    // 创建布局管理器
    layoutManager = new LayoutManager(mainWindow, toolbarManager, contentViewManager);
  } catch (error) {
    console.error('初始化管理器失败:', error);
    throw error;
  }
}

/**
 * 创建所有视图
 */
function createViews() {
  try {
    toolbarManager.createToolbarView();
    contentViewManager.createContentView();
  } catch (error) {
    console.error('创建视图失败:', error);
    throw error;
  }
}

/**
 * 设置布局
 */
function setupLayout() {
  try {
    layoutManager.layoutViews();
    layoutManager.setupResizeListener();
  } catch (error) {
    console.error('设置布局失败:', error);
    throw error;
  }
}

// 全局防御：确保所有新建窗口都隐藏菜单栏，彻底移除 accelerator 干扰
app.on('browser-window-created', (event, win) => {
  try {
    win.setMenuBarVisibility(false);
    // 只对新弹窗清除菜单，主窗口需要保留菜单以支持快捷键
    if (win !== mainWindow) {
      win.setMenu(null);
    }
  } catch {}
});
// 只在 Mac 系统上清除全局应用菜单，其他系统保留以支持快捷键
if (process.platform === 'darwin') {
  Menu.setApplicationMenu(null);
}

app.on('will-quit', () => {
  // 取消注册所有快捷键
  if (shortcutManager) {
    shortcutManager.unregisterAll();
  }
});

// 防抖弹窗相关
let lastBlockedUrl = '';
let lastBlockedType = '';
let lastBlockedTime = 0;
function showBlockedDialogWithDebounce(win, url, message, type = 'default') {
  const now = Date.now();
  // type: 'default' 主窗口拦截，'redirect' 新窗口重定向拦截
  if (url === lastBlockedUrl && type === lastBlockedType && now - lastBlockedTime < 1000) {
    return;
  }
  lastBlockedUrl = url;
  lastBlockedType = type;
  lastBlockedTime = now;
  showBlockedDialog(win, url, message, type);
}
