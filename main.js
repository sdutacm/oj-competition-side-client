const { app, BrowserWindow, BrowserView, nativeTheme, shell } = require('electron');

// 启动性能监控
const startTime = Date.now();
console.log('=== 应用启动开始 ===', new Date().toISOString());

// 核心启动必需的模块
const { calculateCenteredPosition } = require('./utils/screenCenterPosition');
const { getAppVersion } = require('./utils/versionHelper');

// 延迟加载的模块 - 这些将在需要时才加载，提升启动速度
let ToolbarManager = null;
let ContentViewManager = null;
let ShortcutManager = null;
let LayoutManager = null;
let isWhiteDomain = null;
let showBlockedDialog = null;
let showBlockedDialogWithDebounce = null;
let UpdateManager = null;

// 只在 macOS 系统下加载 i18n 和 MacMenuManager
let i18n = null;
let MacMenuManager = null;
// 移除自动初始化，改为手动初始化以提升启动性能

let mainWindow = null;
let toolbarManager = null;
let contentViewManager = null;
let shortcutManager = null;
let layoutManager = null;
let macMenuManager = null;
let updateManager = null;

// 退出确认状态
let isQuittingConfirmed = false;

// 窗口管理 - 追踪所有创建的窗口
let allWindows = [];

// 关闭所有子窗口的辅助函数
function closeAllChildWindows() {
  console.log(`准备关闭 ${allWindows.length} 个子窗口`);
  allWindows.forEach(win => {
    try {
      if (win && !win.isDestroyed()) {
        win.destroy();
      }
    } catch (error) {
      console.warn('关闭子窗口失败:', error);
    }
  });
  allWindows = [];
}

/**
 * 延迟加载模块 - 提升启动性能
 * 这些模块只在实际需要时才被加载
 */
function loadModulesLazily() {
  if (!ToolbarManager) {
    ToolbarManager = require('./utils/toolbarManager');
  }
  if (!ContentViewManager) {
    ContentViewManager = require('./utils/contentViewManager');
  }
  if (!ShortcutManager) {
    ShortcutManager = require('./utils/shortcutManager');
  }
  if (!LayoutManager) {
    const windowHelper = require('./utils/windowHelper');
    LayoutManager = windowHelper.LayoutManager;
  }
  if (!isWhiteDomain) {
    const domainHelper = require('./utils/domainHelper');
    isWhiteDomain = domainHelper.isWhiteDomain;
  }
  if (!showBlockedDialog) {
    const dialogHelper = require('./utils/dialogHelper');
    showBlockedDialog = dialogHelper.showBlockedDialog;
    showBlockedDialogWithDebounce = dialogHelper.showBlockedDialogWithDebounce;
  }
  if (!UpdateManager) {
    UpdateManager = require('./utils/updateManager');
  }
}

