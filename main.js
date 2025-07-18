const { app, BrowserWindow } = require('electron');
const path = require('path');

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
 * 禁用开发者工具相关功能
 */
function disableDevTools() {
  // 禁用主窗口的开发者工具
  const webContents = mainWindow?.webContents;
  if (webContents) {
    // 禁用右键菜单
    webContents.on('context-menu', (event) => {
      event.preventDefault();
    });

    // 禁用开发者工具快捷键
    webContents.on('before-input-event', (event, input) => {
      try {
        // 禁用 F12
        if (input.key === 'F12') {
          event.preventDefault();
        }
        
        // 禁用 Ctrl+Shift+I (Windows/Linux)
        if (input.control && input.shift && input.key === 'I') {
          event.preventDefault();
        }
        
        // 禁用 Cmd+Option+I (macOS)
        if (input.meta && input.alt && input.key === 'I') {
          event.preventDefault();
        }
        
        // 禁用 Ctrl+Shift+J (Windows/Linux)
        if (input.control && input.shift && input.key === 'J') {
          event.preventDefault();
        }
        
        // 禁用 Cmd+Option+J (macOS)
        if (input.meta && input.alt && input.key === 'J') {
          event.preventDefault();
        }
        
        // 禁用 Ctrl+U (查看源码)
        if (input.control && input.key === 'U') {
          event.preventDefault();
        }
        
        // 禁用 Cmd+U (macOS查看源码)
        if (input.meta && input.key === 'U') {
          event.preventDefault();
        }
      } catch (error) {
        // 静默处理快捷键拦截错误，避免在 macOS 上显示错误弹窗
        console.log('快捷键处理错误（已忽略）:', error.message);
      }
    });

    // 安全地禁用通过 webContents.openDevTools() 打开开发者工具
    try {
      webContents.setDevToolsWebContents = null;
    } catch (error) {
      // 在某些平台上可能无法设置，静默忽略
      console.log('禁用开发者工具设置失败（已忽略）:', error.message);
    }
  }
}

/**
 * 初始化所有管理器
 */
function initializeManagers() {
  try {
    // 创建快捷键管理器（需要在其他管理器之前创建）
    shortcutManager = new ShortcutManager(null, APP_CONFIG.HOME_URL, mainWindow);
    
    // 创建工具栏管理器
    toolbarManager = new ToolbarManager(mainWindow, (action) => {
      shortcutManager.handleToolbarAction(action);
    });
    
    // 创建内容视图管理器
    contentViewManager = new ContentViewManager(mainWindow, APP_CONFIG);
    
    // 连接工具栏管理器和内容视图管理器
    contentViewManager.setToolbarManager(toolbarManager);
    
    // 更新快捷键管理器的内容视图引用和主窗口引用
    shortcutManager.contentViewManager = contentViewManager;
    shortcutManager.setMainWindow(mainWindow);
    
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
