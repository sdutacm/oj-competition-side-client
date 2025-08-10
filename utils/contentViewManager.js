const { BrowserView, nativeTheme } = require('electron');
const { getHostname } = require('./urlHelper');
const { showBlockedDialog } = require('./dialogHelper');
const { checkDomainAllowed } = require('./domainHelper');
const { getCustomUserAgent } = require('./uaHelper');

class ContentViewManager {
  constructor(mainWindow, config, openNewWindow) {
    this.mainWindow = mainWindow;
    this.contentView = null;
    this.config = config;
    this.toolbarManager = null;
    // 记录所有新开的 BrowserView
    this.childViews = [];
    this.openNewWindow = openNewWindow; // 注入新窗口函数
  }

  /**
 * 注入自定义优化CSS，支持首次创建和页面刷新后注入
 * @param {BrowserView} contentView
 */
  injectPerfCSS(contentView) {
    if (!contentView || !contentView.webContents) return;
    contentView.webContents.insertCSS(`
                /* 优化滚动性能，但保留网页原有的动画和过渡效果 */
                * {
                  -webkit-overflow-scrolling: auto !important;
                  overflow-scrolling: auto !important;
                  scroll-snap-type: none !important;
                  scroll-padding: 0 !important;
                  scroll-margin: 0 !important;
                }

                body.dark {
                  --nav-bg-color: #1f1f1f;
                }

                body:not(.dark) {
                  --nav-bg-color: #fff;
                }

                body.auto {
                  --nav-bg-color: #fff;
                    
                  @media (prefers-color-scheme: dark) {
                    --nav-bg-color: #1f1f1f !important;
                  }
                }

                .ant-layout-header::before {
                  content: "";
                  position: absolute;
                  inset: 0;
                  background-color: var(--nav-bg-color);
                  z-index: -1;
                }

                .ant-layout-header[style*="position:fixed"], 
                .ant-layout-header[style*="position: fixed"] {
                  position: fixed !important;
                }

                /* 只禁用可能严重影响性能的 filter 和 backdrop-filter，保留其他动画能力 */
                * {
                  backdrop-filter: none !important;
                  -webkit-backdrop-filter: none !important;
                }
              `);
  }

  /**
   * 设置工具栏管理器
   */
  setToolbarManager(toolbarManager) {
    this.toolbarManager = toolbarManager;
  }