// 应用配置
const APP_CONFIG = {
  // 主页面地址
  HOME_URL: 'https://op.sdutacm.cn/onlinejudge3_cs/competitions',

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



// 检查是否是可以打开外部链接的特殊页面（如关于页面等）
function isExternalLinkAllowedContext(webContents) {
  if (!webContents) return false;

  // 检查是否是关于窗口（从 dialogHelper 导入检查函数）
  try {
    const dialogHelper = require('./utils/dialogHelper');
    if (dialogHelper && dialogHelper.isAboutWindow) {
      const ownerWindow = webContents.getOwnerBrowserWindow();
      if (ownerWindow && dialogHelper.isAboutWindow(ownerWindow)) {
        return true;
      }
    }
  } catch (error) {
    console.warn('检查关于窗口失败:', error);
  }

  return false;
}

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

// 优化的新窗口创建函数
function openNewWindow(url) {
  const windowWidth = 1400;
  const windowHeight = 900;
  const centerPosition = calculateCenteredPosition(windowWidth, windowHeight);
  
  // 使用统一的背景色检测函数
  const backgroundColor = getWindowsBackgroundColor();
  console.log('创建新窗口使用背景色:', backgroundColor);

  const win = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: centerPosition.x,
    y: centerPosition.y,
    backgroundColor: backgroundColor, // 设置与主题匹配的背景色
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      sandbox: false,
      backgroundThrottling: false,
      spellcheck: false,
      webgl: false,
      enableWebSQL: false
    }
  });

  // 将新窗口添加到追踪列表
  allWindows.push(win);
  
  // 监听新窗口关闭事件，从追踪列表中移除
  win.on('closed', () => {
    const index = allWindows.indexOf(win);
    if (index !== -1) {
      allWindows.splice(index, 1);
    }
  });

  // 为新窗口创建简单的内容视图管理器模拟
  const newWindowContentViewManager = {
    contentView: null,
    getWebContents: () => newWindowContentViewManager.contentView?.webContents || win.webContents,
    updateNavigationState: () => {
      // 新窗口的导航状态更新
      try {
        if (win._toolbarManager && win._toolbarManager.updateNavigationState && newWindowContentViewManager.contentView) {
          const webContents = newWindowContentViewManager.contentView.webContents;
          const canGoBack = webContents.canGoBack();
          const canGoForward = webContents.canGoForward();
          win._toolbarManager.updateNavigationState(canGoBack, canGoForward);
        }
      } catch (error) {
        console.log('新窗口导航状态更新失败（已忽略）:', error.message);
      }
    },
    setBounds: (bounds) => {
      if (newWindowContentViewManager.contentView) {
        newWindowContentViewManager.contentView.setBounds(bounds);
      }
    },
    getView: () => {
      return newWindowContentViewManager.contentView;
    }
  };

  // 为新窗口创建快捷键管理器
  const newWindowShortcutManager = new ShortcutManager(newWindowContentViewManager, url, win, false);
  newWindowShortcutManager.initialUrl = url;
  newWindowShortcutManager.homeUrl = url;
  win._shortcutManager = newWindowShortcutManager;

  // 设置新窗口导航监听器以自动更新按钮状态
  const setupNavigationListeners = (contentView, toolbarManager) => {
    if (contentView && contentView.webContents && toolbarManager) {
      // 监听导航事件，自动更新按钮状态
      const updateButtonStates = () => {
        try {
          const webContents = contentView.webContents;
          const canGoBack = webContents.canGoBack();
          const canGoForward = webContents.canGoForward();
          toolbarManager.updateNavigationState(canGoBack, canGoForward);
        } catch (error) {
          console.log('新窗口按钮状态更新失败（已忽略）:', error.message);
        }
      };

      // 监听内容视图的导航事件
      const webContents = contentView.webContents;
      webContents.on('did-navigate', updateButtonStates);
      webContents.on('did-navigate-in-page', updateButtonStates);
      webContents.on('did-finish-load', updateButtonStates);

      // 延迟执行初始状态更新
      setTimeout(updateButtonStates, 100);
    }
  };

  // 为新窗口创建工具栏管理器
  try {
    const newWindowToolbarManager = new ToolbarManager(win, (action) => {
      if (newWindowShortcutManager) {
        newWindowShortcutManager.handleToolbarAction(action);
      }
    }, null);
    win._toolbarManager = newWindowToolbarManager;
    console.log('新窗口工具栏管理器创建完成');

    // 创建工具栏视图
    newWindowToolbarManager.createToolbarView();
    console.log('新窗口工具栏视图创建完成');
  } catch (error) {
    console.warn('新窗口工具栏创建失败，但不影响核心功能:', error);
  }

  // 为新窗口创建布局管理器和内容视图
  try {
    // Windows系统：获取统一的背景色
    const browserViewBgColor = getWindowsBackgroundColor();
    console.log('新窗口BrowserView使用背景色:', browserViewBgColor);
    
    // 创建内容视图并添加到窗口
    const contentView = new BrowserView({
      webPreferences: {
        backgroundColor: browserViewBgColor,
        transparent: false
      }
    });

    win.addBrowserView(contentView);
    newWindowContentViewManager.contentView = contentView;

    // 设置自定义 User-Agent
    const defaultUserAgent = contentView.webContents.getUserAgent();
  const customUserAgent = `${defaultUserAgent} SDUTOJCompetitionSideClient/${getAppVersion()}`;
    contentView.webContents.setUserAgent(customUserAgent);

    // 新窗口标题同步 - 跟随网页标题
    contentView.webContents.on('page-title-updated', (event, title) => {
      if (win && !win.isDestroyed()) {
        win.setTitle(title);
      }
    });

    // 应用重定向拦截器到新窗口的内容视图
    applyRedirectInterceptor(contentView, win, false);

    // 设置新窗口内容视图的导航拦截器
    contentView.webContents.setWindowOpenHandler(({ url: newUrl }) => {
      const domain = require('./utils/urlHelper').getHostname(newUrl);

      // 检查是否是特定的外部链接，但只在关于界面中允许
      // 这里我们不检查GitHub，因为新窗口不应该是关于界面

      // 如果是主域名，允许在当前窗口打开
      if (domain === APP_CONFIG.MAIN_DOMAIN) {
        return { action: 'allow' };
      }

      // 如果在白名单中，在新窗口中打开
      if (isWhiteDomain(newUrl, APP_CONFIG)) {
        openNewWindow(newUrl);
        return { action: 'deny' };
      }

      // 非白名单域名，显示拦截对话框
      showBlockedDialogWithDebounce(win, domain, '该域名不在允许访问范围', 'default');
      return { action: 'deny' };
    });

    // 新窗口内容视图导航拦截
    contentView.webContents.on('will-navigate', (event, newUrl) => {
      const domain = require('./utils/urlHelper').getHostname(newUrl);

      // GitHub链接一律拦截，不允许在新窗口中打开外部浏览器
      if (domain.includes('github.com')) {
        event.preventDefault();
        showBlockedDialogWithDebounce(win, domain, '该域名不在允许访问范围', 'default');
        return;
      }

      // 白名单：页面内点击立即弹新窗口
      if (isWhiteDomain(newUrl, APP_CONFIG)) {
        event.preventDefault();
        openNewWindow(newUrl);
        return;
      }
      // 非主域名/白名单，全部弹窗拦截
      if (domain !== APP_CONFIG.MAIN_DOMAIN && !isWhiteDomain(newUrl, APP_CONFIG)) {
        event.preventDefault();
        showBlockedDialogWithDebounce(win, domain, '该域名不在允许访问范围', 'default');
        return;
      }
      // 主域名和白名单允许跳转
    });

    // 在内容视图创建后设置导航监听器
    setupNavigationListeners(contentView, win._toolbarManager);
    console.log('新窗口导航监听器设置完成');

    const newWindowLayoutManager = new LayoutManager(win, win._toolbarManager, newWindowContentViewManager);
    win._layoutManager = newWindowLayoutManager;

    // 设置布局
    newWindowLayoutManager.layoutViews();
    newWindowLayoutManager.setupResizeListener();
    console.log('新窗口布局管理器和内容视图创建完成');
  } catch (error) {
    console.warn('新窗口布局管理器创建失败:', error);
  }

  // 为新窗口注册快捷键
  try {
    console.log('注册新窗口快捷键...');
    newWindowShortcutManager.registerShortcuts();
    console.log('新窗口快捷键注册完成');
  } catch (error) {
    console.warn('新窗口快捷键注册失败，但不影响核心功能:', error);
  }

  // 等待内容加载完成后再显示窗口
  // 先加载URL
  if (newWindowContentViewManager.contentView && !newWindowContentViewManager.contentView.webContents.isDestroyed()) {
    newWindowContentViewManager.contentView.webContents.loadURL(url);
  }
  
  setTimeout(() => {
    if (win && !win.isDestroyed()) {
      win.show();
      win.focus();
      console.log('新窗口显示完成 (内容加载后)');
    }
  }, 100); // 统一延迟时间，确保内容加载完成

  // 事件处理
  win.on('closed', () => {
    // 清理快捷键管理器
    if (win._shortcutManager) {
      win._shortcutManager.unregisterAll();
      win._shortcutManager = null;
    }
    // 清理工具栏管理器
    if (win._toolbarManager) {
      win._toolbarManager = null;
    }
    // 清理布局管理器
    if (win._layoutManager) {
      win._layoutManager = null;
    }
    console.log('新窗口已关闭');
  });

  return win;
}

