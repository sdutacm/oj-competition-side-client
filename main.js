const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// 顶部统一 require 管理器类
const ToolbarManager = require('./utils/ToolbarManager');
const ContentViewManager = require('./utils/ContentViewManager');
const ShortcutManager = require('./utils/ShortcutManager');
const { LayoutManager } = require('./utils/windowHelper');
const PlatformHelper = require('./utils/platformHelper');

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

// 独立的新窗口创建函数，不放在 APP_CONFIG 内，避免 require 副作用
function openNewWindow(url) {
  // 不再 require 管理器类，直接用顶部的
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false,
    },
    show: true,
    autoHideMenuBar: true // 创建时彻底隐藏菜单栏
  });
  win.setMenuBarVisibility(false); // 立即隐藏原生菜单栏
  win.on('ready-to-show', () => {
    win.setMenuBarVisibility(false); // 再次确保彻底隐藏
  });
  // 独立管理器实例
  const toolbarManager = new ToolbarManager(win, () => {}); // 可根据需要传递 action handler
  toolbarManager.createToolbarView();
  const contentViewManager = new ContentViewManager(win, APP_CONFIG, openNewWindow);
  contentViewManager.setToolbarManager(toolbarManager);
  // 新增 LayoutManager 实现分区布局
  const layoutManager = new LayoutManager(win, toolbarManager, contentViewManager);
  layoutManager.layoutViews();
  layoutManager.setupResizeListener();
  // 创建内容区视图
  contentViewManager.createContentView(win, url);
  // 新窗口
  const shortcutManager = new ShortcutManager(contentViewManager, APP_CONFIG.HOME_URL, win, false);
  shortcutManager.registerShortcuts();
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

    // 隐藏默认菜单栏
    mainWindow.setMenuBarVisibility(false);

    // 禁用开发者工具相关功能
    disableDevTools();

    // 初始化管理器
    initializeManagers();

    // 创建视图
    createViews();

    // 设置布局
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