  /**
   * 创建内容视图（支持主窗口和新窗口）
   * @param {BrowserWindow} targetWindow
   * @param {string} url
   * @param {boolean} allowToolbarOverlap 是否允许内容区覆盖工具栏，默认 false
   */
  createContentView(targetWindow = this.mainWindow, url = this.config.HOME_URL, allowToolbarOverlap = false) {
    const contentView = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        nativeWindowOpen: true,
        // devTools: false, // 不禁用开发者工具，确保系统命令可用
      }
    });
    targetWindow.addBrowserView(contentView);

    // 设置自定义 User-Agent
    const webContents = contentView.webContents;
    const defaultUserAgent = webContents.getUserAgent();
    const customUserAgent = getCustomUserAgent(defaultUserAgent);
    webContents.setUserAgent(customUserAgent);

    // 只允许加载白名单主域名
    const hostname = getHostname(url);
    // 先加载一个与主题匹配的本地占位页，避免远程页面首次绘制前的白屏闪烁
    const isDark = nativeTheme.shouldUseDarkColors;
    const placeholderBG = isDark ? '#1f1f1f' : '#ffffff';
    const placeholderFG = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';
    const placeholderHTML = encodeURIComponent(`<!DOCTYPE html><html><head><meta charset='utf-8'><style>html,body{margin:0;padding:0;height:100%;width:100%;background:${placeholderBG};color:${placeholderFG};font:14px -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;display:flex;align-items:center;justify-content:center;-webkit-font-smoothing:antialiased;}</style></head><body><div style="letter-spacing:.5px;">正在加载…</div></body></html>`);
    contentView.webContents.loadURL(`data:text/html;charset=utf-8,${placeholderHTML}`);

    // 验证域名后很快切入真实页面（下一事件循环），占位几乎无感但可避免白闪
    setTimeout(() => {
      try {
        if (!checkDomainAllowed(hostname, this.config, targetWindow === this.mainWindow).allowed) {
          console.log('[拦截] 首次加载，弹窗提示', hostname);
          showBlockedDialog(targetWindow, hostname, checkDomainAllowed(hostname, this.config, targetWindow === this.mainWindow).reason, 'default');
          return; // 不加载非法域名
        }
        if (contentView && contentView.webContents && !contentView.webContents.isDestroyed()) {
          contentView.webContents.loadURL(url);
        }
      } catch (e) {
        console.warn('占位后加载真实页面失败:', e.message);
      }
    }, 5);

    // 注入CSS - 页面首次加载时注入
    this.injectPerfCSS(contentView);

    // 页面每次完成加载时都注入CSS，防止刷新时丢失
    contentView.webContents.on('did-finish-load', () => {
      this.injectPerfCSS(contentView);
    });

    // 禁用内容视图的开发者工具相关功能和快捷键，仅拦截开发者工具快捷键
    this.disableDevToolsForContentView(contentView);

    // 仅新窗口绑定跳转拦截，主窗口只绑定导航状态
    if (targetWindow !== this.mainWindow) {
      this.setupNavigation(contentView, targetWindow);
    } else {
      this.setupNavigation(contentView, targetWindow, true); // 主窗口只绑定导航状态
    }
    // 记录子窗口视图
    if (targetWindow !== this.mainWindow) {
      this.childViews.push(contentView);
    } else {
      this.contentView = contentView;
    }

    // 设置内容区 BrowserView 大小
    const [width, height] = targetWindow.getContentSize();
    let y = 0;
    let h = height;
    if (!allowToolbarOverlap && this.toolbarManager && this.toolbarManager.toolbarView) {
      // 工具栏高度 48px
      y = 48;
      h = height - 48;
    }
    contentView.setBounds({ x: 0, y, width, height: h });
    contentView.setAutoResize({ width: true, height: true });

    // 新建内容视图自动获得焦点，确保快捷键生效
    // 关键：弹窗/子窗口必须获得系统焦点，否则 before-input-event 不会触发
    if (targetWindow) {
      try {
        targetWindow.show();
        targetWindow.focus();
      } catch { }
    }
    if (contentView.webContents && contentView.webContents.focus) {
      setTimeout(() => {
        try { contentView.webContents.focus(); } catch { }
      }, 0);
    }

    // 所有窗口都彻底隐藏菜单栏，避免 accelerator 干扰
    try {
      targetWindow.setMenuBarVisibility(false);
      targetWindow.setMenu(null);
    } catch { }

    return contentView;
  }

  /**
   * 禁用内容视图的开发者工具，仅拦截开发者工具快捷键，其他快捷键全部放行
   * 导航/刷新/主页/info 等快捷键只在当前聚焦 BrowserView 生效
   */
  disableDevToolsForContentView(contentView = this.contentView) {
    const webContents = contentView?.webContents;
    if (webContents) {
      webContents.removeAllListeners('before-input-event');

      // 性能优化：缓存DOM检查结果
      let lastInputCheckTime = 0;
      let lastInputCheckResult = false;
      const INPUT_CHECK_CACHE_TIME = 100; // 缓存100ms

      webContents.on('before-input-event', (event, input) => {
        // 拦截开发者工具快捷键
        if (
          input.key === 'F12' ||
          (input.control && input.shift && input.key === 'I') ||
          (input.meta && input.alt && input.key === 'I') ||
          (input.control && input.shift && input.key === 'J') ||
          (input.meta && input.alt && input.key === 'J') ||
          (input.control && input.key === 'U') ||
          (input.meta && input.key === 'U')
        ) {
          event.preventDefault();
          return;
        }
        // Mac 下导航/刷新/主页/info 快捷键优化：减少DOM检查频率
        if (process.platform === 'darwin') {
          let win = null;
          try {
            win = webContents.hostWebContents ? webContents.hostWebContents : require('electron').remote ? require('electron').remote.getCurrentWindow() : null;
          } catch { }
          const isWinAlive = !win || (win && !win.isDestroyed());

          // 性能优化：使用缓存的DOM检查函数
          const checkIsInputFocused = () => {
            const now = Date.now();
            if (now - lastInputCheckTime < INPUT_CHECK_CACHE_TIME) {
              return Promise.resolve(lastInputCheckResult);
            }

            return webContents.executeJavaScript(`(() => {
              const el = document.activeElement;
              if (!el) return false;
              const tag = el.tagName.toLowerCase();
              if (tag === 'input' || tag === 'textarea') return true;
              if (el.isContentEditable) return true;
              return false;
            })()`, true).then(result => {
              lastInputCheckTime = now;
              lastInputCheckResult = result;
              return result;
            }).catch(() => false);
          };

          // 后退 Cmd+Left/Cmd+ArrowLeft
          if (
            input.meta && !input.shift && !input.alt && !input.control &&
            (input.key === 'Left' || input.key === 'ArrowLeft')
          ) {
            checkIsInputFocused().then(isInput => {
              if (!isInput && !webContents.isDestroyed() && isWinAlive && webContents.canGoBack()) {
                webContents.goBack();
                event.preventDefault();
              }
            });
          }
          // 前进 Cmd+Right/Cmd+ArrowRight  
          else if (
            input.meta && !input.shift && !input.alt && !input.control &&
            (input.key === 'Right' || input.key === 'ArrowRight')
          ) {
            checkIsInputFocused().then(isInput => {
              if (!isInput && !webContents.isDestroyed() && isWinAlive && webContents.canGoForward()) {
                webContents.goForward();
                event.preventDefault();
              }
            });
          }
          // 刷新 Cmd+R
          else if (input.meta && !input.shift && !input.alt && !input.control && input.key.toUpperCase() === 'R') {
            if (!webContents.isDestroyed() && isWinAlive) {
              webContents.reload();
              event.preventDefault();
            }
          }
          // 主页 Cmd+Shift+H
          else if (input.meta && input.shift && !input.alt && !input.control && input.key.toUpperCase() === 'H') {
            if (!webContents.isDestroyed() && isWinAlive) {
              // 尝试获取关联窗口的 ShortcutManager 中的 initialUrl
              let initialUrl = this.config.HOME_URL;
              try {
                // 通过 webContents 获取窗口引用
                const win = webContents.hostWebContents ?
                  require('electron').BrowserWindow.fromWebContents(webContents.hostWebContents) :
                  require('electron').BrowserWindow.getFocusedWindow();

                if (win && win._shortcutManager && win._shortcutManager.initialUrl) {
                  initialUrl = win._shortcutManager.initialUrl;
                  console.log('ContentViewManager 使用 ShortcutManager.initialUrl:', initialUrl);
                }
              } catch (e) {
                console.log('获取 initialUrl 失败:', e);
              }

              webContents.loadURL(initialUrl);
              event.preventDefault();
            }
          }
          // 系统信息 Cmd+I
          else if (input.meta && !input.shift && !input.alt && !input.control && input.key.toUpperCase() === 'I') {
            if (!webContents.isDestroyed() && isWinAlive) {
              require('./dialogHelper').showInfoDialog(this.mainWindow);
              event.preventDefault();
            }
          }
        }
      });
      // 如需自定义右键菜单可在此添加，否则不做任何 context-menu 监听
    }
  }

  /**
   * 设置导航监听（支持主窗口和新窗口）
   * @param {BrowserView} contentView
   * @param {BrowserWindow} targetWindow
   * @param {boolean} onlyNavState 仅绑定导航状态（主窗口用）
   */
  setupNavigation(contentView, targetWindow, onlyNavState = false) {
    const webContents = contentView?.webContents;
    if (!webContents) return;

    // 监听导航状态变化
    webContents.on('did-navigate', () => {
      this.updateNavigationState();
    });
    webContents.on('did-navigate-in-page', () => {
      this.updateNavigationState();
    });
    webContents.on('did-finish-load', () => {
      this.updateNavigationState();
    });
    webContents.on('did-start-loading', () => {
      this.updateNavigationState();
    });
    webContents.on('did-stop-loading', () => {
      this.updateNavigationState();
    });

    // 为 macOS 添加额外的导航状态检查
    if (process.platform === 'darwin') {
      const navigationUpdateInterval = setInterval(() => {
        this.updateNavigationState();
      }, 1000);
      this.navigationUpdateInterval = navigationUpdateInterval;
    }

    // 仅新窗口绑定 will-navigate/will-redirect/setWindowOpenHandler 拦截
    if (onlyNavState) return;

    webContents.on('will-navigate', (event, targetUrl) => {
      const targetDomain = getHostname(targetUrl);
      const currentDomain = getHostname(webContents.getURL());
      // 1. 不在白名单/主域名，直接拦截
      if (!isInWhiteList(targetDomain, this.config)) {
        event.preventDefault();
        showBlockedDialog(targetWindow, targetDomain, checkDomainAllowed(targetDomain, this.config, false).reason, 'default');
        return;
      }
      // 2. 只有最终落地页在白名单/主域名时才新开窗口，否则主窗口直接拦截弹窗，不新开窗口
      if (
        targetWindow === this.mainWindow &&
        isWhiteListButNotMainDomain(targetDomain, currentDomain, this.config) &&
        targetDomain !== currentDomain &&
        targetUrl !== webContents.getURL()
      ) {
        // 先预加载目标页面，判断最终落地页是否在白名单/主域名
        event.preventDefault();
        const { session } = webContents;
        session.resolveProxy(targetUrl).then(() => {
          // 用一个隐藏的 BrowserView 预加载目标页面
          const testView = new BrowserView({
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true,
              devTools: false,
            }
          });
          testView.webContents.once('did-finish-load', () => {
            const finalUrl = testView.webContents.getURL();
            const finalDomain = getHostname(finalUrl);
            if (isInWhiteList(finalDomain, this.config)) {
              this.openNewWindow(finalUrl, this.mainWindow.getSize ? this.mainWindow.getSize() : [1200, 800]);
            } else {
              showBlockedDialog(targetWindow, finalDomain, checkDomainAllowed(finalDomain, this.config, false).reason, 'default');
            }
            testView.webContents.destroy();
          });
          testView.webContents.once('did-fail-load', () => {
            testView.webContents.destroy();
          });
          testView.webContents.loadURL(targetUrl);
        });
        return;
      }
      // 允许跳转
    });
    webContents.on('will-redirect', (event, targetUrl) => {
      const targetDomain = getHostname(targetUrl);
      const currentDomain = getHostname(webContents.getURL());
      // 1. 不在白名单/主域名，直接拦截
      if (!isInWhiteList(targetDomain, this.config)) {
        event.preventDefault();
        showBlockedDialog(targetWindow, targetDomain, checkDomainAllowed(targetDomain, this.config, false).reason, 'redirect');
        return;
      }
      // 2. 只有最终落地页在白名单/主域名时才新开窗口，否则主窗口直接拦截弹窗，不新开窗口
      if (
        targetWindow === this.mainWindow &&
        isWhiteListButNotMainDomain(targetDomain, currentDomain, this.config) &&
        targetDomain !== currentDomain &&
        targetUrl !== webContents.getURL()
      ) {
        event.preventDefault();
        const { session } = webContents;
        session.resolveProxy(targetUrl).then(() => {
          const testView = new BrowserView({
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true,
              devTools: false,
            }
          });
          testView.webContents.once('did-finish-load', () => {
            const finalUrl = testView.webContents.getURL();
            const finalDomain = getHostname(finalUrl);
            if (isInWhiteList(finalDomain, this.config)) {
              this.openNewWindow(finalUrl, this.mainWindow.getSize ? this.mainWindow.getSize() : [1200, 800]);
            } else {
              showBlockedDialog(targetWindow, finalDomain, checkDomainAllowed(finalDomain, this.config, false).reason, 'redirect');
            }
            testView.webContents.destroy();
          });
          testView.webContents.once('did-fail-load', () => {
            testView.webContents.destroy();
          });
          testView.webContents.loadURL(targetUrl);
        });
        return;
      }
      // 允许跳转
    });
    contentView.webContents.setWindowOpenHandler(({ url }) => {
      const targetDomain = getHostname(url);
      const currentDomain = getHostname(contentView.webContents.getURL());
      // 判断是否主域名或白名单及其子域名
      const isWhite = (() => {
        if (targetDomain === this.config.MAIN_DOMAIN || targetDomain.endsWith('.' + this.config.MAIN_DOMAIN)) return true;
        if (this.config.POPUP_WHITELIST && this.config.POPUP_WHITELIST.size > 0) {
          for (const allowedDomain of this.config.POPUP_WHITELIST) {
            if (targetDomain === allowedDomain || targetDomain.endsWith('.' + allowedDomain)) return true;
          }
        }
        return false;
      })();
      // 只有目标域名和当前域名不一致且目标域名在白名单内才新开窗口
      if (isWhite && targetDomain !== currentDomain) {
        this.openNewWindow(url, this.mainWindow.getSize ? this.mainWindow.getSize() : [1200, 800]);
        return { action: 'deny' };
      }
      // 非白名单，弹窗拦截
      if (!isWhite) {
        showBlockedDialog(targetWindow, targetDomain, checkDomainAllowed(targetDomain, this.config, false).reason, 'default');
        return { action: 'deny' };
      }
      // 允许主窗口跳转
      return { action: 'allow' };
    });

    // 辅助函数：判断是否白名单但不是主域名
    function isWhiteListButNotMainDomain(targetDomain, currentDomain, config) {
      if (!config.POPUP_WHITELIST || !config.POPUP_WHITELIST.size) return false;
      // 目标域名在白名单内，且不是主域名或主域名子域名，且与当前域名不同
      if (
        (config.POPUP_WHITELIST.has(targetDomain) || [...config.POPUP_WHITELIST].some(d => targetDomain.endsWith('.' + d))) &&
        !(targetDomain === config.MAIN_DOMAIN || targetDomain.endsWith('.' + config.MAIN_DOMAIN)) &&
        targetDomain !== currentDomain
      ) {
        return true;
      }
      return false;
    }
    // 辅助函数：判断是否在主域名/主域名子域名/白名单/白名单子域名
    function isInWhiteList(domain, config) {
      // 主域名及其子域名
      if (domain === config.MAIN_DOMAIN || domain.endsWith('.' + config.MAIN_DOMAIN)) return true;
      // 白名单及其子域名
      if (config.POPUP_WHITELIST && config.POPUP_WHITELIST.size > 0) {
        if (config.POPUP_WHITELIST.has(domain)) return true;
        for (const d of config.POPUP_WHITELIST) {
          if (domain.endsWith('.' + d)) return true;
        }
      }
      return false;
    }
  }

  /**
   * 更新导航状态
   */
  updateNavigationState() {
    const webContents = this.contentView?.webContents;
    if (this.toolbarManager && webContents) {
      let canGoBack = false;
      let canGoForward = false;

      try {
        // 优先使用新的 navigationHistory API
        if (webContents.navigationHistory) {
          canGoBack = webContents.navigationHistory.canGoBack();
          canGoForward = webContents.navigationHistory.canGoForward();
        } else {
          // 回退到旧的 API
          canGoBack = webContents.canGoBack();
          canGoForward = webContents.canGoForward();
        }
      } catch (error) {
        // 在 macOS 上，可能会出现 API 访问错误，使用默认值
        canGoBack = false;
        canGoForward = false;
      }

      this.toolbarManager.updateNavigationState(canGoBack, canGoForward);
    }
  }

  /**
   * 设置内容视图位置
   */
  setBounds(bounds) {
    if (this.contentView) {
      this.contentView.setBounds(bounds);
    }
  }

  /**
   * 获取内容视图
   */
  getView() {
    return this.contentView;
  }

  /**
   * 获取 webContents
   */
  getWebContents() {
    return this.contentView?.webContents || null;
  }

  /**
   * 清理资源
   */
  destroy() {
    // 清理 macOS 的导航状态更新定时器
    if (this.navigationUpdateInterval) {
      clearInterval(this.navigationUpdateInterval);
      this.navigationUpdateInterval = null;
    }
  }
}

module.exports = ContentViewManager;
