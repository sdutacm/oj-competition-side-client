const { app, BrowserWindow } = require('electron');

// 导入工具类和管理器
const ToolbarManager = require('./utils/ToolbarManager');
const ContentViewManager = require('./utils/ContentViewManager');
const ShortcutManager = require('./utils/ShortcutManager');
const { createNewWindow, LayoutManager } = require('./utils/windowHelper');

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
  ]),

  // 新窗口创建函数
  openNewWindow: (url) => createNewWindow(url)
};

app.whenReady().then(() => {
  // 创建主窗口
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // 隐藏默认菜单栏
  mainWindow.setMenuBarVisibility(false);

  // 初始化管理器
  initializeManagers();

  // 创建视图
  createViews();

  // 设置布局
  setupLayout();

  // 注册快捷键
  shortcutManager.registerShortcuts();
});

/**
 * 初始化所有管理器
 */
function initializeManagers() {
  // 创建快捷键管理器（需要在其他管理器之前创建）
  shortcutManager = new ShortcutManager(null, APP_CONFIG.HOME_URL);
  
  // 创建工具栏管理器
  toolbarManager = new ToolbarManager(mainWindow, (action) => {
    shortcutManager.handleToolbarAction(action);
  });
  
  // 创建内容视图管理器
  contentViewManager = new ContentViewManager(mainWindow, APP_CONFIG);
  
  // 更新快捷键管理器的内容视图引用
  shortcutManager.contentViewManager = contentViewManager;
  
  // 创建布局管理器
  layoutManager = new LayoutManager(mainWindow, toolbarManager, contentViewManager);
}

/**
 * 创建所有视图
 */
function createViews() {
  toolbarManager.createToolbarView();
  contentViewManager.createContentView();
}

/**
 * 设置布局
 */
function setupLayout() {
  layoutManager.layoutViews();
  layoutManager.setupResizeListener();
}

app.on('will-quit', () => {
  // 取消注册所有快捷键
  if (shortcutManager) {
    shortcutManager.unregisterAll();
  }
});