/**
 * Windows系统提前检测系统主题背景色
 */
function getWindowsBackgroundColor() {
  try {
    const isDarkTheme = nativeTheme.shouldUseDarkColors;
    console.log('系统主题检测结果:', isDarkTheme ? '暗色' : '亮色');
    
    // Windows系统特殊处理，背景色与主题保持一致
    if (process.platform === 'win32') {
      return isDarkTheme ? '#1f1f1f' : '#f5f5f5';
    }
    // 其他系统使用原有逻辑，避免纯白色
    return isDarkTheme ? '#2d2d2d' : '#f5f5f5';
  } catch (error) {
    console.log('主题检测失败，使用默认背景色:', error);
    // Windows系统检测失败时使用中性背景
    if (process.platform === 'win32') {
      return '#f0f0f0';
    }
    return '#f5f5f5';
  }
}

/**
 * 创建主窗口
 */
function createMainWindow() {
  try {
    const windowWidth = 1400;
    const windowHeight = 900;
    const centerPosition = calculateCenteredPosition(windowWidth, windowHeight);

    // 提前获取背景色，确保窗口创建时立即应用
    const backgroundColor = getWindowsBackgroundColor();
    console.log('创建主窗口使用背景色:', backgroundColor);

    mainWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      x: centerPosition.x,
      y: centerPosition.y,
      backgroundColor: backgroundColor, // 统一用主题色
      show: false, // 先不显示，等 ready-to-show 再 show
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        sandbox: false,
        backgroundColor: backgroundColor, // BrowserView 也统一用主题色
        transparent: false // 禁止透明，避免黑底
      }
    });
    
    // ===== 立即同步初始化，确保真正的立即加载 =====
    console.log('窗口创建完成，开始同步初始化...');
    
    try {
      // 立即同步创建内容视图管理器
      contentViewManager = new ContentViewManager(mainWindow, APP_CONFIG, openNewWindow);
      mainWindow._contentViewManager = contentViewManager;
      console.log('内容视图管理器同步创建完成');

      // 立即同步创建内容视图并开始加载
      const view = contentViewManager.createContentView(undefined, APP_CONFIG.HOME_URL);
      console.log('内容视图同步创建完成，页面已开始加载');

      // 只在内容视图创建并 loadURL 后注册一次拦截器
      if (view && view.webContents) {
        view.webContents.once('did-finish-load', () => {
          setupMainWindowInterceptors();
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.show();
            mainWindow.focus();
            console.log('主窗口内容加载完成后显示');
          }
        });
      }

      // 立即设置正确的bounds，为工具栏预留空间，避免后续布局闪烁
      const contentBounds = mainWindow.getContentBounds();
      const toolbarHeight = 48; // 工具栏高度
      contentViewManager.setBounds({
        x: 0,
        y: toolbarHeight, // 直接为工具栏预留空间
        width: contentBounds.width,
        height: contentBounds.height - toolbarHeight
      });
      console.log('内容视图直接设置为工具栏下方，避免后续调整闪烁');
      
    } catch (error) {
      console.error('同步初始化失败:', error);
    }
    
  // 主窗口直接创建并显示，无 splash
    // 主窗口直接创建并显示，无 splash
    
    // 窗口显示后立即初始化其他组件，减少白屏期间的操作
    setImmediate(() => {
      initializeOtherComponentsAsync().catch(error => {
        console.warn('异步组件初始化失败:', error);
      });
    });

    mainWindow.on('close', (event) => {
      // 如果正在重启过程中，直接允许关闭，不显示确认对话框
      if (isRestarting) {
        console.log('重启过程中，跳过关闭确认对话框');
        return; // 允许默认关闭行为
      }
      
      // 如果已经确认过退出，也直接允许关闭
      if (isQuittingConfirmed) {
        console.log('已确认退出，跳过关闭确认对话框');
        return; // 允许默认关闭行为
      }
      
      // 阻止默认关闭行为
      event.preventDefault();
      
      // 显示关闭确认对话框
      const { dialog } = require('electron');
      const options = {
        type: 'question',
        title: '确认关闭',
        message: '确定要关闭应用程序吗？',
        detail: '关闭后所有窗口都将被关闭，当前的浏览状态将不会保存。',
        buttons: ['取消', '确认关闭'],
        defaultId: 0, // 默认选中"取消"
        cancelId: 0,  // ESC键对应"取消"
        noLink: true
      };

      dialog.showMessageBox(mainWindow, options).then((result) => {
        if (result.response === 1) { // 用户点击了"确认关闭"
          // 设置退出确认标志，避免 before-quit 事件重复确认
          isQuittingConfirmed = true;
          
          // 先关闭所有子窗口
          closeAllChildWindows();
          
          // 最后关闭主窗口
          mainWindow.destroy();
        }
        // 如果用户点击了"取消"，什么都不做，窗口保持打开
      }).catch((error) => {
        console.error('显示关闭确认对话框失败:', error);
        // 出错时也不关闭窗口，保持安全
      });
    });

    mainWindow.on('closed', () => {
      // 清理所有子窗口
      closeAllChildWindows();
      
      mainWindow = null;
    });
  } catch (error) {
    console.error('主窗口创建失败:', error);
    throw error;
  }
}


