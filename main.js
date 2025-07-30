const { app, BrowserWindow, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const ToolbarManager = require('./utils/toolbarManager');
const ContentViewManager = require('./utils/contentViewManager');
const ShortcutManager = require('./utils/shortcutManager');
const { LayoutManager } = require('./utils/windowHelper');
const PlatformHelper = require('./utils/platformHelper');
const { isWhiteDomain } = require('./utils/domainHelper');
const { showBlockedDialog } = require('./utils/dialogHelper');
const i18n = require('./utils/i18nManager');
const MacMenuManager = require('./utils/macMenuManager');
const StartupManager = require('./utils/startupManager');

let mainWindow = null;
let toolbarManager = null;
let contentViewManager = null;
let shortcutManager = null;
let layoutManager = null;
let macMenuManager = null;
let startupManager = null;

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
    let currentPageUrl = ''; // 记录当前页面URL
    
    // 监听页面导航开始，记录URL
    view.webContents.on('did-start-navigation', (event, url) => {
      if (!url.startsWith('data:') && url !== 'about:blank') {
        currentPageUrl = url;
        console.log('页面导航开始，记录URL:', currentPageUrl);
      }
    });
    
    // 监听页面导航完成，更新URL记录
    view.webContents.on('did-navigate', (event, url) => {
      if (!url.startsWith('data:') && url !== 'about:blank') {
        currentPageUrl = url;
        console.log('页面导航完成，更新URL:', currentPageUrl);
      }
    });
    
    view.webContents.on('will-navigate', (event, url) => {
      const domain = require('./utils/urlHelper').getHostname(url);
      if (isMainWindow && isWhiteDomain(url, APP_CONFIG)) {
        event.preventDefault();
        openNewWindow(url);
        return;
      }
      if (domain !== APP_CONFIG.MAIN_DOMAIN && !isWhiteDomain(url, APP_CONFIG)) {
        event.preventDefault();
        if (win && !win.isDestroyed()) {
          showBlockedDialogWithDebounce(win, domain, '该域名不在允许访问范围', 'default');
        }
        return;
      }
      if (domain === APP_CONFIG.MAIN_DOMAIN || domain.endsWith('.' + APP_CONFIG.MAIN_DOMAIN)) {
        return;
      }
      event.preventDefault();
    });
    
    view.webContents.on('will-redirect', (event, url) => {
      console.log('检测到重定向，从', currentPageUrl, '到', url);
      
      const redirectDomain = require('./utils/urlHelper').getHostname(url);
      if (redirectDomain !== APP_CONFIG.MAIN_DOMAIN && !isWhiteDomain(url, APP_CONFIG)) {
        event.preventDefault();
        if (win && !win.isDestroyed()) {
          showBlockedDialogWithDebounce(win, redirectDomain, '非法重定向拦截，已自动回退主页', 'redirect');
        }
        
        // 自动回退主页（仅新窗口需要，主窗口不回退）
        if (!isMainWindow) {
          // 使用 setTimeout 异步执行，避免在事件处理期间同步加载URL
          setTimeout(() => {
            try {
              let targetUrl;
              if (currentPageUrl && currentPageUrl !== 'about:blank' && !currentPageUrl.startsWith('data:')) {
                const beforeRedirectDomain = require('./utils/urlHelper').getHostname(currentPageUrl);
                if (beforeRedirectDomain) {
                  // 直接回退到重定向前URL的顶级域名
                  targetUrl = `https://${beforeRedirectDomain}/`;
                  console.log('重定向拦截，回退到重定向前URL的顶级域名:', targetUrl, '(重定向前URL:', currentPageUrl, ')');
                } else {
                  // 域名提取失败，使用新窗口的初始URL
                  if (win._shortcutManager && win._shortcutManager.initialUrl) {
                    targetUrl = win._shortcutManager.initialUrl;
                    console.log('重定向拦截，域名提取失败，回退到窗口初始URL:', targetUrl);
                  } else {
                    targetUrl = `https://${APP_CONFIG.MAIN_DOMAIN}/`;
                    console.log('重定向拦截，域名提取失败，使用系统主域名:', targetUrl);
                  }
                }
              } else {
                // 当前URL无效，使用新窗口的初始URL
                if (win._shortcutManager && win._shortcutManager.initialUrl) {
                  targetUrl = win._shortcutManager.initialUrl;
                  console.log('重定向拦截，当前URL无效，回退到窗口初始URL:', targetUrl);
                } else {
                  targetUrl = `https://${APP_CONFIG.MAIN_DOMAIN}/`;
                  console.log('重定向拦截，当前URL无效，使用系统主域名:', targetUrl);
                }
              }
              
              // 检查窗口是否仍然有效
              if (view && view.webContents && !view.webContents.isDestroyed()) {
                view.webContents.loadURL(targetUrl);
              }
              
              // 重要：更新窗口的初始URL为新的安全顶级域名，避免"返回主页"时再次触发重定向
              if (win._shortcutManager && targetUrl && targetUrl.startsWith('https://')) {
                win._shortcutManager.initialUrl = targetUrl;
                win._shortcutManager.homeUrl = targetUrl;
                console.log('已更新窗口初始URL为新的安全域名:', targetUrl);
              }
            } catch (error) {
              console.log('重定向拦截处理失败:', error);
              // 最终备用方案：使用新窗口的初始URL或系统主域名
              let fallbackUrl;
              if (win._shortcutManager && win._shortcutManager.initialUrl) {
                fallbackUrl = win._shortcutManager.initialUrl;
              } else {
                fallbackUrl = `https://${APP_CONFIG.MAIN_DOMAIN}/`;
              }
              
              // 检查窗口是否仍然有效
              if (view && view.webContents && !view.webContents.isDestroyed()) {
                view.webContents.loadURL(fallbackUrl);
              }
              
              // 重要：更新窗口的初始URL为新的安全域名
              if (win._shortcutManager && fallbackUrl && fallbackUrl.startsWith('https://')) {
                win._shortcutManager.initialUrl = fallbackUrl;
                win._shortcutManager.homeUrl = fallbackUrl;
                console.log('已更新窗口初始URL为备用安全域名:', fallbackUrl);
              }
            }
          }, 50);
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
  
    // 根据系统主题设置背景色
    const backgroundColor = nativeTheme.shouldUseDarkColors ? '#1f1f1f' : '#fcfcfc';
    
    const win = new BrowserWindow({
      width,
      height,
      icon: iconPath,
      backgroundColor: backgroundColor, // 设置背景色，避免白屏
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        devTools: false,
        // 性能优化配置
        enableRemoteModule: false,
        backgroundThrottling: false, // 禁用背景节流，保持流畅性
        experimentalFeatures: true, // 启用实验性功能
        webgl: true, // 启用 WebGL
        acceleratedCompositing: true, // 启用硬件加速合成
        // 内存和缓存优化
        nodeIntegrationInWorker: false,
        nodeIntegrationInSubFrames: false,
        enableBlinkFeatures: 'OverlayScrollbars,BackForwardCache', // 启用覆盖滚动条和缓存
        disableBlinkFeatures: '', // 不禁用任何功能
        // 图像处理优化
        offscreen: false,
        nativeWindowOpen: true,
        // 安全设置
        sandbox: false,
        webSecurity: true,
        // 新增关键性能优化
        spellcheck: false, // 提高文本输入性能
        enableWebSQL: false, // 禁用WebSQL减少开销
        v8CacheOptions: 'code', // V8代码缓存优化
        // 渲染优化
        partition: null,
        additionalArguments: process.platform === 'win32' ? [
          // Windows 安全的性能优化
          '--enable-gpu-rasterization',
          '--enable-hardware-overlays',
          '--enable-smooth-scrolling',
          '--disable-background-timer-throttling'
        ] : [
          // 其他系统保持原有配置
          '--enable-gpu-rasterization',
          '--enable-oop-rasterization',
          '--enable-hardware-overlays',
          '--disable-features=VizDisplayCompositor'
        ]
      },
      show: false, // 初始不显示，等待内容加载完成
      autoHideMenuBar: true,
      titleBarStyle: 'default', // 使用默认标题栏
      frame: true, // 保留窗口边框
      // 新增性能优化选项
      transparent: false, // 禁用透明度以提高性能
      skipTaskbar: false,
      resizable: true,
      minimizable: true,
      maximizable: true,
      closable: true,
      alwaysOnTop: false,
      fullscreenable: true,
      // 避免不必要的重绘
      paintWhenInitiallyHidden: false,
    });

  // Linux平台：设置窗口类名，确保与主窗口保持一致
  if (process.platform === 'linux' && win.setWMClass) {
    try {
      win.setWMClass('sdut-oj-competition-client', 'SDUT OJ Competition Side Client');
      console.log('Linux 新打开窗口类名设置成功');
    } catch (error) {
      console.log('设置新打开窗口类名失败:', error);
    }
  }
  
  // 为新窗口设置性能优化
  if (win.webContents) {
    // 设置存储路径
    try {
      win.webContents.session.setStoragePath(
        path.join(app.getPath('userData'), 'popup-storage')
      );
    } catch (error) {
      console.log('新窗口存储路径设置跳过:', error.message);
    }
  }
  
  if (process.platform !== 'darwin') {
    win.setMenuBarVisibility(false);
  }
  
  // 等待窗口准备完成后再显示，避免白屏
  win.once('ready-to-show', () => {
    win.setMenuBarVisibility(false);
    win.show();
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
  }, startupManager);
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
  // 设置初始 url
  shortcutManager.initialUrl = initialUrl;
  shortcutManager.homeUrl = initialUrl;
  shortcutManager.registerShortcuts();
  // 新增：重定向拦截，非白名单自动回退到 homeUrl
  if (contentViewManager.getView && typeof contentViewManager.getView === 'function') {
    const contentView = contentViewManager.getView();
    if (contentView && contentView.webContents) {
      applyRedirectInterceptor(contentView, win, false); // 新窗口
      contentView.webContents.on('page-title-updated', (event, title) => {
        if (win && !win.isDestroyed()) {
          win.setTitle(title);
        }
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
          if (win && !win.isDestroyed()) {
            showBlockedDialogWithDebounce(win, domain, '该域名不在允许访问范围', 'default');
          }
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
    // 使用国际化菜单管理器为新窗口创建菜单
    const newWindowMenuManager = new MacMenuManager(win);
  }
  // 新增：所有新弹窗/子窗口隐藏菜单栏，但保留菜单以支持快捷键
  win.setMenuBarVisibility(false);
  return win;
}

/**
 * 创建主窗口
 */
function createMainWindow() {
  try {
    // 获取平台特定配置
    const platformConfig = PlatformHelper.getPlatformConfig();

    // 根据平台选择图标
    const os = require('os');
    const platform = os.platform();
    let iconPath;

    if (platform === 'linux') {
      iconPath = path.join(__dirname, 'public/icon.png');
    } else if (platform === 'darwin') {
      iconPath = path.join(__dirname, 'public/favicon.icns');
    } else {
      // Windows 使用 .ico 文件
      iconPath = path.join(__dirname, 'public/favicon.ico');
    }

    // 根据系统主题设置背景色
    const backgroundColor = nativeTheme.shouldUseDarkColors ? '#1f1f1f' : '#fcfcfc';

    // 创建主窗口
    const windowOptions = {
      width: 1440,
      height: 900,
      icon: iconPath, // 设置应用图标
      backgroundColor: backgroundColor, // 设置背景色，避免白屏
      webPreferences: {
        nodeIntegration: platformConfig.nodeIntegration,
        contextIsolation: platformConfig.contextIsolation,
        webSecurity: platformConfig.webSecurity,
        allowRunningInsecureContent: platformConfig.allowRunningInsecureContent,
        sandbox: false, // 禁用沙箱来解决 Linux 权限问题
        experimentalFeatures: platformConfig.experimentalFeatures,
        devTools: false, // 禁用开发者工具
        preload: path.join(__dirname, 'preload.js'), // 注入 preload 脚本
        // 新增主窗口性能优化
        backgroundThrottling: false,
        webgl: true,
        acceleratedCompositing: true,
        spellcheck: false,
        enableWebSQL: false,
        v8CacheOptions: 'code',
        enableBlinkFeatures: 'OverlayScrollbars,BackForwardCache',
        additionalArguments: process.platform === 'win32' ? [
          // Windows 安全的性能优化
          '--enable-gpu-rasterization',
          '--enable-hardware-overlays',
          '--enable-smooth-scrolling',
          '--disable-background-timer-throttling'
        ] : [
          // 其他系统保持原有配置
          '--enable-gpu-rasterization',
          '--enable-oop-rasterization',
          '--enable-hardware-overlays'
        ]
      },
      show: false, // 初始不显示，等待准备完成
      titleBarStyle: process.platform === 'darwin' ? 'default' : 'default', // 使用默认标题栏
      frame: true, // 保留窗口边框
      // 新增窗口性能优化选项
      transparent: false,
      paintWhenInitiallyHidden: false,
      thickFrame: true // Windows下启用厚边框提高性能
    };

    // 平台特定窗口设置
    if (process.platform === 'linux') {
      // 设置窗口管理器类名，这对Dock识别很重要
      Object.assign(windowOptions, {
        title: 'SDUT OJ Competition Side Client', // 使用英文标题避免乱码
      });
    } else if (process.platform === 'win32') {
      // Windows 特定设置 - 专门优化滚动性能
      Object.assign(windowOptions, {
        title: 'SDUT OJ Competition Side Client',
        skipTaskbar: false, // 确保在任务栏显示
        // Windows 滚动优化选项
        transparent: false, // 禁用透明度以提高性能
        skipTaskbar: false,
        resizable: true,
        minimizable: true,
        maximizable: true,
        closable: true,
        alwaysOnTop: false,
        fullscreenable: true,
        // 避免不必要的重绘
        paintWhenInitiallyHidden: false,
      });
    }

    mainWindow = new BrowserWindow(windowOptions);

    // 设置窗口的性能优化
    if (mainWindow.webContents) {
      // 设置缓存模式
      mainWindow.webContents.session.setUserAgent(
        mainWindow.webContents.getUserAgent() + ' SDUTOJCompetitionSideClient/1.0.0'
      );
      
      // 启用持久化存储以提高性能
      try {
        mainWindow.webContents.session.setStoragePath(
          path.join(app.getPath('userData'), 'storage')
        );
      } catch (error) {
        console.log('存储路径设置跳过:', error.message);
      }
    }

    // 平台特定的窗口优化
    if (process.platform === 'linux' && mainWindow.setWMClass) {
      try {
        mainWindow.setWMClass('sdut-oj-competition-client', 'SDUT OJ Competition Side Client');
        console.log('Linux 窗口类名设置成功');
      } catch (error) {
        console.log('设置窗口类名失败:', error);
      }
    } else if (process.platform === 'win32') {
      // Windows：确保图标和标题正确设置
      try {
        mainWindow.setTitle('SDUT OJ Competition Side Client');
        if (iconPath && fs.existsSync(iconPath)) {
          mainWindow.setIcon(iconPath);
          console.log('Windows 主窗口图标设置成功:', iconPath);
          
          // 确保应用程序 User Model ID 正确设置
          try {
            app.setAppUserModelId('org.sdutacm.SDUTOJCompetitionSideClient');
            console.log('Windows AppUserModelId 重新确认设置完成');
          } catch (error) {
            console.log('AppUserModelId 设置警告:', error);
          }
        }
      } catch (error) {
        console.log('设置Windows主窗口属性失败:', error);
      }
    }

    // 设置自定义 User-Agent
    const defaultUserAgent = mainWindow.webContents.getUserAgent();
    const customUserAgent = `${defaultUserAgent} SDUTOJCompetitionSideClient/1.0.0`;
    mainWindow.webContents.setUserAgent(customUserAgent);

    // 设置窗口标题
    const windowTitle = i18n.t('app.name');
    mainWindow.setTitle(windowTitle);
    
    // Linux 特定：再次尝试设置图标和标题
    if (process.platform === 'linux') {
      try {
        // 在 AppImage 环境中，图标可能在不同位置
        let finalIconPath = iconPath;
        
        // 检查多个可能的图标位置
        const possibleIconPaths = [
          iconPath, // 原始路径
          path.join(process.resourcesPath, 'icon.png'), // AppImage 中的资源路径
          path.join(__dirname, '..', 'icon.png'), // 上级目录
          path.join(process.cwd(), 'icon.png'), // 当前工作目录
        ];
        
        for (const testPath of possibleIconPaths) {
          if (testPath && fs.existsSync(testPath)) {
            finalIconPath = testPath;
            break;
          }
        }
        
        // 确保图标路径正确
        if (finalIconPath && fs.existsSync(finalIconPath)) {
          mainWindow.setIcon(finalIconPath);
          console.log('Linux 主窗口图标设置成功:', finalIconPath);
          
          // 也尝试设置应用级别的图标
          app.setName('SDUT OJ Competition Side Client');
        } else {
          console.log('Linux 图标文件未找到，尝试的路径:', possibleIconPaths);
        }
        
        // 确保使用英文标题避免乱码
        const englishTitle = 'SDUT OJ Competition Side Client';
        mainWindow.setTitle(englishTitle);
        
      } catch (error) {
        console.error('设置 Linux 主窗口属性失败:', error);
      }
    }
    
    // 隐藏菜单栏，但保留菜单以支持快捷键
    try {
      mainWindow.setMenuBarVisibility(false);
    } catch {}

    // 禁用开发者工具相关功能
    disableDevTools();

    // 初始化国际化菜单管理器（仅 macOS）
    if (process.platform === 'darwin') {
      console.log('准备初始化 MacMenuManager...');
      console.log('当前语言:', i18n.getCurrentLanguage());
      console.log('测试菜单翻译:', i18n.t('menu.file'));
      macMenuManager = new MacMenuManager(mainWindow);
    }

    // 初始化管理器
    initializeManagers();

    // 创建视图
    createViews();

    // 设置布局（所有平台都调用，确保 toolbar 正常显示）
    setupLayout();

    // 最后注册快捷键（确保在所有菜单管理器初始化完成后）
    shortcutManager.registerShortcuts();

    // 监听窗口关闭，清理资源
    mainWindow.on('closed', () => {
      if (shortcutManager) shortcutManager.unregisterAll();
      if (macMenuManager) macMenuManager.destroy();
      mainWindow = null;
    });

    // 监听系统主题变化，动态更新背景色
    nativeTheme.on('updated', () => {
      const newBackgroundColor = nativeTheme.shouldUseDarkColors ? '#1f1f1f' : '#fcfcfc';
      if (mainWindow) {
        mainWindow.setBackgroundColor(newBackgroundColor);
      }
    });

    // 等待所有内容准备完成后再显示窗口，避免白屏
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
    });
    
    // 如果 ready-to-show 没有触发，设置一个备用显示机制
    setTimeout(() => {
      if (mainWindow && !mainWindow.isVisible()) {
        mainWindow.show();
      }
    }, 2000);
  } catch (error) {
    console.error('主窗口创建失败:', error);
    throw error;
  }
}

app.whenReady().then(() => {
  // 确保 i18n 完全初始化
  console.log('App ready - 当前语言:', i18n.getCurrentLanguage());
  console.log('App ready - 测试翻译:', i18n.t('app.name'));
  
  // Windows 特定性能优化（安全版本）
  if (process.platform === 'win32') {
    console.log('应用Windows专用优化配置...');
    // Windows 安全的渲染优化
    app.commandLine.appendSwitch('enable-smooth-scrolling');
    app.commandLine.appendSwitch('enable-gpu-rasterization');
    app.commandLine.appendSwitch('enable-hardware-overlays');
    app.commandLine.appendSwitch('disable-background-timer-throttling');
    console.log('Windows安全渲染优化配置已应用');
  }
  
  // 通用性能优化设置（安全版本）
  app.commandLine.appendSwitch('disable-features', 'TranslateUI');
  
  // 安全的性能优化
  app.commandLine.appendSwitch('enable-gpu-rasterization');
  app.commandLine.appendSwitch('enable-hardware-overlays');
  
  // 初始化启动管理器
  startupManager = new StartupManager();
  
  // Windows 兼容性设置（安全版本）
  if (PlatformHelper.isWindows()) {
    // 安全的Windows GPU性能配置
    app.commandLine.appendSwitch('enable-gpu-rasterization');
    app.commandLine.appendSwitch('enable-hardware-acceleration');
    app.commandLine.appendSwitch('enable-smooth-scrolling');
    // 内存优化（保守设置）
    app.commandLine.appendSwitch('max_old_space_size', '2048');
  }

  // macOS 特定设置
  if (PlatformHelper.isMacOS()) {
    // macOS 性能优化
    app.commandLine.appendSwitch('enable-gpu-rasterization');
    app.commandLine.appendSwitch('enable-zero-copy');
    app.commandLine.appendSwitch('enable-smooth-scrolling');
    app.commandLine.appendSwitch('disable-renderer-backgrounding');
    
    // 设置 Dock 图标（开发模式下可能会失败，这是正常的）
    try {
      const iconPath = path.join(__dirname, 'public/favicon.icns');
      if (app.dock && fs.existsSync(iconPath)) {
        app.dock.setIcon(iconPath);
      }
    } catch (error) {
      // 开发模式下 Dock 图标设置失败是正常的，打包后会有图标
      console.log('Dock 图标设置跳过（开发模式正常现象）');
    }

    // 设置应用程序名称
    const appName = i18n.t('app.name');
    app.setName(appName);
  }

  // Windows 特定设置
  if (PlatformHelper.isWindows()) {
    // 设置应用程序名称（中文）
    const appName = 'SDUT OJ 竞赛客户端';
    app.setName(appName);
    console.log('Windows 应用名称设置为:', appName);
    
    // 设置应用程序图标
    try {
      const iconPath = path.join(__dirname, 'public/favicon.ico');
      if (fs.existsSync(iconPath)) {
        // 设置应用程序级别的图标（影响任务栏、Alt+Tab等）
        app.setAppUserModelId('org.sdutacm.SDUTOJCompetitionSideClient');
        console.log('Windows 应用程序图标路径:', iconPath);
        console.log('Windows AppUserModelId 设置完成');
      }
    } catch (error) {
      console.error('设置 Windows 应用程序图标失败:', error);
    }
  }

  // Linux 特定设置
  if (PlatformHelper.isLinux()) {
    // Linux 安全性能优化
    app.commandLine.appendSwitch('enable-gpu-rasterization');
    app.commandLine.appendSwitch('enable-smooth-scrolling');
    
    // 设置应用程序名称（使用英文名称避免中文乱码）
    const englishAppName = 'SDUT OJ Competition Side Client';
    app.setName(englishAppName);
    
    // 设置窗口管理器类名（重要：这影响Dock显示）
    app.setName('sdut-oj-competition-client');
    
    // 尝试设置应用图标
    try {
      const iconPath = path.join(__dirname, 'public/icon.png');
      if (fs.existsSync(iconPath)) {
        // 在 Linux 下，图标通常在窗口创建时设置，但我们也可以尝试设置应用级别的图标
        console.log('Linux 图标路径:', iconPath);
        
        // 在应用程序层面设置默认图标
        app.on('window-all-closed', () => {
          // 确保应用退出时清理图标
        });
      }
    } catch (error) {
      console.error('设置 Linux 图标失败:', error);
    }
  }

  // 处理应用启动逻辑，包括可能的启动窗口
  startupManager.handleAppStartup(() => {
    // 启动窗口（如果有）已完成，现在创建主窗口
    console.log('启动流程完成，创建主窗口');
    createMainWindow();
  });
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
    // 创建工具栏管理器，传入 startupManager 实例
    toolbarManager = new ToolbarManager(mainWindow, (action) => {
      if (shortcutManager) {
        shortcutManager.handleToolbarAction(action);
      }
    }, startupManager);

    // 创建内容视图管理器
    contentViewManager = new ContentViewManager(mainWindow, APP_CONFIG, openNewWindow);

    // 连接工具栏管理器和内容视图管理器
    contentViewManager.setToolbarManager(toolbarManager);

    // 创建快捷键管理器（在内容视图管理器创建后）
    shortcutManager = new ShortcutManager(contentViewManager, APP_CONFIG.HOME_URL, mainWindow, true);
  // 设置主窗口的初始 url
  shortcutManager.initialUrl = APP_CONFIG.HOME_URL;
  shortcutManager.homeUrl = APP_CONFIG.HOME_URL;

    // 创建布局管理器
    layoutManager = new LayoutManager(mainWindow, toolbarManager, contentViewManager);
    
    // 设置主窗口的管理器引用，供菜单使用
    mainWindow._contentViewManager = contentViewManager;
    mainWindow._toolbarManager = toolbarManager;
    mainWindow._shortcutManager = shortcutManager;
    mainWindow._layoutManager = layoutManager;
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
    
    // 设置主窗口的拦截逻辑
    setupMainWindowInterceptors();
  } catch (error) {
    console.error('创建视图失败:', error);
    throw error;
  }
}

/**
 * 设置主窗口拦截器
 */
function setupMainWindowInterceptors() {
  if (contentViewManager && contentViewManager.getView && typeof contentViewManager.getView === 'function') {
    const contentView = contentViewManager.getView();
    if (contentView && contentView.webContents) {
      // 标题同步 - 增加 mainWindow 存在性检查
      contentView.webContents.on('page-title-updated', (event, title) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setTitle(title);
        }
      });
      
      // 主窗口 will-navigate 拦截
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
          if (mainWindow && !mainWindow.isDestroyed()) {
            showBlockedDialogWithDebounce(mainWindow, domain, '该域名不在允许访问范围', 'default');
          }
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
          if (mainWindow && !mainWindow.isDestroyed()) {
            showBlockedDialogWithDebounce(mainWindow, domain, '非法重定向拦截，已阻止跳转', 'redirect');
          }
          return;
        }
        // 主域名和白名单允许跳转
      });
      
      // 主窗口 setWindowOpenHandler 拦截
      contentView.webContents.setWindowOpenHandler(({ url }) => {
        const domain = require('./utils/urlHelper').getHostname(url);
        if (isWhiteDomain(url, APP_CONFIG)) {
          openNewWindow(url);
          return { action: 'deny' };
        }
        // 非白名单/主域名弹窗拦截
        if (domain !== APP_CONFIG.MAIN_DOMAIN && !isWhiteDomain(url, APP_CONFIG)) {
          if (mainWindow && !mainWindow.isDestroyed()) {
            showBlockedDialogWithDebounce(mainWindow, domain, '该域名不在允许访问范围', 'default');
          }
          return { action: 'deny' };
        }
        // 主域名允许跳转
        return { action: 'allow' };
      });
    }
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

let isRestarting = false; // 标记是否正在重启

// 导出重启状态设置函数
global.setRestartingState = (state) => {
  isRestarting = state;
};

app.on('reopen-main-window', () => {
  isRestarting = true; // 设置重启标记
  // 立即重新创建主窗口，无需延迟
  if (!mainWindow) {
    try {
      // 重新创建主窗口
      createMainWindow();
      isRestarting = false; // 重启完成，清除标记
    } catch (error) {
      console.error('重置后主窗口创建失败:', error);
      isRestarting = false; // 发生错误也要清除标记
    }
  } else {
    isRestarting = false; // 主窗口已存在，清除标记
  }
});

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

// 只在重启时阻止自动退出，正常关闭时允许退出
app.on('window-all-closed', (event) => {
  if (isRestarting) {
    // 正在重启时阻止退出
    event.preventDefault && event.preventDefault();
    console.log('正在重启，阻止应用退出');
  } else {
    // 正常关闭时主动退出应用
    console.log('所有窗口已关闭，应用将退出');
    app.quit();
  }
});
