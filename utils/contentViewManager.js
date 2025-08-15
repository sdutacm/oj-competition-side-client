const { BrowserView, nativeTheme } = require('electron');
const { getHostname } = require('./urlHelper');
const { showBlockedDialog } = require('./dialogHelper');
const { checkDomainAllowed } = require('./domainHelper');
const { getCustomUserAgent } = require('./uaHelper');

class ContentViewManager {
  /**
   * 绑定内容视图 title 到主窗口
   */
  bindTitleSync(contentView, targetWindow) {
    if (!contentView || !contentView.webContents || !targetWindow) return;
    contentView.webContents.on('page-title-updated', (event, title) => {
      event.preventDefault();
      try {
        targetWindow.setTitle(title);
        console.log('主窗口 title 同步为:', title);
      } catch {}
    });
    // 首次加载后主动同步一次
    contentView.webContents.on('did-finish-load', () => {
      try {
        const title = contentView.webContents.getTitle();
        if (title) targetWindow.setTitle(title);
      } catch {}
    });
  }
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

                /* 保留主题相关的CSS变量 */
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
   * Windows系统提前检测系统主题背景色（与main.js保持一致）
   */
  getWindowsBackgroundColor() {
    // Windows系统特殊处理，背景色与网页首屏保持一致，彻底消除闪烁
    if (process.platform === 'win32') {
      return '#f5f5f5'; // 与网页首屏背景色一致
    }
    // 其他系统使用原有逻辑
    const { nativeTheme } = require('electron');
    return nativeTheme.shouldUseDarkColors ? '#2d2d2d' : '#f5f5f5';
  }