app.whenReady().then(() => {
  console.log('=== Electron Ready ===', `耗时: ${Date.now() - startTime}ms`);
  
  // 只在 macOS 系统下初始化 i18n
  if (process.platform === 'darwin') {
    console.log('macOS 系统 - 延迟加载 i18n');
    // 延迟加载i18n模块，提升启动性能
    i18n = require('./utils/i18nManager');
    MacMenuManager = require('./utils/macMenuManager');
    console.log('App ready - 当前语言:', i18n.getCurrentLanguage());
    console.log('App ready - 测试翻译:', i18n.t('app.name'));
    console.log("App Data Path:", app.getPath('userData'));
  } else {
    console.log('非 macOS 系统 - 跳过 i18n 初始化');
    console.log("App Data Path:", app.getPath('userData'));
  }

  // Windows 系统主题变化监听器 - 动态更新背景色减少白屏
  if (process.platform === 'win32') {
    nativeTheme.on('updated', () => {
      try {
        // 使用统一的背景色检测函数
        const newBgColor = getWindowsBackgroundColor();
        
        console.log('Windows系统主题变化检测到，更新背景色:', newBgColor);
        
        // 更新主窗口背景色
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setBackgroundColor(newBgColor);
        }
        
        // 更新所有子窗口背景色
        allWindows.forEach(win => {
          if (win && !win.isDestroyed()) {
            win.setBackgroundColor(newBgColor);
          }
        });
      } catch (error) {
        console.error('Windows主题变化处理失败:', error);
      }
    });
  }

  // 延迟加载模块，提升启动性能
  console.log('=== 开始加载模块 ===', `耗时: ${Date.now() - startTime}ms`);
  loadModulesLazily();
  console.log('=== 模块加载完成 ===', `耗时: ${Date.now() - startTime}ms`);

  // 恢复 StartupManager 逻辑，仅首次启动或特殊场合才显示 splash
  updateManager = new UpdateManager();
  global.updateManager = updateManager;
  console.log('更新管理器初始化完成');
  // 每次都播放 splash，主窗口后台创建但不加载 url，等 splash 关闭后再加载页面
  const { createStartupWindow } = require('./utils/startupWindowHelper');
  let splashClosed = false;
  // 先创建主窗口，但不加载内容
  function createMainWindowWithoutUrl() {
    try {
      const windowWidth = 1400;
      const windowHeight = 900;
      const centerPosition = calculateCenteredPosition(windowWidth, windowHeight);
      const backgroundColor = getWindowsBackgroundColor();
      console.log('创建主窗口（不加载url）使用背景色:', backgroundColor);
      mainWindow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        x: centerPosition.x,
        y: centerPosition.y,
        backgroundColor: backgroundColor,
        show: false,
        webPreferences: {
          contextIsolation: true
        }
      });
      // 初始化内容视图管理器，但不加载主页面
      contentViewManager = new ContentViewManager(mainWindow, APP_CONFIG, openNewWindow);
      mainWindow._contentViewManager = contentViewManager;
      // 只创建空白内容视图
      contentViewManager.createContentView(undefined, 'about:blank');
      // 立即设置正确的bounds，为工具栏预留空间，避免后续布局闪烁
      const contentBounds = mainWindow.getContentBounds();
      const toolbarHeight = 48;
      contentViewManager.setBounds({
        x: 0,
        y: toolbarHeight,
        width: contentBounds.width,
        height: contentBounds.height - toolbarHeight
      });
  // 不自动 show，等 splash 关闭后再 show
      // 关闭事件等同原逻辑
      mainWindow.on('close', (event) => {
        if (isRestarting) return;
        if (isQuittingConfirmed) return;
        event.preventDefault();
        const { dialog } = require('electron');
        const options = {
          type: 'question',
          title: '确认关闭',
          message: '确定要关闭应用程序吗？',
          detail: '关闭后所有窗口都将被关闭，当前的浏览状态将不会保存。',
          buttons: ['取消', '确认关闭'],
          defaultId: 0,
          cancelId: 0,
          noLink: true
        };
        dialog.showMessageBox(mainWindow, options).then((result) => {
          if (result.response === 1) {
            isQuittingConfirmed = true;
            closeAllChildWindows();
            mainWindow.destroy();
          }
        }).catch(() => {});
      });
      mainWindow.on('closed', () => {
        closeAllChildWindows();
        mainWindow = null;
      });
      // 立即初始化其他组件
      setImmediate(() => {
        initializeOtherComponentsAsync().catch(error => {
          console.warn('异步组件初始化失败:', error);
        });
      });

      // 主窗口布局完成后立即关闭 splash 并显示主窗口
      if (global.splashWindow && !global.splashWindow.isDestroyed()) {
        try {
          global.splashWindow.close();
        } catch (e) {
          console.warn('关闭 splash 窗口失败:', e.message);
        }
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
        // 然后开始加载页面内容
        if (contentViewManager && contentViewManager.contentView) {
          try {
            const wc = contentViewManager.contentView.webContents;
            wc.loadURL(APP_CONFIG.HOME_URL);
            console.log('主窗口开始加载页面:', APP_CONFIG.HOME_URL);
            wc.once('did-finish-load', () => {
              console.log('主窗口页面加载完成');
            });
          } catch (e) {
            console.warn('主窗口内容视图加载页面失败:', e.message);
          }
        }
      }
    } catch (error) {
      console.error('主窗口创建失败:', error);
      throw error;
    }
  }

  // 播放 splash，后台创建主窗口但不加载页面
  // 先创建主窗口和内容视图，布局完成后自动关闭 splash 并显示主窗口
  global.splashWindow = createStartupWindow(undefined, {
    width: 1000,
    height: 600,
    duration: 3500,
    onClose: () => {
      // 兜底：如果主窗口还没显示，则在此显示
      if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
        mainWindow.show();
        mainWindow.focus();
        if (contentViewManager && contentViewManager.contentView) {
          try {
            const wc = contentViewManager.contentView.webContents;
            wc.loadURL(APP_CONFIG.HOME_URL);
            console.log('主窗口开始加载页面(兜底):', APP_CONFIG.HOME_URL);
          } catch (e) {
            console.warn('主窗口内容视图加载页面失败(兜底):', e.message);
          }
        }
      }
      // 启动更新检查
      setTimeout(() => {
        if (updateManager) {
          console.log('启动更新检查');
          updateManager.startPeriodicCheck();
        }
      }, 8000);
    }
  });
  createMainWindowWithoutUrl();
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
 * 异步初始化其他非关键组件（不影响页面加载）
 */
