const { app, BrowserWindow, nativeTheme, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

// 🔥 Windows专用：极早期设置AppUserModelId - 确保任务栏图标从一开始就正确
if (process.platform === 'win32') {
  try {
    app.setAppUserModelId('org.sdutacm.SDUTOJCompetitionSideClient');
    console.log('✅ Windows AppUserModelId 预启动设置完成（防止首次启动图标失效）');
  } catch (error) {
    console.warn('⚠️  AppUserModelId 预启动设置失败:', error);
  }
}

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
    iconPath = path.join(__dirname, 'public/icon.png');
  }
  
    // 根据系统主题设置背景色，完全匹配系统颜色避免白屏
    const backgroundColor = nativeTheme.shouldUseDarkColors ? '#000000' : '#ffffff';
    
    const win = new BrowserWindow({
      width,
      height,
      icon: iconPath,
      backgroundColor: backgroundColor, // 纯黑/纯白背景，彻底避免闪烁
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        devTools: false,
        webSecurity: true,
        sandbox: false,
        nodeIntegrationInWorker: false,
        nodeIntegrationInSubFrames: false,
        enableRemoteModule: false,
        
        // Windows专用：极简新窗口配置
        ...(process.platform === 'win32' ? {
          backgroundThrottling: false,
          webgl: true,
          acceleratedCompositing: true,
          spellcheck: false,
          enableWebSQL: false,
          v8CacheOptions: 'code',
          // 极简策略：让Chrome自己处理渲染优化
          enableBlinkFeatures: 'OverlayScrollbars',
          disableBlinkFeatures: 'ScrollBounce,OverscrollHistoryNavigation',
          // 基本优化
          webSecurityEnabled: true,
          allowDisplayingInsecureContent: false,
          allowRunningInsecureContent: false,
          // 启用更好的图片解码和缓存
          enableImageBitmapOffscreenCanvas: true,
          // Windows专用：滚动性能优化
          scrollBounce: false, // 禁用滚动回弹
          // 禁用不必要的功能以提高性能
          plugins: false,
          java: false,
        } : {
          backgroundThrottling: false,
          experimentalFeatures: true,
          webgl: true,
          acceleratedCompositing: true,
          spellcheck: false,
          enableWebSQL: false,
          v8CacheOptions: 'code',
          enableBlinkFeatures: 'OverlayScrollbars,BackForwardCache',
        }),
        
        // Windows专用：精简新窗口命令行参数
        additionalArguments: process.platform === 'win32' ? [
          // 核心优化，避免冲突
          '--disable-features=ScrollBounce,OverscrollHistoryNavigation',
          
          // GPU 基础优化
          '--enable-gpu-rasterization',
          '--enable-oop-rasterization', 
          '--enable-zero-copy',
          
          // 动画性能核心参数
          '--enable-accelerated-2d-canvas',
          '--enable-threaded-compositing',
          '--disable-frame-rate-limit',
          '--max-gum-fps=120',
          '--enable-webgl',
          '--enable-webgl2',
          
          // 进程优化
          '--disable-background-timer-throttling',
          '--disable-renderer-backgrounding',
          
          // 内存优化 - 新窗口适中内存
          '--memory-pressure-off',
          '--max-old-space-size=4096', // 新窗口适中配置
          '--no-sandbox'
        ] : [
          '--enable-gpu-rasterization',
          '--enable-oop-rasterization',
          '--enable-hardware-overlays'
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
      // Windows x64 新窗口性能优化
      if (process.platform === 'win32') {
        win.webContents.on('dom-ready', () => {
          win.webContents.insertCSS(`
            /* 新窗口优化 - 彻底修复滚轮回退 */
            html, body {
              scroll-behavior: auto !important;
              overscroll-behavior: none !important;
              transform: translateZ(0);
              contain: layout;
              overflow-anchor: none !important; /* 关键：禁用滚动锚定 */
              scroll-snap-type: none !important;
              scroll-snap-align: none !important;
            }
            
            /* 全局彻底禁用滚动锚定和相关功能 */
            *, *::before, *::after {
              overscroll-behavior: none !important;
              overflow-anchor: none !important; /* 修复回退 */
              scroll-snap-type: none !important;
              scroll-snap-align: none !important;
              text-rendering: optimizeSpeed;
              will-change: auto !important;
            }
            
            /* 强制禁用所有容器的回退相关属性 */
            html, body, div, section, article, main, header, footer, nav, aside {
              overflow-anchor: none !important;
              scroll-snap-type: none !important;
              scroll-snap-align: none !important;
              overscroll-behavior: none !important;
            }
            
            /* 动画优化 - 平衡性能和流畅度 */
            .loading, .spinner, [class*="loading"], .fade, [class*="animate"] {
              transform: translateZ(0);
              will-change: transform; /* 只对真正动画启用 */
              animation-timing-function: ease-out;
              backface-visibility: hidden;
              overflow-anchor: none !important;
            }
            
            /* 滚动优化 - 彻底防止回退 */
            .scroll, .scroll-container, [class*="scroll"], [style*="overflow"],
            div[style*="overflow"], section[style*="overflow"] {
              transform: translateZ(0);
              overflow-anchor: none !important; /* 防止回退 */
              contain: layout;
              scroll-snap-type: none !important; /* 禁用滚动捕捉 */
              scroll-snap-align: none !important;
              overscroll-behavior: none !important;
            }
            
            /* 图片内存优化 */
            img, video, canvas {
              max-width: 100%;
              height: auto;
              transform: translateZ(0);
              object-fit: contain;
              overflow-anchor: none !important;
            }
            
            /* 滚动条 */
            ::-webkit-scrollbar {
              width: 12px;
              background: transparent;
            }
            ::-webkit-scrollbar-thumb {
              background: rgba(0,0,0,0.2);
              border-radius: 6px;
            }
            
            /* 减少非必要动画 */
            *:not(.loading):not(.spinner):not([class*="loading"]):not(.fade):not([class*="animate"]) {
              animation: none !important;
              transition: none !important;
              will-change: auto !important;
              overflow-anchor: none !important;
            }
          `);
          
          // 为新窗口也注入JavaScript滚轮事件拦截
          win.webContents.executeJavaScript(`
            (function() {
              console.log('新窗口：注入滚轮回退修复脚本...');
              
              // 彻底禁用滚动锚定和回退相关功能
              function disableScrollAnchoring() {
                const allElements = document.querySelectorAll('*');
                allElements.forEach(el => {
                  if (el.style) {
                    el.style.overflowAnchor = 'none';
                    el.style.scrollSnapType = 'none';
                    el.style.scrollSnapAlign = 'none';
                    el.style.overscrollBehavior = 'none';
                  }
                });
                
                if (document.documentElement) {
                  document.documentElement.style.overflowAnchor = 'none';
                  document.documentElement.style.scrollSnapType = 'none';
                  document.documentElement.style.overscrollBehavior = 'none';
                }
                
                if (document.body) {
                  document.body.style.overflowAnchor = 'none';
                  document.body.style.scrollSnapType = 'none';
                  document.body.style.overscrollBehavior = 'none';
                }
              }
              
              disableScrollAnchoring();
              
              const observer = new MutationObserver(() => {
                disableScrollAnchoring();
              });
              
              observer.observe(document, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style', 'class']
              });
              
              // 拦截滚轮事件防止回退
              ['wheel', 'mousewheel', 'DOMMouseScroll'].forEach(eventType => {
                document.addEventListener(eventType, (e) => {
                  if (e.deltaY < 0) {
                    if (window.pageYOffset <= 0) {
                      e.preventDefault();
                      e.stopPropagation();
                      return false;
                    }
                  }
                }, { passive: false, capture: true });
              });
              
              // 防止负值滚动
              window.addEventListener('scroll', () => {
                const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
                if (currentScrollTop < 0) {
                  window.scrollTo(0, 0);
                }
              }, { passive: true });
              
              console.log('新窗口：滚轮回退修复脚本注入完成');
            })();
          `).catch(err => {
            console.log('新窗口JavaScript注入失败:', err);
          });
          
          console.log('新窗口专业滚动优化已应用');
        });
      }
    
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
  
  // Chrome 浏览器仿真：使用dom-ready显示窗口，避免白屏
  let windowShown = false;
  
  win.webContents.once('dom-ready', () => {
    if (!windowShown) {
      win.show();
      windowShown = true;
      console.log('新窗口通过dom-ready显示（Chrome仿真模式）');
      
      // Windows平台优化
      if (process.platform === 'win32') {
        setTimeout(() => {
          win.focus();
        }, 50);
      }
    }
  });
  
  // 备用显示机制，防止dom-ready未触发
  setTimeout(() => {
    if (!windowShown && !win.isDestroyed()) {
      win.show();
      windowShown = true;
      console.log('新窗口通过备用机制显示');
    }
  }, 2000);
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
      
      // 添加外部链接处理 - 遵循白名单逻辑
      contentView.webContents.on('new-window', (event, url) => {
        event.preventDefault();
        const domain = require('./utils/urlHelper').getHostname(url);
        
        // 检查是否是GitHub链接，只有在允许的上下文中才用外部浏览器打开
        if (domain.includes('github.com')) {
          if (isExternalLinkAllowedContext(contentView.webContents)) {
            shell.openExternal(url);
            return;
          } else {
            // 在非关于页面的情况下，阻止GitHub链接打开外部浏览器
            if (win && !win.isDestroyed()) {
              showBlockedDialogWithDebounce(win, domain, 'GitHub链接只能在关于页面或系统信息页面中打开', 'default');
            }
            return;
          }
        }
        
        // 检查是否是其他特定的外部链接，用外部浏览器打开
        const externalDomains = ['https://github.com/sdutacm/oj-competition-side-client'];
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
        if (win && !win.isDestroyed()) {
          showBlockedDialogWithDebounce(win, domain, '该域名不在允许访问范围', 'default');
        }
      });
      
      // 添加点击事件监听，处理可能被遗漏的外部链接
      contentView.webContents.on('before-input-event', (event, input) => {
        // 这里可以添加额外的处理逻辑
      });
      
      // 处理导航事件 - 严格按照白名单控制
      contentView.webContents.on('will-navigate', (event, url) => {
        const domain = require('./utils/urlHelper').getHostname(url);
        if (url.startsWith('http://') || url.startsWith('https://')) {
          // 检查是否是主域名或白名单域名
          if (domain === APP_CONFIG.MAIN_DOMAIN || isWhiteDomain(url, APP_CONFIG)) {
            // 允许导航到主域名或白名单域名
            return;
          }
          
          // 检查是否是特定的外部链接，用外部浏览器打开
          const externalDomains = ['https://github.com/sdutacm/oj-competition-side-client'];
          if (externalDomains.some(d => domain.includes(d))) {
            event.preventDefault();
            shell.openExternal(url);
            return;
          }
          
          // 其他非白名单域名阻止导航
          event.preventDefault();
          console.log('阻止导航到非白名单域名:', domain);
        }
      });
      
      // 新窗口 setWindowOpenHandler 拦截非法域名并弹窗
      contentView.webContents.setWindowOpenHandler(({ url }) => {
        const domain = require('./utils/urlHelper').getHostname(url);
        
        // 检查是否是特定的外部链接，直接用系统浏览器打开
        const externalDomains = ['https://github.com/sdutacm/oj-competition-side-client'];
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
        if (win && !win.isDestroyed()) {
          showBlockedDialogWithDebounce(win, domain, '该域名不在允许访问范围', 'default');
        }
        return { action: 'deny' };
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
    } else if (platform === 'win32') {
      // Windows 专用：使用 favicon.ico 确保任务栏图标正确显示
      iconPath = path.join(__dirname, 'public/favicon.ico');
      
      // 验证图标文件是否存在
      if (!fs.existsSync(iconPath)) {
        console.warn('⚠️  Windows图标文件不存在:', iconPath);
        // 备用图标
        iconPath = path.join(__dirname, 'public/icon.png');
      } else {
        console.log('✅ Windows使用favicon.ico图标:', iconPath);
      }
    } else {
      // 其他平台使用 .png 文件
      iconPath = path.join(__dirname, 'public/icon.png');
    }

    // 根据系统主题设置背景色，完全匹配系统颜色避免白屏
    const backgroundColor = nativeTheme.shouldUseDarkColors ? '#000000' : '#ffffff';

    // Windows专用：使用nativeImage正确设置图标，确保任务栏图标显示
    let windowIcon = null;
    if (platform === 'win32' && fs.existsSync(iconPath)) {
      try {
        // 为Windows创建原生图标对象
        windowIcon = nativeImage.createFromPath(iconPath);
        if (!windowIcon.isEmpty()) {
          console.log('✅ Windows图标创建成功，尺寸:', windowIcon.getSize());
          
          // 设置应用程序图标（这是关键！）
          app.setAppUserModelId('org.sdutacm.SDUTOJCompetitionSideClient');
          
          // 如果可能的话，设置应用级别的图标
          if (typeof app.setIcon === 'function') {
            app.setIcon(windowIcon);
          }
        } else {
          console.warn('⚠️  Windows图标创建失败，图标为空');
          windowIcon = iconPath; // 回退到路径
        }
      } catch (error) {
        console.warn('⚠️  Windows图标处理错误:', error.message);
        windowIcon = iconPath; // 回退到路径
      }
    } else {
      windowIcon = iconPath; // 非Windows或文件不存在时使用路径
    }

    // 创建主窗口
    const windowOptions = {
      width: 1440,
      height: 900,
      icon: windowIcon, // 使用处理后的图标
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
          // Windows x64 精简优化策略
          '--disable-features=ScrollBounce,OverscrollHistoryNavigation',
          
          // 核心 GPU 优化
          '--enable-gpu-rasterization',
          '--enable-oop-rasterization',
          '--enable-zero-copy',
          
          // 动画性能核心参数
          '--enable-accelerated-2d-canvas',
          '--enable-threaded-compositing',
          '--disable-frame-rate-limit',
          '--max-gum-fps=120',
          '--enable-webgl',
          '--enable-webgl2',
          
          // 进程优化
          '--disable-background-timer-throttling',
          '--disable-renderer-backgrounding',
          
          // 内存优化 - 主窗口稳定配置
          '--memory-pressure-off',
          '--max-old-space-size=4096', // 主窗口也降低到4GB
          '--no-sandbox'
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

    // Windows专用：任务栏图标强化设置
    if (process.platform === 'win32' && windowIcon && typeof windowIcon !== 'string') {
      try {
        // 强制设置窗口图标（确保任务栏图标正确）
        mainWindow.setIcon(windowIcon);
        
        // 设置应用程序表示的任务栏按钮图标
        if (mainWindow.setThumbnailClip) {
          // 可选：设置任务栏缩略图
        }
        
        console.log('✅ Windows窗口图标设置完成');
      } catch (error) {
        console.warn('⚠️  Windows窗口图标设置失败:', error.message);
      }
    }

    // 设置窗口的性能优化
    if (mainWindow.webContents) {
      // Windows 流畅滚动优化（主窗口，保持防回退功能）
      if (process.platform === 'win32') {
        console.log('应用Windows流畅滚动优化（保持防回退）...');
        
        // Windows x64 专业级性能优化 CSS
        mainWindow.webContents.on('dom-ready', () => {
          // 1. 注入CSS优化和JavaScript滚轮事件处理
          mainWindow.webContents.insertCSS(`
            /* Windows x64 核心性能优化 - 彻底修复滚轮回退 */
            html {
              scroll-behavior: auto !important;
              overscroll-behavior: none !important;
              contain: layout;
              overflow-anchor: none !important; /* 关键：禁用滚动锚定避免回退 */
              scroll-snap-type: none !important; /* 禁用滚动捕捉 */
            }
            
            body {
              scroll-behavior: auto !important;
              overscroll-behavior: none !important;
              transform: translateZ(0);
              contain: layout;
              overflow-anchor: none !important; /* 关键：禁用滚动锚定 */
              scroll-snap-type: none !important;
            }
            
            /* 全局彻底禁用滚动锚定和回退 */
            *, *::before, *::after {
              overscroll-behavior: none !important;
              overflow-anchor: none !important; /* 关键修复 */
              scroll-snap-type: none !important;
              scroll-snap-align: none !important;
              text-rendering: optimizeSpeed;
              will-change: auto;
            }
            
            /* 强制禁用所有可能导致回退的CSS属性 */
            html, body, div, section, article, main, header, footer, nav, aside {
              overflow-anchor: none !important;
              scroll-snap-type: none !important;
              scroll-snap-align: none !important;
              overscroll-behavior: none !important;
            }
            
            /* 动画优化 - 降低GPU负担 */
            .loading, .spinner, [class*="loading"], [class*="spinner"], 
            .fade, [class*="fade"], .animate, [class*="animate"] {
              transform: translateZ(0);
              will-change: transform; /* 只优化关键动画 */
              animation-timing-function: ease-out;
              animation-fill-mode: both; /* 保持动画状态 */
              backface-visibility: hidden;
              overflow-anchor: none !important;
            }
            
            /* 滚动容器优化 - 彻底防止回退 */
            .scroll, .scroll-container, [class*="scroll"], [style*="overflow"],
            div[style*="overflow"], section[style*="overflow"] {
              transform: translateZ(0);
              overflow-anchor: none !important; /* 关键：防止滚动回退 */
              contain: layout;
              scroll-snap-type: none !important; /* 禁用滚动捕捉 */
              scroll-snap-align: none !important;
              overscroll-behavior: none !important;
            }
            
            /* 图片优化 - 减少内存占用 */
            img, video, canvas {
              max-width: 100%;
              height: auto;
              transform: translateZ(0);
              image-rendering: -webkit-optimize-contrast;
              object-fit: contain;
              overflow-anchor: none !important;
            }
            
            /* 高性能滚动条 */
            ::-webkit-scrollbar {
              width: 12px;
              background: transparent;
            }
            
            ::-webkit-scrollbar-thumb {
              background: rgba(0,0,0,0.2);
              border-radius: 6px;
            }
            
            /* 减少非必要动画，专注核心动画 */
            *:not(.loading):not(.spinner):not([class*="loading"]):not(.fade):not([class*="animate"]) {
              animation: none !important;
              transition: none !important;
              will-change: auto !important;
              overflow-anchor: none !important;
            }
          `);
          
          // 2. 注入JavaScript滚轮事件拦截，彻底解决回退问题
          mainWindow.webContents.executeJavaScript(`
            (function() {
              console.log('注入滚轮回退修复脚本...');
              
              // 彻底禁用滚动锚定和回退相关功能
              function disableScrollAnchoring() {
                // 为所有现有元素禁用滚动锚定
                const allElements = document.querySelectorAll('*');
                allElements.forEach(el => {
                  if (el.style) {
                    el.style.overflowAnchor = 'none';
                    el.style.scrollSnapType = 'none';
                    el.style.scrollSnapAlign = 'none';
                    el.style.overscrollBehavior = 'none';
                  }
                });
                
                // 为根元素特别设置
                if (document.documentElement) {
                  document.documentElement.style.overflowAnchor = 'none';
                  document.documentElement.style.scrollSnapType = 'none';
                  document.documentElement.style.overscrollBehavior = 'none';
                }
                
                if (document.body) {
                  document.body.style.overflowAnchor = 'none';
                  document.body.style.scrollSnapType = 'none';
                  document.body.style.overscrollBehavior = 'none';
                }
              }
              
              // 立即执行一次
              disableScrollAnchoring();
              
              // DOM变化时重新执行
              const observer = new MutationObserver(() => {
                disableScrollAnchoring();
              });
              
              observer.observe(document, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style', 'class']
              });
              
              // 拦截可能导致回退的事件
              ['wheel', 'mousewheel', 'DOMMouseScroll'].forEach(eventType => {
                document.addEventListener(eventType, (e) => {
                  // 允许正常滚动，但防止回退
                  if (e.deltaY < 0) {
                    // 向上滚动时检查是否到顶部
                    if (window.pageYOffset <= 0) {
                      e.preventDefault();
                      e.stopPropagation();
                      return false;
                    }
                  }
                }, { passive: false, capture: true });
              });
              
              // 防止滚动回退的额外保护
              let lastScrollTop = 0;
              window.addEventListener('scroll', () => {
                const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
                if (currentScrollTop < 0) {
                  window.scrollTo(0, 0);
                }
                lastScrollTop = Math.max(0, currentScrollTop);
              }, { passive: true });
              
              console.log('滚轮回退修复脚本注入完成');
            })();
          `).catch(err => {
            console.log('JavaScript注入失败:', err);
          });
          
          console.log('Windows 专业级滚动优化 CSS 已应用');
        });
            
        console.log('Windows 专业级滚动优化 CSS 已应用');
        
        console.log('Windows专业滚动优化配置已应用');
      }
      
      // 设置缓存模式
      mainWindow.webContents.session.setUserAgent(
        mainWindow.webContents.getUserAgent() + ` SDUTOJCompetitionSideClient/${getAppVersion()}`
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
            
            // 额外确保图标关联正确
            if (mainWindow && !mainWindow.isDestroyed()) {
              // 重新设置窗口图标确保任务栏显示正确
              mainWindow.setIcon(iconPath);
              // 设置窗口的应用程序 ID
              if (mainWindow.setAppDetails) {
                mainWindow.setAppDetails({
                  appId: 'org.sdutacm.SDUTOJCompetitionSideClient',
                  appIconPath: iconPath,
                  appIconIndex: 0,
                  relaunchCommand: process.execPath,
                  relaunchDisplayName: 'SDUT OJ 竞赛客户端'
                });
                console.log('Windows 主窗口应用详情设置完成');
              }
            }
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
    const customUserAgent = `${defaultUserAgent} SDUTOJCompetitionSideClient/${getAppVersion()}`;
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
      const newBackgroundColor = nativeTheme.shouldUseDarkColors ? '#000000' : '#ffffff';
      if (mainWindow) {
        mainWindow.setBackgroundColor(newBackgroundColor);
      }
    });

    // Chrome 浏览器仿真：使用dom-ready显示主窗口，避免白屏
    mainWindow.webContents.once('dom-ready', () => {
      console.log('DOM准备完成，显示主窗口（Chrome仿真模式）');
      mainWindow.show();
      
      // Windows平台优化
      if (process.platform === 'win32') {
        setTimeout(() => {
          mainWindow.focus();
          console.log('Windows主窗口已聚焦');
        }, 100);
      }
    });
    
    // 备用显示机制，防止dom-ready未触发
    setTimeout(() => {
      if (mainWindow && !mainWindow.isVisible()) {
        console.log('备用显示机制激活');
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
  
  // Windows专用：内存管理优化
  if (process.platform === 'win32') {
    // 更频繁的垃圾回收 - 减少内存积累
    setInterval(() => {
      if (global.gc) {
        global.gc();
      }
    }, 8000); // 改为每8秒，更频繁清理内存
    
    // 进程优先级优化
    try {
      // 设置进程优先级为高（提升滚动响应性）
      process.setULimits = process.setULimits || function() {};
      
      // 设置 V8 堆优化
      if (global.gc) {
        console.log('启用手动垃圾回收控制');
      }
      
      console.log('Windows 进程优化已应用');
    } catch (error) {
      console.log('进程优化跳过:', error.message);
    }
  }
  
  // Windows专用：极简高效策略（专业级滚动优化）
  if (process.platform === 'win32') {
    console.log('应用Windows x64专业级性能优化策略...');
    
    // 核心滚动优化 - 彻底修复回退问题
    app.commandLine.appendSwitch('disable-features', 'ScrollBounce,OverscrollHistoryNavigation,VizInteractionFeedback,Translate,ScrollAnchoring,BackForwardCache,OverscrollHistoryNavigation,ScrollTimeline,ScrollUnification,PercentBasedScrolling');
    app.commandLine.appendSwitch('enable-features', 'UseSkiaRenderer,CanvasOopRasterization');
    
    // Windows x64 专用 GPU 优化
    app.commandLine.appendSwitch('enable-gpu-rasterization');
    app.commandLine.appendSwitch('enable-oop-rasterization');
    app.commandLine.appendSwitch('enable-zero-copy');
    
    // 关键：彻底修复滚轮回退
    app.commandLine.appendSwitch('disable-smooth-scrolling'); // 禁用平滑滚动避免回退
    app.commandLine.appendSwitch('disable-scroll-anchoring'); // 关键：彻底禁用滚动锚定
    app.commandLine.appendSwitch('disable-back-forward-cache'); // 禁用前进后退缓存
    app.commandLine.appendSwitch('disable-background-timer-throttling');
    app.commandLine.appendSwitch('disable-renderer-backgrounding');
    
    // 动画性能优化 - 专注动画流畅度
    app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
    app.commandLine.appendSwitch('enable-threaded-compositing');
    app.commandLine.appendSwitch('enable-impl-side-painting');
    app.commandLine.appendSwitch('enable-gpu-compositing');
    
    // Windows x64 专用帧率优化 - 降低帧率上限减少掉帧
    app.commandLine.appendSwitch('disable-frame-rate-limit');
    app.commandLine.appendSwitch('max-gum-fps', '60'); // 降低到60fps，更稳定
    app.commandLine.appendSwitch('enable-begin-frame-scheduling');
    app.commandLine.appendSwitch('disable-partial-raster'); // 禁用部分栅格化
    
    // WebGL 基础优化
    app.commandLine.appendSwitch('enable-webgl');
    app.commandLine.appendSwitch('enable-webgl2');
    
    // Windows x64 内存和进程优化 - 降低内存压力
    app.commandLine.appendSwitch('memory-pressure-off');
    app.commandLine.appendSwitch('max-old-space-size', '4096'); // 降低到4GB，减少内存压力
    app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096 --gc-interval=100 --optimize-for-size=false --gc-global'); // 更频繁GC
    
    // Windows x64 显示优化
    app.commandLine.appendSwitch('high-dpi-support', '1');
    app.commandLine.appendSwitch('disable-software-rasterizer');
    
    // 减少后台处理，专注前台性能
    app.commandLine.appendSwitch('disable-background-tab-freezing');
    app.commandLine.appendSwitch('renderer-process-limit', '5'); // 降低渲染进程限制
    
    console.log('Windows x64专业级性能优化配置完成');
  }

  // Linux平台图标设置
  if (process.platform === 'linux') {
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
  startupManager = new StartupManager();
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
      
      // 添加外部链接处理 - 遵循白名单逻辑
      contentView.webContents.on('new-window', (event, url) => {
        event.preventDefault();
        const domain = require('./utils/urlHelper').getHostname(url);
        
        // 检查是否是特定的外部链接，用外部浏览器打开
        const externalDomains = ['https://github.com/sdutacm/oj-competition-side-client'];
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
        
        // 检查是否是外部链接（如GitHub、文档等），直接用外部浏览器打开
        // 注意：oj.sdutacm.cn 不在此列表中，它将按照黑名单逻辑处理
        const externalDomains = ['https://github.com/sdutacm/oj-competition-side-client'];
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
        // 主域名和白名单允许跳转
      });
      
      // 主窗口 setWindowOpenHandler 拦截
      contentView.webContents.setWindowOpenHandler(({ url }) => {
        const domain = require('./utils/urlHelper').getHostname(url);
        
        // 检查是否是特定的外部链接，直接用系统浏览器打开
        const externalDomains = ['https://github.com/sdutacm/oj-competition-side-client'];
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
