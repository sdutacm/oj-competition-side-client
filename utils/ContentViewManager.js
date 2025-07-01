const { BrowserView } = require('electron');
const { getHostname } = require('./urlHelper');
const { showBlockedDialog } = require('./dialogHelper');

class ContentViewManager {
  constructor(mainWindow, config) {
    this.mainWindow = mainWindow;
    this.contentView = null;
    this.config = config;
    this.toolbarManager = null;
  }

  /**
   * 设置工具栏管理器
   */
  setToolbarManager(toolbarManager) {
    this.toolbarManager = toolbarManager;
  }

  /**
   * 创建内容视图
   */
  createContentView() {
    this.contentView = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      }
    });
    
    this.mainWindow.addBrowserView(this.contentView);
    this.contentView.webContents.loadURL(this.config.HOME_URL);
    
    // 设置内容视图的导航监听
    this.setupNavigation();

    return this.contentView;
  }

  /**
   * 设置导航监听
   */
  setupNavigation() {
    // 监听导航状态变化
    this.contentView.webContents.on('did-navigate', () => {
      this.updateNavigationState();
    });

    this.contentView.webContents.on('did-navigate-in-page', () => {
      this.updateNavigationState();
    });

    this.contentView.webContents.on('will-navigate', (event, targetUrl) => {
      const hostname = getHostname(targetUrl);
      if (!hostname) {
        event.preventDefault();
        return;
      }

      // 拦截禁止访问的域名
      if (this.config.BLOCKED_DOMAINS.has(hostname)) {
        event.preventDefault();
        console.log(`⛔ 拦截禁止域名：${hostname}`);
        showBlockedDialog(this.mainWindow, hostname, '该域名已被明确禁止访问');
        return;
      }

      if (hostname === this.config.MAIN_DOMAIN) {
        // 允许主域名跳转
        return;
      }

      if (this.config.POPUP_WHITELIST.has(hostname)) {
        // 弹出新窗口
        event.preventDefault();
        this.config.openNewWindow(targetUrl);
        return;
      }

      // 其余一律禁止
      event.preventDefault();
      showBlockedDialog(this.mainWindow, hostname, '该域名不在允许访问的白名单中');
    });

    this.contentView.webContents.setWindowOpenHandler(({ url }) => {
      const hostname = getHostname(url);
      if (this.config.POPUP_WHITELIST.has(hostname)) {
        this.config.openNewWindow(url);
      } else {
        showBlockedDialog(this.mainWindow, hostname, '该域名不在允许访问的白名单中');
      }
      return { action: 'deny' };
    });
  }

  /**
   * 更新导航状态
   */
  updateNavigationState() {
    if (this.toolbarManager && this.contentView) {
      const canGoBack = this.contentView.webContents.navigationHistory.canGoBack();
      const canGoForward = this.contentView.webContents.navigationHistory.canGoForward();
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
    return this.contentView ? this.contentView.webContents : null;
  }
}

module.exports = ContentViewManager;