function initializeOtherComponentsAsync() {
  return new Promise((resolve, reject) => {
    try {
      console.log('开始异步初始化其他组件...');
      
      // 创建快捷键管理器
      shortcutManager = new ShortcutManager(contentViewManager, APP_CONFIG.HOME_URL, mainWindow, true);
      shortcutManager.initialUrl = APP_CONFIG.HOME_URL;
      shortcutManager.homeUrl = APP_CONFIG.HOME_URL;
      console.log('快捷键管理器创建完成');

      // 创建工具栏管理器
      toolbarManager = new ToolbarManager(mainWindow, (action) => {
        if (shortcutManager) {
          shortcutManager.handleToolbarAction(action);
        }
      }, null);
      contentViewManager.setToolbarManager(toolbarManager);
      console.log('工具栏管理器创建完成');

      // 创建布局管理器
      layoutManager = new LayoutManager(mainWindow, toolbarManager, contentViewManager);
      console.log('布局管理器创建完成');

      // 设置管理器引用
      mainWindow._toolbarManager = toolbarManager;
      mainWindow._shortcutManager = shortcutManager;
      mainWindow._layoutManager = layoutManager;

      // 异步创建工具栏视图
      if (toolbarManager) {
        toolbarManager.createToolbarView().then(() => {
          console.log('工具栏视图创建完成');
          // 缩小工具栏宽度为主窗口宽度的 70%，右侧留出背景色
          const contentBounds = mainWindow.getContentBounds();
          const toolbarWidth = Math.floor(contentBounds.width * 0.7);
          toolbarManager.setBounds({
            x: 0,
            y: 0,
            width: toolbarWidth,
            height: 48 // 工具栏高度
          });
          console.log('工具栏bounds设置完成，工具栏应该可见（缩小宽度）');
        }).catch((error) => {
          console.warn('工具栏视图创建失败:', error);
        });
      }

  // ...拦截器注册已移至 createMainWindow 内容视图加载后...

      // 注册快捷键（非阻塞）
      if (shortcutManager && process.platform !== 'darwin') {
        setTimeout(() => {
          try {
            shortcutManager.registerShortcuts();
            console.log('快捷键注册完成');
          } catch (error) {
            console.warn('快捷键注册失败:', error);
          }
        }, 100);
      }

      // 创建菜单（非阻塞）
      if (process.platform === 'darwin') {
        setTimeout(() => {
          try {
            macMenuManager = new MacMenuManager(mainWindow);
            console.log('macOS菜单创建完成');
          } catch (error) {
            console.warn('macOS菜单创建失败:', error);
          }
        }, 100);
      }

      console.log('其他组件异步初始化完成');
      resolve();
    } catch (error) {
      console.error('异步初始化其他组件失败:', error);
      reject(error);
    }
  });
}

