const { BrowserView } = require('electron');
const { getHostname } = require('./urlHelper');
const { showBlockedDialog } = require('./dialogHelper');
const { checkDomainAllowed, interceptDomain } = require('./domainHelper');
const fs = require('fs');
const path = require('path');
let clientVersion = '1.0.0';

try {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
  if (pkg && pkg.version) clientVersion = pkg.version;
} catch { }

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
    const customUserAgent = `${defaultUserAgent} SDUTOJCompetitionSideClient/${clientVersion}`;
    webContents.setUserAgent(customUserAgent);

    // 只允许加载白名单主域名
    const hostname = getHostname(url);
    if (!checkDomainAllowed(hostname, this.config, targetWindow === this.mainWindow).allowed) {
      showBlockedDialog(targetWindow, hostname, checkDomainAllowed(hostname, this.config, targetWindow === this.mainWindow).reason);
      contentView.webContents.loadURL(this.config.HOME_URL);
    } else {
      contentView.webContents.loadURL(url);
    }

    // 禁用内容视图的开发者工具相关功能和快捷键，仅拦截开发者工具快捷键
    this.disableDevToolsForContentView(contentView);

    // 设置内容视图的导航监听
    this.setupNavigation(contentView, targetWindow);
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
      } catch {}
    }
    if (contentView.webContents && contentView.webContents.focus) {
      setTimeout(() => {
        try { contentView.webContents.focus(); } catch {}
      }, 0);
    }

    // 所有窗口都彻底隐藏菜单栏，避免 accelerator 干扰
    try {
      targetWindow.setMenuBarVisibility(false);
      targetWindow.setMenu(null);
    } catch {}

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
        // Mac 下导航/刷新/主页/info 快捷键只在当前聚焦 BrowserView 生效
        if (process.platform === 'darwin' && webContents.isFocused && webContents.isFocused()) {
          // 获取宿主窗口对象
          let win = null;
          try {
            win = webContents.hostWebContents ? webContents.hostWebContents : require('electron').remote ? require('electron').remote.getCurrentWindow() : null;
          } catch {}
          const isWinAlive = !win || (win && !win.isDestroyed());
          // 后退 Cmd+Left
          if (input.meta && !input.shift && !input.alt && !input.control && input.key === 'Left') {
            if (!webContents.isDestroyed() && isWinAlive && webContents.canGoBack()) webContents.goBack();
          }
          // 前进 Cmd+Right
          else if (input.meta && !input.shift && !input.alt && !input.control && input.key === 'Right') {
            if (!webContents.isDestroyed() && isWinAlive && webContents.canGoForward()) webContents.goForward();
          }
          // 刷新 Cmd+R
          else if (input.meta && !input.shift && !input.alt && !input.control && input.key.toUpperCase() === 'R') {
            if (!webContents.isDestroyed() && isWinAlive) webContents.reload();
          }
          // 主页 Cmd+Shift+H
          else if (input.meta && input.shift && !input.alt && !input.control && input.key.toUpperCase() === 'H') {
            if (!webContents.isDestroyed() && isWinAlive) webContents.loadURL(this.config.HOME_URL);
          }
          // 系统信息 Cmd+I
          else if (input.meta && !input.shift && !input.alt && !input.control && input.key.toUpperCase() === 'I') {
            if (!webContents.isDestroyed() && isWinAlive) require('./dialogHelper').showInfoDialog(this.mainWindow);
          }
        }
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
      const targetDomain = getHostname(targetUrl);
      // 只要目标域名在白名单就允许跳转，不再新开窗口
      if (!checkDomainAllowed(targetDomain, this.config, false).allowed) {
        event.preventDefault();
        return;
      }
      // 允许跳转，无需额外处理
    });
    webContents.on('will-redirect', (event, targetUrl) => {
      const targetDomain = getHostname(targetUrl);
      if (!checkDomainAllowed(targetDomain, this.config, false).allowed) {
        event.preventDefault();
        return;
      }
      // 允许跳转，无需额外处理
    });
    contentView.webContents.setWindowOpenHandler(({ url }) => {
      const targetDomain = getHostname(url);
      if (!checkDomainAllowed(targetDomain, this.config, false).allowed) {
        return { action: 'deny' };
      }
      // 允许新开窗口访问
      this.openNewWindow(url, this.mainWindow.getSize ? this.mainWindow.getSize() : [1200, 800]);
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
