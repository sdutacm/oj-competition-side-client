const { app, BrowserWindow } = require('electron');

// 导入工具类和管理器
const ToolbarManager = require('./utils/ToolbarManager');
const ContentViewManager = require('./utils/ContentViewManager');
const ShortcutManager = require('./utils/ShortcutManager');
const { createNewWindow, LayoutManager } = require('./utils/windowHelper');
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
  ]),

  // 新窗口创建函数
  openNewWindow: (url) => createNewWindow(url)
};

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
  
  try {
    // 获取平台特定配置
    const platformConfig = PlatformHelper.getPlatformConfig();
    
    // 创建主窗口
    mainWindow = new BrowserWindow({
      width: 1000,
      height: 800,
      webPreferences: {
        nodeIntegration: platformConfig.nodeIntegration,
        contextIsolation: platformConfig.contextIsolation,
        webSecurity: platformConfig.webSecurity,
        allowRunningInsecureContent: platformConfig.allowRunningInsecureContent,
        sandbox: platformConfig.sandbox,
        experimentalFeatures: platformConfig.experimentalFeatures,
      },
      show: false, // 初始不显示，等待准备完成
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
    
    // 显示窗口
    mainWindow.show();
  } catch (error) {
    console.error('应用初始化失败:', error);
  }
}).catch(error => {
  console.error('应用启动失败:', error);
});

/**
 * 初始化所有管理器
 */
function initializeManagers() {
  try {
    // 创建快捷键管理器（需要在其他管理器之前创建）
    shortcutManager = new ShortcutManager(null, APP_CONFIG.HOME_URL);
    
    // 创建工具栏管理器
    toolbarManager = new ToolbarManager(mainWindow, (action) => {
      shortcutManager.handleToolbarAction(action);
    });
    
    // 创建内容视图管理器
    contentViewManager = new ContentViewManager(mainWindow, APP_CONFIG);
    
    // 连接工具栏管理器和内容视图管理器
    contentViewManager.setToolbarManager(toolbarManager);
    
    // 更新快捷键管理器的内容视图引用
    shortcutManager.contentViewManager = contentViewManager;
    
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