/**
 * 第一阶段：初始化基础管理器（最小必要组件）
 */
function initializeBasicManagers() {
  try {
    console.log('创建最小必要管理器...');

    // 仅创建内容视图管理器，其他延后
    contentViewManager = new ContentViewManager(mainWindow, APP_CONFIG, openNewWindow);
    console.log('内容视图管理器创建完成');

    // 设置主窗口的管理器引用
    mainWindow._contentViewManager = contentViewManager;

    console.log('基础管理器初始化完成');
  } catch (error) {
    console.error('初始化基础管理器失败:', error);
    throw error;
  }
}

/**
 * 第二阶段：异步初始化视图和其他组件
 */
function initializeViewsAsync() {
  return new Promise((resolve, reject) => {
    try {
      console.log('第二阶段：异步创建完整组件...');
      
      // 异步创建其他管理器
      setImmediate(() => {
        try {
          // 创建快捷键管理器
          shortcutManager = new ShortcutManager(contentViewManager, APP_CONFIG.HOME_URL, mainWindow, true);
          shortcutManager.initialUrl = APP_CONFIG.HOME_URL;
          shortcutManager.homeUrl = APP_CONFIG.HOME_URL;
          console.log('快捷键管理器创建完成');

          // 下一个tick创建工具栏
          setImmediate(() => {
            createToolbarAsync(resolve, reject);
          });
        } catch (error) {
          console.warn('快捷键管理器创建失败:', error);
          setImmediate(() => {
            createToolbarAsync(resolve, reject);
          });
        }
      });
      
    } catch (error) {
      console.error('异步初始化失败:', error);
      reject(error);
    }
  });
}

/**
 * 异步创建工具栏和布局
 */
function createToolbarAsync(resolve, reject) {
  try {
    // 创建工具栏管理器
    toolbarManager = new ToolbarManager(mainWindow, (action) => {
      if (shortcutManager) {
        shortcutManager.handleToolbarAction(action);
      }
    }, null);

    contentViewManager.setToolbarManager(toolbarManager);
    console.log('工具栏管理器创建完成');

    // 下一个tick创建布局
    setImmediate(() => {
      createLayoutAsync(resolve, reject);
    });
  } catch (error) {
    console.warn('工具栏管理器创建失败:', error);
    setImmediate(() => {
      createLayoutAsync(resolve, reject);
    });
  }
}

/**
 * 异步创建布局和视图
 */
function createLayoutAsync(resolve, reject) {
  try {
    // 创建布局管理器
    layoutManager = new LayoutManager(mainWindow, toolbarManager, contentViewManager);
    console.log('布局管理器创建完成');

    // 设置管理器引用
    mainWindow._toolbarManager = toolbarManager;
    mainWindow._shortcutManager = shortcutManager;
    mainWindow._layoutManager = layoutManager;

    // 下一个tick创建视图
    setImmediate(() => {
      createViewsAsync(resolve, reject);
    });
  } catch (error) {
    console.warn('布局管理器创建失败:', error);
    setImmediate(() => {
      createViewsAsync(resolve, reject);
    });
  }
}

/**
 * 异步创建视图（除了内容视图，只创建工具栏等）
 */
function createViewsAsync(resolve, reject) {
  try {
    console.log('异步创建工具栏视图...');

    // 异步创建工具栏视图
    if (toolbarManager) {
      toolbarManager.createToolbarView().then(() => {
        console.log('工具栏视图创建完成');
        // 工具栏创建完成后立即重新布局，确保内容视图位置正确
        if (layoutManager) {
          layoutManager.layoutViews();
          console.log('工具栏创建后重新布局完成');
        }
      }).catch((error) => {
        console.warn('工具栏视图创建失败:', error);
      });
    }

    // 设置布局和其他配置
    setImmediate(() => {
      finishInitialization();
      // 视图创建完成，通知可以显示窗口
      if (resolve) resolve();
    });
  } catch (error) {
    console.warn('异步创建视图失败:', error);
    setImmediate(() => {
      finishInitialization();
      if (reject) reject(error);
    });
  }
}

/**
 * 完成初始化
 */