  /**
   * 创建内容视图（支持主窗口和新窗口）
   * @param {BrowserWindow} targetWindow
   * @param {string} url
   * @param {boolean} allowToolbarOverlap 是否允许内容区覆盖工具栏，默认 false
   */
  createContentView(targetWindow = this.mainWindow, url = this.config.HOME_URL, allowToolbarOverlap = false) {
    // 使用统一的背景色检测函数
    const backgroundColor = this.getWindowsBackgroundColor();
    console.log('创建BrowserView使用背景色:', backgroundColor);
    
    const contentView = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        backgroundColor: backgroundColor, // 保留背景色避免白屏
        spellcheck: false,
        webgl: false,
        enableWebSQL: false,
        // Windows系统额外的GPU禁用设置以防止进程崩溃
        ...(process.platform === 'win32' ? {
          hardwareAcceleration: false,
          offscreen: false
        } : {})
      }
    });
    targetWindow.addBrowserView(contentView);
    console.log('BrowserView已添加到窗口');

    // 绑定 title 同步
    this.bindTitleSync(contentView, targetWindow);

    // 恢复导航事件绑定逻辑，主窗口和新窗口都绑定
    if (targetWindow !== this.mainWindow) {
      this.setupNavigation(contentView, targetWindow);
    } else {
      this.setupNavigation(contentView, targetWindow, true); // 主窗口只绑定导航状态
    }
    // Windows系统特殊处理：立即设置BrowserView背景色并强制刷新
    if (process.platform === 'win32') {
      try {
        contentView.setBackgroundColor(backgroundColor);
        // Windows特殊处理：设置额外的显示属性
        if (contentView.webContents) {
          contentView.webContents.setBackgroundThrottling(false);
        }
        console.log('Windows系统：BrowserView背景色和显示属性设置完成');
      } catch (error) {
        console.log('Windows系统：BrowserView背景色设置失败:', error);
      }
    }

  // 只声明一次 webContents
  const webContents = contentView.webContents;
  // 设置自定义 User-Agent
  const defaultUserAgent = webContents.getUserAgent();
  const customUserAgent = getCustomUserAgent(defaultUserAgent);
  webContents.setUserAgent(customUserAgent);

    // 移除性能配置，使用默认行为
    
    // 只允许加载白名单主域名
    const hostname = getHostname(url);
    
    // 验证域名是否允许加载
    if (!checkDomainAllowed(hostname, this.config, targetWindow === this.mainWindow).allowed) {
      console.log('[拦截] 首次加载，弹窗提示', hostname);
      showBlockedDialog(targetWindow, hostname, checkDomainAllowed(hostname, this.config, targetWindow === this.mainWindow).reason, 'default');
      return contentView; // 返回空的contentView，不加载非法域名
    }

    // 直接加载真实页面，不做额外的全局背景色注入
    try {
      contentView.webContents.loadURL(url);
      console.log('直接加载真实页面:', url);
      // 页面加载完成后每次都注入性能优化CSS，保证刷新/新建窗口/导航都生效
      contentView.webContents.on('did-finish-load', () => {
        this.injectPerfCSS(contentView);
        console.log('页面加载完成并注入CSS');
      });
      // 主窗口内容视图的 dom-ready 也注入一次，增强注入时机
      if (targetWindow === this.mainWindow) {
        contentView.webContents.on('dom-ready', () => {
          this.injectPerfCSS(contentView);
          console.log('主窗口 dom-ready 注入CSS');
        });
      }
      // Windows特殊处理：监听第一次DOM准备就绪，确保有初始内容
      if (process.platform === 'win32' && targetWindow === this.mainWindow) {
        contentView.webContents.once('dom-ready', () => {
          console.log('Windows系统：DOM准备就绪，页面有基础内容');
        });
      }
    } catch (e) {
      console.warn('加载页面失败:', e.message);
    }

    // 禁用内容视图的开发者工具相关功能和快捷键，仅拦截开发者工具快捷键
    this.disableDevToolsForContentView(contentView);

  // 主窗口和新窗口都绑定跳转/拦截事件，全部用 blockmap 逻辑
  const config = this.config;
    // will-navigate：主窗口主域名内跳转不拦截，白名单新开窗口，非白名单拦截
    webContents.on('will-navigate', (event, url) => {
      const domain = getHostname(url);
      const isMainDomain = (domain === config.MAIN_DOMAIN || domain.endsWith('.' + config.MAIN_DOMAIN));
      const isWhite = config && config.POPUP_WHITELIST && require('./domainHelper').isWhiteDomain(url, config);
      if (targetWindow === this.mainWindow) {
        if (isWhite && !isMainDomain) {
          event.preventDefault();
          this.openNewWindow(url);
        } else if (!isMainDomain) {
          event.preventDefault();
          showBlockedDialog(targetWindow, domain, '该域名不在允许访问范围', 'default');
        }
        // 主域名内跳转不拦截，历史栈正常维护
      } else {
        // 新窗口逻辑保持原样
        if (isWhite) {
          event.preventDefault();
          this.openNewWindow(url);
        } else {
          event.preventDefault();
          showBlockedDialog(targetWindow, domain, '该域名不在允许访问范围', 'default');
        }
      }
    });
    // will-redirect
    webContents.on('will-redirect', (event, url) => {
      const domain = getHostname(url);
      if (targetWindow === this.mainWindow) {
        // 只要重定向后依然在主域名或白名单内就允许
        const isMainDomain = (domain === config.MAIN_DOMAIN || domain.endsWith('.' + config.MAIN_DOMAIN));
        const isWhite = config && config.POPUP_WHITELIST && require('./domainHelper').isWhiteDomain(url, config);
        if (isMainDomain || isWhite) {
          // 允许重定向，不拦截
          return;
        } else {
          event.preventDefault();
          showBlockedDialog(targetWindow, domain, '非法重定向拦截，已阻止跳转', 'redirect');
        }
      } else {
        // 新窗口跳出白名单只弹窗不阻塞
        if (config && config.POPUP_WHITELIST && !require('./domainHelper').isWhiteDomain(url, config)) {
          showBlockedDialog(targetWindow, domain, '非法重定向拦截，已跳出白名单', 'redirect');
        }
      }
    });
    // setWindowOpenHandler
    webContents.setWindowOpenHandler(({ url }) => {
      const domain = getHostname(url);
      if (config && config.POPUP_WHITELIST && require('./domainHelper').isWhiteDomain(url, config)) {
        this.openNewWindow(url);
        return { action: 'deny' };
      } else {
        showBlockedDialog(targetWindow, domain, '该域名不在允许访问范围', 'default');
        return { action: 'deny' };
      }
    });
    // 记录子窗口视图
    if (targetWindow !== this.mainWindow) {
      this.childViews.push(contentView);
    } else {
      this.contentView = contentView;
    }

    // 设置内容区 BrowserView 大小（始终生效，防止不可见）
    const [width, height] = targetWindow.getContentSize();
    let y = 0;
    let h = height;
    if (!allowToolbarOverlap && targetWindow === this.mainWindow) {
      y = 48;
      h = height - 48;
    } else if (!allowToolbarOverlap && this.toolbarManager && this.toolbarManager.toolbarView) {
      y = 48;
      h = height - 48;
    }
  contentView.setBounds({ x: 0, y, width, height: h });
  // 恢复内容视图随主窗口缩放自适应
  contentView.setAutoResize({ width: true, height: true });

    // 新建内容视图自动获得焦点，确保快捷键生效
    // 关键：弹窗/子窗口必须获得系统焦点，否则 before-input-event 不会触发
    // 但主窗口在main.js中已经显示，这里只处理新窗口
  // if (targetWindow && targetWindow !== this.mainWindow) {
  //   try {
  //     targetWindow.show();
  //     targetWindow.focus();
  //   } catch { }
  // }
  // if (contentView.webContents && contentView.webContents.focus) {
  //   setTimeout(() => {
  //     try { contentView.webContents.focus(); } catch { }
  //   }, 0);
  // }

    // 所有窗口都彻底隐藏菜单栏，避免 accelerator 干扰
  // try {
  //   targetWindow.setMenuBarVisibility(false);
  //   targetWindow.setMenu(null);
  // } catch { }

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
      console.log('页面开始加载...');
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
              spellcheck: false,
              webgl: false,
              enableWebSQL: false,
              // Windows系统额外的GPU禁用设置以防止进程崩溃
              ...(process.platform === 'win32' ? {
                hardwareAcceleration: false,
                offscreen: false
              } : {})
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
              spellcheck: false,
              webgl: false,
              enableWebSQL: false,
              // Windows系统额外的GPU禁用设置以防止进程崩溃
              ...(process.platform === 'win32' ? {
                hardwareAcceleration: false,
                offscreen: false
              } : {})
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
      console.log('内容视图bounds设置:', bounds);
    } else {
      console.warn('setBounds调用时contentView不存在');
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