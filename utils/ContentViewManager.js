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
        devTools: false, // 禁用开发者工具
      }
    });
    
    this.mainWindow.addBrowserView(this.contentView);
    
    // 设置自定义 User-Agent
    const webContents = this.contentView.webContents;
    const defaultUserAgent = webContents.getUserAgent();
    const customUserAgent = `${defaultUserAgent} SDUTOJCompetitionSideClient/1.0.0`;
    webContents.setUserAgent(customUserAgent);
    
    this.contentView.webContents.loadURL(this.config.HOME_URL);
    
    // 禁用内容视图的开发者工具相关功能
    this.disableDevToolsForContentView();
    
    // 设置内容视图的导航监听
    this.setupNavigation();

    return this.contentView;
  }

  /**
   * 禁用内容视图的开发者工具
   */
  disableDevToolsForContentView() {
    const webContents = this.contentView?.webContents;
    if (webContents) {
      // 禁用右键菜单
      webContents.on('context-menu', (event) => {
        event.preventDefault();
      });

      // 禁用开发者工具快捷键
      webContents.on('before-input-event', (event, input) => {
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
      });
    }
  }

  /**
   * 设置导航监听
   */
  setupNavigation() {
    const webContents = this.contentView?.webContents;
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

    webContents.setWindowOpenHandler(({ url }) => {
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
        console.log('导航状态检查失败（已忽略）:', error.message);
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
