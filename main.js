const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// 顶部统一 require 管理器类
const ToolbarManager = require('./utils/toolbarManager');
const ContentViewManager = require('./utils/contentViewManager');
const ShortcutManager = require('./utils/shortcutManager');
const { LayoutManager } = require('./utils/windowHelper');
const PlatformHelper = require('./utils/platformHelper');
const { interceptDomain } = require('./utils/domainHelper');

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
    view.webContents.on('did-navigate', (event, url) => {
      if (!interceptDomain(win, url, APP_CONFIG, isMainWindow)) {
        // 已拦截并提示，弹窗已自动关闭
        return;
      }
      // 允许访问，无需额外处理
    });
  }
}

// 独立的新窗口创建函数，不放在 APP_CONFIG 内，避免 require 副作用
function openNewWindow(url) {
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
  // 先声明 contentViewManager，便于 action handler 使用
  const contentViewManager = new ContentViewManager(win, APP_CONFIG, openNewWindow);
  // 计算初始 url 的顶级域名主页
  let homeUrl = url;
  try {
    const u = new URL(url);
    homeUrl = u.origin + '/';
  } catch (e) {
    // fallback: 不是合法 url 就用原始 url
  }
  // 新窗口快捷键管理器需提前声明，便于 action handler 使用
  let shortcutManager;
  // 传递 action handler，所有按钮和快捷键统一处理
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
  contentViewManager.createContentView(win, url);
  // 新增：确保新窗口内容区获得焦点，快捷键才生效
  const view = contentViewManager.getView && contentViewManager.getView();
  if (view && view.webContents && view.webContents.focus) {
    view.webContents.focus();
  }
  // 关键：将 homeUrl 作为 home 页面传递给 ShortcutManager
  shortcutManager = new ShortcutManager(contentViewManager, homeUrl, win, false);
  shortcutManager.registerShortcuts();
  // 新增：内容区页面标题变化时，同步窗口标题、重定向拦截
  if (contentViewManager.getView && typeof contentViewManager.getView === 'function') {
    const contentView = contentViewManager.getView();
    if (contentView && contentView.webContents) {
      // 标题同步
      contentView.webContents.on('page-title-updated', (event, title) => {
        win.setTitle(title);
      });
      // 应用重定向拦截（弹窗 isMainWindow 传 false）
      applyRedirectInterceptor(contentView, win, false);
    }
  }
  win.on('closed', () => {
    shortcutManager.unregisterAll();
  });
  win._toolbarManager = toolbarManager;
  win._contentViewManager = contentViewManager;
  win._shortcutManager = shortcutManager;
  win._layoutManager = layoutManager;
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
      },
      show: false, // 初始不显示，等待准备完成
    });

    // 设置自定义 User-Agent
    const defaultUserAgent = mainWindow.webContents.getUserAgent();
    const customUserAgent = `${defaultUserAgent} SDUTOJCompetitionSideClient/1.0.0`;
    mainWindow.webContents.setUserAgent(customUserAgent);

    // 设置窗口标题
    mainWindow.setTitle('SDUT OJ 竞赛客户端');

    // （已移除主窗口全局快捷键监听，快捷键只在各自窗口 webContents 上监听）

    // Mac 下自定义菜单栏，About 菜单项弹出 info，View 菜单项功能全部手动实现
    if (process.platform === 'darwin') {
      const { showInfoDialog } = require('./utils/dialogHelper');
      const template = [
        {
          label: app.name,
          submenu: [
            {
              label: '关于 SDUT OJ 竞赛客户端',
              click: () => showInfoDialog(mainWindow)
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
                if (wc) wc.loadURL(APP_CONFIG.HOME_URL);
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
              click: () => showInfoDialog(mainWindow)
            }
          ]
        }
      ];
      const menu = Menu.buildFromTemplate(template);
      Menu.setApplicationMenu(menu);
    } else {
      mainWindow.setMenuBarVisibility(false);
    }
    // 禁用开发者工具相关功能
    disableDevTools();

    // 初始化管理器
    initializeManagers();

    // 创建视图
    createViews();

    // 新增：主窗口内容区页面标题变化时，同步主窗口标题、重定向拦截
    if (contentViewManager && contentViewManager.getView && typeof contentViewManager.getView === 'function') {
      const contentView = contentViewManager.getView();
      if (contentView && contentView.webContents) {
        contentView.webContents.on('page-title-updated', (event, title) => {
          mainWindow.setTitle(title);
        });
        // 应用重定向拦截（主窗口只拦截黑名单）
        applyRedirectInterceptor(contentView, mainWindow, true);
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

app.on('will-quit', () => {
  // 取消注册所有快捷键
  if (shortcutManager) {
    shortcutManager.unregisterAll();
  }
});
