const { BrowserView } = require('electron');
const { getHostname } = require('./urlHelper');
const { showBlockedDialog } = require('./dialogHelper');
const { checkDomainAllowed, interceptDomain } = require('./domainHelper');

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
        devTools: false,
      }
    });
    targetWindow.addBrowserView(contentView);
    
    // 设置自定义 User-Agent
    const webContents = contentView.webContents;
    const defaultUserAgent = webContents.getUserAgent();
    const customUserAgent = `${defaultUserAgent} SDUTOJCompetitionSideClient/1.0.0`;
    webContents.setUserAgent(customUserAgent);
    
    // 只允许加载白名单主域名
    const hostname = getHostname(url);
    if (!checkDomainAllowed(hostname, this.config, targetWindow === this.mainWindow).allowed) {
      showBlockedDialog(targetWindow, hostname, checkDomainAllowed(hostname, this.config, targetWindow === this.mainWindow).reason);
      contentView.webContents.loadURL(this.config.HOME_URL);
    } else {
      contentView.webContents.loadURL(url);
    }
    
    // 禁用内容视图的开发者工具相关功能
    this.disableDevToolsForContentView();
    
    // 设置内容视图的导航监听
    this.setupNavigation(contentView, targetWindow);
    // 记录子窗口视图
    if (targetWindow !== this.mainWindow) {
      this.childViews.push(contentView);
    } else {
      this.contentView = contentView;
    }
    
    // 临时调试：内容区 BrowserView 覆盖整个窗口，排查鼠标事件问题
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

    return contentView;
  }

  /**
   * 禁用内容视图的开发者工具
   */
  disableDevToolsForContentView(contentView = this.contentView) {
    const webContents = contentView?.webContents;
    if (webContents) {
      webContents.removeAllListeners('before-input-event');
      // 只保留禁用开发者工具快捷键
      webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F12') event.preventDefault();
        if (input.control && input.shift && input.key === 'I') event.preventDefault();
        if (input.meta && input.alt && input.key === 'I') event.preventDefault();
        if (input.control && input.shift && input.key === 'J') event.preventDefault();
        if (input.meta && input.alt && input.key === 'J') event.preventDefault();
        if (input.control && input.key === 'U') event.preventDefault();
        if (input.meta && input.key === 'U') event.preventDefault();
      });
      // 如需自定义右键菜单可在此添加，否则不做任何 context-menu 监听
    }
  }

  /**
   * 设置导航监听（支持主窗口和新窗口）
   */
  setupNavigation(contentView, targetWindow) {
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
      // 定期更新导航状态，确保在 macOS 上正确检测
      const navigationUpdateInterval = setInterval(() => {
        this.updateNavigationState();
      }, 1000);

      // 保存定时器引用以便清理
      this.navigationUpdateInterval = navigationUpdateInterval;
    }

    webContents.on('will-navigate', (event, targetUrl) => {
      const currentDomain = getHostname(webContents.getURL());
      const targetDomain = getHostname(targetUrl);
      const allow = interceptDomain(targetWindow, targetUrl, this.config, targetWindow === this.mainWindow, 'default');
      if (!allow) {
        event.preventDefault();
        return;
      }
      // 白名单域名但与当前窗口域名不同，自动新开窗口访问
      if (targetDomain && targetDomain !== currentDomain && checkDomainAllowed(targetDomain, this.config, false).allowed) {
        event.preventDefault();
        this.openNewWindow(targetUrl);
      }
    });
    webContents.on('will-redirect', (event, targetUrl) => {
      const currentDomain = getHostname(webContents.getURL());
      const targetDomain = getHostname(targetUrl);
      const allow = interceptDomain(targetWindow, targetUrl, this.config, targetWindow === this.mainWindow, 'redirect');
      if (!allow) {
        event.preventDefault();
        return;
      }
      if (targetDomain && targetDomain !== currentDomain && checkDomainAllowed(targetDomain, this.config, false).allowed) {
        event.preventDefault();
        this.openNewWindow(targetUrl);
      }
    });
    contentView.webContents.setWindowOpenHandler(({ url }) => {
      if (!interceptDomain(targetWindow, url, this.config, targetWindow === this.mainWindow)) {
        return { action: 'deny' };
      }
      this.openNewWindow(url);
      return { action: 'deny' };
    });
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