function finishInitialization() {
  try {
    // 设置布局
    setupLayout();

  // ...拦截器注册已移至 createMainWindow 内容视图加载后...

    // 注册快捷键（非阻塞）
    if (shortcutManager && process.platform !== 'darwin') {
      setTimeout(() => {
        try {
          shortcutManager.registerShortcuts();
          console.log('快捷键注册完成');
        } catch (error) {
          console.warn('快捷键注册失败:', error);
        }
      }, 100);
    }

    // 创建菜单（非阻塞）
    if (process.platform === 'darwin') {
      setTimeout(() => {
        try {
          macMenuManager = new MacMenuManager(mainWindow);
          console.log('macOS菜单创建完成');
        } catch (error) {
          console.warn('macOS菜单创建失败:', error);
        }
      }, 100);
    }

    console.log('所有组件异步初始化完成');
  } catch (error) {
    console.error('完成初始化失败:', error);
  }
}

/**
 * 初始化所有管理器（旧版本，保留以防回滚）
 */
function initializeManagers() {
  try {
    console.log('初始化管理器...');

    // 创建内容视图管理器
    contentViewManager = new ContentViewManager(mainWindow, APP_CONFIG, openNewWindow);
    console.log('内容视图管理器创建完成');

    // 创建快捷键管理器
    shortcutManager = new ShortcutManager(contentViewManager, APP_CONFIG.HOME_URL, mainWindow, true);
    // 设置主窗口的初始 url
    shortcutManager.initialUrl = APP_CONFIG.HOME_URL;
    shortcutManager.homeUrl = APP_CONFIG.HOME_URL;
    console.log('快捷键管理器创建完成');

    // 暂时简化工具栏管理器创建
    try {
      toolbarManager = new ToolbarManager(mainWindow, (action) => {
        if (shortcutManager) {
          shortcutManager.handleToolbarAction(action);
        }
      }, null);

      // 连接工具栏管理器和内容视图管理器
      contentViewManager.setToolbarManager(toolbarManager);
      console.log('工具栏管理器创建完成');
    } catch (error) {
      console.warn('工具栏管理器创建失败，但不影响核心功能:', error);
    }

    // 创建布局管理器
    layoutManager = new LayoutManager(mainWindow, toolbarManager, contentViewManager);
    console.log('布局管理器创建完成');

    // 设置主窗口的管理器引用，供菜单使用
    mainWindow._contentViewManager = contentViewManager;
    mainWindow._toolbarManager = toolbarManager;
    mainWindow._shortcutManager = shortcutManager;
    mainWindow._layoutManager = layoutManager;

    console.log('所有管理器初始化完成');
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
    console.log('快速创建视图...');

    // 优先创建工具栏视图，确保立即显示
    if (toolbarManager) {
      try {
        console.log('创建工具栏视图...');
        toolbarManager.createToolbarView();
        console.log('工具栏视图创建完成');
      } catch (error) {
        console.warn('工具栏视图创建失败，但不影响核心功能:', error);
      }
    }

    // 创建内容视图
    console.log('创建内容视图...');
    contentViewManager.createContentView();
    console.log('内容视图创建完成');

    // Windows/Linux 平台：内容视图创建后再注册快捷键，确保 webContents 存在
    if (shortcutManager && process.platform !== 'darwin') {
      try {
        console.log('内容视图创建后注册主窗口快捷键...');
        shortcutManager.registerShortcuts();
        console.log('主窗口快捷键注册完成');
      } catch (error) {
        console.warn('主窗口快捷键注册失败:', error);
      }
    }

  // ...拦截器注册已移至 createMainWindow 内容视图加载后...

    console.log('所有视图快速创建完成');
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

      // 添加外部链接处理 - 遵循白名单逻辑
      contentView.webContents.on('new-window', (event, url) => {
        event.preventDefault();
        const domain = require('./utils/urlHelper').getHostname(url);

        // 检查是否是关于界面的GitHub链接
        if (domain.includes('github.com')) {
          // 只有在关于界面中才允许打开GitHub链接
          if (isExternalLinkAllowedContext(contentView.webContents)) {
            shell.openExternal(url);
            return;
          } else {
            // 其他情况下拦截GitHub链接
            showBlockedDialogWithDebounce(mainWindow, domain, '该域名不在允许访问范围', 'default');
            return;
          }
        }

        // 如果是主域名或白名单域名，在新窗口中打开
        if (domain === APP_CONFIG.MAIN_DOMAIN || isWhiteDomain(url, APP_CONFIG)) {
          openNewWindow(url);
          return;
        }

        // 其他域名显示拦截提示
        if (mainWindow && !mainWindow.isDestroyed()) {
          showBlockedDialogWithDebounce(mainWindow, domain, '该域名不在允许访问范围', 'default');
        }
      });

      // 主窗口 will-navigate 拦截
      contentView.webContents.on('will-navigate', (event, url) => {
        const domain = require('./utils/urlHelper').getHostname(url);

        // 检查是否是GitHub链接
        if (domain.includes('github.com')) {
          event.preventDefault();
          // 只有在关于界面中才允许打开GitHub链接
          if (isExternalLinkAllowedContext(contentView.webContents)) {
            shell.openExternal(url);
          } else {
            // 其他情况下拦截GitHub链接
            showBlockedDialogWithDebounce(mainWindow, domain, '该域名不在允许访问范围', 'default');
          }
          return;
        }

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

        // 检查是否是GitHub链接
        if (domain.includes('github.com')) {
          // 只有在关于界面中才允许打开GitHub链接
          if (isExternalLinkAllowedContext(contentView.webContents)) {
            shell.openExternal(url);
          } else {
            // 其他情况下拦截GitHub链接
            showBlockedDialogWithDebounce(mainWindow, domain, '该域名不在允许访问范围', 'default');
          }
          return { action: 'deny' };
        }

        // 如果是主域名，允许打开
        if (domain === APP_CONFIG.MAIN_DOMAIN) {
          return { action: 'allow' };
        }

        // 如果在白名单中，在新窗口中打开
        if (isWhiteDomain(url, APP_CONFIG)) {
          openNewWindow(url);
          return { action: 'deny' };
        }

        // 非白名单域名，显示拦截对话框
        if (mainWindow && !mainWindow.isDestroyed()) {
          showBlockedDialogWithDebounce(mainWindow, domain, '该域名不在允许访问范围', 'default');
        }
        return { action: 'deny' };
      });
    }
  }
}

