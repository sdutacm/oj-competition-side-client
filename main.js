const { app, BrowserWindow, nativeTheme, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const ToolbarManager = require('./utils/toolbarManager');
const ContentViewManager = require('./utils/contentViewManager');
const ShortcutManager = require('./utils/shortcutManager');
const { LayoutManager } = require('./utils/windowHelper');
const PlatformHelper = require('./utils/platformHelper');
const { isWhiteDomain } = require('./utils/domainHelper');
const { showBlockedDialog } = require('./utils/dialogHelper');
const { getAppVersion } = require('./utils/versionHelper');
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

// Windows 系统性能优化 - 尽早禁用硬件加速
if (process.platform === 'win32') {
  console.log('Windows 系统 - 尽早禁用硬件加速');
  app.disableHardwareAcceleration();
}

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
  console.log('创建优化新窗口:', url);

  const backgroundColor = nativeTheme.shouldUseDarkColors ? '#2d2d2d' : '#ffffff';

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    // show: false, // 不立即显示，等加载完成
    backgroundColor: backgroundColor,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true, // 恢复安全设置
      sandbox: false,
      backgroundThrottling: false,
      spellcheck: false,
      webgl: false,
      enableWebSQL: false
    }
  });

  win.loadURL(url);

  // 页面加载完成后显示
  win.webContents.once('did-finish-load', () => {
    setTimeout(() => {
      if (win && !win.isDestroyed()) {
        win.show();

        // 为新窗口也注入性能优化CSS
        win.webContents.insertCSS(`
          /* 强制禁用平滑滚动 */
          *, html, body, div, section, article, main {
            scroll-behavior: auto !important;
            -webkit-overflow-scrolling: auto !important;
            overflow-scrolling: auto !important;
          }
          
          /* 优化性能 */
          * {
            -webkit-transform: translateZ(0);
            -webkit-backface-visibility: hidden;
            -webkit-animation: none !important;
            animation: none !important;
            -webkit-transition: none !important;
            transition: none !important;
          }
          
          /* 强制硬件加速 */
          body, main, .container, .content {
            -webkit-transform: translate3d(0,0,0) !important;
            transform: translate3d(0,0,0) !important;
          }
        `).catch(() => { });
      }
    }, 100);
  });

  // 超时显示机制
  setTimeout(() => {
    if (win && !win.isDestroyed() && !win.isVisible()) {
      win.show();
    }
  }, 3000);

  // 事件处理
  win.on('closed', () => {
    console.log('新窗口已关闭');
  });

  return win;
}

/**
 * 创建主窗口
 */
function createMainWindow() {
  try {
    // 稳定但优化的窗口配置
    console.log('创建稳定优化主窗口...');

    // 根据系统主题设置背景色
    const backgroundColor = nativeTheme.shouldUseDarkColors ? '#2d2d2d' : '#ffffff';

    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      backgroundColor: backgroundColor,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        sandbox: false,
        backgroundThrottling: false, // 禁用后台节流
        spellcheck: false, // 禁用拼写检查
        enableWebSQL: false // 禁用WebSQL
      }
    });

    // 加载网站
    // mainWindow.loadURL(APP_CONFIG.HOME_URL);

    // 页面准备完成后显示

    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
        console.log('主窗口显示完成');
        try {
          initializeManagers();
          createViews();
          setupLayout();

          if (process.platform === 'darwin') {
            macMenuManager = new MacMenuManager(mainWindow);
          }
        } catch (error) {
          console.error('初始化失败:', error);
        }
      }
      // setTimeout(() => {
      //   if (contentViewManager && contentViewManager.getView()) {
      //     const contentView = contentViewManager.getView();
      //     if (contentView && contentView.webContents) {
      //       contentView.webContents.insertCSS(`
      //           * {
      //             scroll-behavior: auto !important;
      //           }
      //           html {
      //             scroll-behavior: auto !important;
      //           }
      //           body {
      //             scroll-behavior: auto !important;
      //           }
      //           div, section, article, main, aside, nav, header, footer {
      //             scroll-behavior: auto !important;
      //           }
                
      //           * {
      //             -webkit-overflow-scrolling: auto !important;
      //             overflow-scrolling: auto !important;
      //             scroll-snap-type: none !important;
      //             scroll-padding: 0 !important;
      //             scroll-margin: 0 !important;
      //           }
                
      //           /* 优化滚动性能 */
      //           * {
      //             -webkit-transform: translateZ(0);
      //             -webkit-backface-visibility: hidden;
      //             -webkit-perspective: 1000;
      //           }
                
      //           /* 强制硬件加速特定元素 */
      //           body, main, .container, .content, div[class*="container"], div[class*="scroll"], div[id*="scroll"] {
      //             -webkit-transform: translate3d(0,0,0) !important;
      //             transform: translate3d(0,0,0) !important;
      //             will-change: transform !important;
      //           }
                
      //           /* 保留视觉效果，只禁用可能影响滚动性能的特定效果 */
      //           /* 保留 box-shadow, text-shadow 等视觉效果 */
      //           /* 只禁用可能严重影响性能的 filter 和 backdrop-filter */
      //           * {
      //             backdrop-filter: none !important;
      //             -webkit-backdrop-filter: none !important;
      //           }
      //         `)
      //     }
      //   }
      // }, 0);
    }, 0);


    // 超时显示机制
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
        console.log('超时强制显示窗口');
        mainWindow.show();
      }
    }, 5000);

    // 基本事件处理
    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    console.log('稳定优化主窗口创建完成');
    return; // 提前返回，跳过所有其他初始化
  } catch (error) {
    console.error('主窗口创建失败:', error);
    throw error;
  }
}

app.whenReady().then(() => {
  // 只在 macOS 系统下初始化 i18n
  if (process.platform === 'darwin') {
    console.log('macOS 系统 - 初始化 i18n');
    console.log('App ready - 当前语言:', i18n.getCurrentLanguage());
    console.log('App ready - 测试翻译:', i18n.t('app.name'));
  }

  startupManager = new StartupManager();
  startupManager.handleAppStartup(() => {
    console.log('启动窗口完成，创建主窗口');
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
    // 创建内容视图管理器
    contentViewManager = new ContentViewManager(mainWindow, APP_CONFIG, openNewWindow);

    // 连接工具栏管理器和内容视图管理器
    // contentViewManager.setToolbarManager(toolbarManager);

    // 创建快捷键管理器（在内容视图管理器创建后）
    shortcutManager = new ShortcutManager(contentViewManager, APP_CONFIG.HOME_URL, mainWindow, true);
    // 设置主窗口的初始 url
    shortcutManager.initialUrl = APP_CONFIG.HOME_URL;
    shortcutManager.homeUrl = APP_CONFIG.HOME_URL;

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
    // 创建工具栏视图
    toolbarManager.createToolbarView();
    // 创建内容视图
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
    // 指定可打开的外部链接
    const externalDomains = ['https://github.com/sdutacm/oj-competition-side-client'];

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

        // 检查是否是特定的外部链接，用外部浏览器打开
        if (externalDomains.some(d => domain.includes(d))) {
          shell.openExternal(url);
          return;
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
        if (externalDomains.some(d => domain.includes(d))) {
          event.preventDefault();
          shell.openExternal(url);
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
      });

      // 主窗口 setWindowOpenHandler 拦截
      contentView.webContents.setWindowOpenHandler(({ url }) => {
        const domain = require('./utils/urlHelper').getHostname(url);

        // 检查是否是特定的外部链接，直接用系统浏览器打开
        if (externalDomains.some(d => domain.includes(d))) {
          shell.openExternal(url);
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
  } catch { }
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