/**
 * 设置布局
 */
function setupLayout() {
  try {
    console.log('立即设置布局...');

    if (layoutManager) {
      // 立即执行布局计算，确保工具栏位置正确
      layoutManager.layoutViews();
      layoutManager.setupResizeListener();
      console.log('布局立即设置完成');
    } else {
      console.warn('布局管理器不存在，跳过布局设置');
    }

    // 注册快捷键（非 macOS 平台需要通过 ShortcutManager 处理）
    if (shortcutManager && process.platform !== 'darwin') {
      try {
        console.log('注册 Windows/Linux 快捷键...');
        shortcutManager.registerShortcuts();
        console.log('Windows/Linux 快捷键注册完成');
      } catch (error) {
        console.warn('快捷键注册失败，但不影响核心功能:', error);
      }
    }
  } catch (error) {
    console.error('设置布局失败:', error);
    // 不抛出错误，允许应用继续运行
    console.warn('布局设置失败，但应用将继续运行');
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
  } catch { }
});

let isRestarting = false; // 标记是否正在重启

// 导出重启状态设置函数
global.setRestartingState = (state) => {
  console.log(`设置重启状态: ${isRestarting} -> ${state}`);
  isRestarting = state;
  // 重启时重置退出确认标志
  if (state) {
    isQuittingConfirmed = false;
    // 重启时清理所有子窗口
    closeAllChildWindows();
  }
};

app.on('reopen-main-window', () => {
  console.log('收到重新打开主窗口事件');
  isRestarting = true; // 设置重启标记
  // 立即重新创建主窗口，无需延迟
  if (!mainWindow) {
    try {
      // 重新创建主窗口
      createMainWindow();
      console.log('重启完成，清除重启标记');
      isRestarting = false; // 重启完成，清除标记
      isQuittingConfirmed = false; // 重置退出确认标志
    } catch (error) {
      console.error('重置后主窗口创建失败:', error);
      console.log('重启失败，清除重启标记');
      isRestarting = false; // 发生错误也要清除标记
      isQuittingConfirmed = false; // 重置退出确认标志
    }
  } else {
    console.log('主窗口已存在，清除重启标记');
    isRestarting = false; // 主窗口已存在，清除标记
    isQuittingConfirmed = false; // 重置退出确认标志
  }
});

app.on('before-quit', (event) => {
  // 如果是通过主窗口关闭确认对话框触发的退出，不需要再次确认
  if (isQuittingConfirmed) {
    return;
  }
  
  // 如果正在重启，也不需要确认
  if (isRestarting) {
    return;
  }
  
  // 阻止默认退出行为，显示确认对话框
  event.preventDefault();
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    // 如果主窗口存在，通过主窗口的 close 事件来处理
    // 这样可以复用主窗口的确认逻辑
    mainWindow.close();
  } else {
    // 如果主窗口不存在，直接显示确认对话框
    const { dialog } = require('electron');
    const options = {
      type: 'question',
      title: '确认退出',
      message: '确定要退出应用程序吗？',
      detail: '退出后所有窗口都将被关闭。',
      buttons: ['取消', '确认退出'],
      defaultId: 0,
      cancelId: 0,
      noLink: true
    };

    dialog.showMessageBox(null, options).then((result) => {
      if (result.response === 1) {
        isQuittingConfirmed = true;
        
        // 先关闭所有子窗口
        closeAllChildWindows();
        
        app.quit();
      }
    }).catch((error) => {
      console.error('显示退出确认对话框失败:', error);
    });
  }
});

app.on('will-quit', () => {
  // 取消注册所有快捷键
  if (shortcutManager) {
    shortcutManager.unregisterAll();
  }
});


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

// macOS 专用：处理 Dock 图标点击事件（例如 Cmd+H 隐藏后重新激活）
app.on('activate', () => {
  console.log('应用被激活（点击 Dock 图标）');

  // 如果正在重启，不处理激活事件
  if (isRestarting) {
    console.log('正在重启中，跳过激活事件处理');
    return;
  }

  // 如果主窗口存在但被隐藏，则显示它
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (!mainWindow.isVisible()) {
      console.log('主窗口被隐藏，正在显示...');
      mainWindow.show();
    }
    // 确保窗口在前台
    mainWindow.focus();
    console.log('主窗口已激活并聚焦');
  } else if (!mainWindow) {
    // 如果主窗口不存在，重新创建
    console.log('主窗口不存在，正在重新创建...');
    createMainWindow();
  }
});
