const { BrowserWindow, BrowserView } = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * 创建新窗口
 * @param {string} url - 要加载的 URL
 * @param {Object} options - 窗口选项
 * @param {boolean} useSimpleMode - 是否使用简单模式（不带导航栏）
 */
function createNewWindow(url, options = {}, useSimpleMode = false) {
  // 如果指定使用简单模式，直接创建简单窗口
  if (useSimpleMode) {
    return createSimpleNewWindow(url, options);
  }
  const defaultOptions = {
    width: 1280,
    height: 800,
    show: true, // 确保窗口立即显示
    icon: path.join(__dirname, '../public/favicon.png'), // 设置应用图标
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false, // 禁用开发者工具
    }
  };

  const windowOptions = { ...defaultOptions, ...options };

  const newWin = new BrowserWindow(windowOptions);

  // 设置自定义 User-Agent
  const defaultUserAgent = newWin.webContents.getUserAgent();
  const customUserAgent = `${defaultUserAgent} SDUTOJCompetitionSideClient/1.0.0`;
  newWin.webContents.setUserAgent(customUserAgent);

  // 禁用新窗口的开发者工具相关功能
  disableDevToolsForWindow(newWin);

  // 为新窗口添加导航栏
  try {
    setupNavigationForNewWindow(newWin, url);
  } catch (error) {
    console.error('设置新窗口导航栏失败:', error);
    // 如果导航栏设置失败，至少让窗口显示内容
    newWin.loadURL(url);
  }

  return newWin;
}

/**
 * 为新窗口设置导航栏
 * @param {BrowserWindow} window - 新窗口
 * @param {string} url - 要加载的URL
 */
function setupNavigationForNewWindow(window, url) {
  const toolbarHeight = 48;

  try {
    // 创建工具栏视图
    const toolbarView = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        devTools: false,
      }
    });

    // 创建内容视图
    const contentView = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        devTools: false,
      }
    });

    // 设置 User-Agent
    const defaultUserAgent = toolbarView.webContents.getUserAgent();
    const customUserAgent = `${defaultUserAgent} SDUTOJCompetitionSideClient/1.0.0`;
    toolbarView.webContents.setUserAgent(customUserAgent);
    contentView.webContents.setUserAgent(customUserAgent);

    // 禁用开发者工具
    disableDevToolsForBrowserView(toolbarView);
    disableDevToolsForBrowserView(contentView);

    // 添加视图到窗口
    window.addBrowserView(toolbarView);
    window.addBrowserView(contentView);

    // 创建工具栏HTML
    const toolbarHTML = createToolbarHTMLForNewWindow();
    const toolbarDataURL = `data:text/html;charset=utf-8,${encodeURIComponent(toolbarHTML)}`;

    // 加载工具栏和内容
    toolbarView.webContents.loadURL(toolbarDataURL).then(() => {
    }).catch(error => {
      console.error('工具栏加载失败:', error);
    });

    contentView.webContents.loadURL(url).then(() => {
    }).catch(error => {
      console.error('内容页面加载失败:', url, error);
    });

    // 设置布局
    const updateLayout = () => {
      const bounds = window.getBounds();
      toolbarView.setBounds({ x: 0, y: 0, width: bounds.width, height: toolbarHeight });
      contentView.setBounds({ x: 0, y: toolbarHeight, width: bounds.width, height: bounds.height - toolbarHeight });
    };

    // 初始布局 - 立即执行一次
    setTimeout(() => {
      updateLayout();
    }, 100);

    // 监听窗口显示和大小变化
    window.once('ready-to-show', updateLayout);
    window.on('resize', updateLayout);

    // 设置工具栏事件处理
    toolbarView.webContents.on('dom-ready', () => {
      toolbarView.webContents.on('console-message', (event, level, message) => {
        if (message.startsWith('TOOLBAR_ACTION:')) {
          const action = message.replace('TOOLBAR_ACTION:', '');
          // 传入主页URL而不是当前页面URL
          const homeUrl = 'https://op.sdutacm.cn/';
          handleNewWindowToolbarAction(action, contentView, homeUrl);
        }
      });
    });    // 监听导航状态变化并更新工具栏
    const updateNavigationState = () => {
      const webContents = contentView.webContents;
      const canGoBack = webContents.navigationHistory?.canGoBack() || webContents.canGoBack();
      const canGoForward = webContents.navigationHistory?.canGoForward() || webContents.canGoForward();

      toolbarView.webContents.executeJavaScript(`
        if (window.updateButtonStates) {
          window.updateButtonStates(${canGoBack}, ${canGoForward});
        }
      `).catch(() => { });
    };

    contentView.webContents.on('did-navigate', updateNavigationState);
    contentView.webContents.on('did-navigate-in-page', updateNavigationState);

  } catch (error) {
    console.error('设置新窗口导航栏过程中出现错误:', error);
    // 如果出现错误，回退到简单的窗口加载
    window.loadURL(url);
  }
}

/**
 * 处理新窗口工具栏动作
 * @param {string} action - 动作类型
 * @param {BrowserView} contentView - 内容视图
 * @param {string} homeUrl - 主页URL
 */
function handleNewWindowToolbarAction(action, contentView, homeUrl) {
  const webContents = contentView.webContents;
  if (!webContents) return;

  try {
    switch (action) {
      case 'back':
        if (webContents.navigationHistory?.canGoBack()) {
          webContents.navigationHistory.goBack();
        } else if (webContents.canGoBack()) {
          webContents.goBack();
        }
        break;
      case 'forward':
        if (webContents.navigationHistory?.canGoForward()) {
          webContents.navigationHistory.goForward();
        } else if (webContents.canGoForward()) {
          webContents.goForward();
        }
        break;
      case 'refresh':
        webContents.reload();
        break;
      case 'home':
        webContents.loadURL(homeUrl);
        break;
    }
  } catch (error) {
    console.error('处理新窗口工具栏动作失败:', error);
  }
}

/**
 * 为指定窗口禁用开发者工具
 * @param {BrowserWindow} window - 窗口对象
 */
function disableDevToolsForWindow(window) {
  const webContents = window?.webContents;
  if (webContents) {
    // 隐藏菜单栏
    window.setMenuBarVisibility(false);
  }
}

/**
 * 为指定 BrowserView 禁用开发者工具
 * @param {BrowserView} view - BrowserView 对象
 */
function disableDevToolsForBrowserView(view) {
  const webContents = view?.webContents;
  if (webContents) {
    // 移除禁止右键菜单的监听，恢复系统默认行为
  }
}

/**
 * 为新窗口创建工具栏HTML
 * @returns {string} 工具栏HTML字符串
 */
function createToolbarHTMLForNewWindow() {
  // 读取SVG图标
  const svgDir = path.join(__dirname, '../public/svg');

  let backSvg, forwardSvg, refreshSvg, homeSvg;

  try {
    backSvg = fs.readFileSync(path.join(svgDir, 'back.svg'), 'utf8');
    forwardSvg = fs.readFileSync(path.join(svgDir, 'forward.svg'), 'utf8');
    refreshSvg = fs.readFileSync(path.join(svgDir, 'refresh.svg'), 'utf8');
    homeSvg = fs.readFileSync(path.join(svgDir, 'home.svg'), 'utf8');
  } catch (error) {
    console.error('读取SVG图标失败:', error);
    // 如果读取失败，使用默认的 SVG 图标
    const defaultSVG = '<svg width="20" height="20" viewBox="0 0 16 16" stroke="currentColor" fill="none"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM5.354 4.646L4.646 5.354 7.293 8l-2.647 2.646.708.708L8 8.707l2.646 2.647.708-.708L8.707 8l2.647-2.646-.708-.708L8 7.293 5.354 4.646z"/></svg>';
    backSvg = defaultSVG;
    forwardSvg = defaultSVG;
    refreshSvg = defaultSVG;
    homeSvg = defaultSVG;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>工具栏</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          width: 100%;
          height: 48px;
          background: var(--toolbar-bg);
          border-bottom: 1px solid var(--toolbar-border);
          display: flex;
          align-items: center;
          justify-content: flex-start;
          padding: 0 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          user-select: none;
          -webkit-user-select: none;
          overflow: hidden;
        }

        .toolbar-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .toolbar-btn {
          width: 40px;
          height: 40px;
          border: none;
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          position: relative;
        }
        
        .toolbar-btn:hover {
          background: var(--toolbar-btn-hover);
        }
        
        .toolbar-btn:active {
          transform: translateY(0) scale(0.95);
        }
        
        .toolbar-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .toolbar-btn:disabled:hover {
          background: transparent;
          transform: none;
        }
        
        .toolbar-btn svg {
          width: 20px;
          height: 20px;
          stroke: var(--toolbar-icon-color);
          pointer-events: none;
          transition: stroke-dasharray 0.3s ease, stroke-dashoffset 0.3s ease;
        }

        /* 点击动画效果 */
        .toolbar-btn.animate svg {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: drawStroke 0.6s ease-out forwards;
        }

        @keyframes drawStroke {
          to {
            stroke-dashoffset: 0;
          }
        }

        /* 主题变量 - 亮色主题 */
        :root {
          --toolbar-bg: #fcfcfc;
          --toolbar-border: #e5e7eb;
          --toolbar-btn-hover: #f3f4f6;
          --toolbar-icon-color: #4b5563;
        }

        /* 暗色主题检测 */
        @media (prefers-color-scheme: dark) {
          :root {
            --toolbar-bg: #1f1f1f;
            --toolbar-border: #21262d;
            --toolbar-btn-hover: #262c36;
            --toolbar-icon-color: #e6edf3;
          }
        }
      </style>
    </head>
    <body>
      <div class="toolbar-left">
        <button class="toolbar-btn" id="back-btn" title="后退">${backSvg}</button>
        <button class="toolbar-btn" id="forward-btn" title="前进">${forwardSvg}</button>
        <button class="toolbar-btn" id="refresh-btn" title="刷新">${refreshSvg}</button>
        <button class="toolbar-btn" id="home-btn" title="主页">${homeSvg}</button>
      </div>
      
      <script>
        function updateButtonStates(canGoBack, canGoForward) {
          const backBtn = document.getElementById('back-btn');
          const forwardBtn = document.getElementById('forward-btn');
          
          if (backBtn) backBtn.disabled = !canGoBack;
          if (forwardBtn) forwardBtn.disabled = !canGoForward;
        }
        
        // 绑定按钮事件
        const buttons = {
          'back-btn': 'back',
          'forward-btn': 'forward', 
          'refresh-btn': 'refresh',
          'home-btn': 'home'
        };
        
        Object.entries(buttons).forEach(([id, action]) => {
          const btn = document.getElementById(id);
          if (btn) {
            btn.onclick = () => {
              // 添加动画类
              btn.classList.add('animate');
              
              // 触发工具栏动作
              console.log(\`TOOLBAR_ACTION:\${action}\`);
              
              // 动画结束后移除动画类
              setTimeout(() => {
                btn.classList.remove('animate');
              }, 600);
            };
          }
        });
        
        // 暴露全局函数
        window.updateButtonStates = updateButtonStates;
        
        // 防止默认的拖拽和选择行为
        document.addEventListener('dragstart', e => e.preventDefault());
        document.addEventListener('selectstart', e => e.preventDefault());
      </script>
    </body>
    </html>
  `;
}

/**
 * 创建简单新窗口（不带导航栏）
 * @param {string} url - 要加载的 URL
 * @param {Object} options - 窗口选项
 */
function createSimpleNewWindow(url, options = {}) {
  const defaultOptions = {
    width: 1280,
    height: 800,
    show: true,
    icon: path.join(__dirname, '../public/favicon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false,
    }
  };

  const windowOptions = { ...defaultOptions, ...options };

  const newWin = new BrowserWindow(windowOptions);

  // 设置自定义 User-Agent
  const defaultUserAgent = newWin.webContents.getUserAgent();
  const customUserAgent = `${defaultUserAgent} SDUTOJCompetitionSideClient/1.0.0`;
  newWin.webContents.setUserAgent(customUserAgent);

  // 禁用开发者工具
  disableDevToolsForWindow(newWin);

  // 直接加载URL
  newWin.loadURL(url).then(() => {
  }).catch(error => {
    console.error('简单新窗口加载失败:', url, error);
  });

  return newWin;
}

/**
 * 布局视图管理器
 */
class LayoutManager {
  constructor(mainWindow, toolbarManager, contentViewManager) {
    this.mainWindow = mainWindow;
    this.toolbarManager = toolbarManager;
    this.contentViewManager = contentViewManager;
    this.toolbarHeight = 48;
  }

  /**
   * 布局所有视图
   */
  layoutViews() {
    const bounds = this.mainWindow.getBounds();

    // 设置工具栏位置（顶部）
    this.toolbarManager.setBounds({
      x: 0,
      y: 0,
      width: bounds.width,
      height: this.toolbarHeight
    });

    // 设置内容视图位置（工具栏下方）
    this.contentViewManager.setBounds({
      x: 0,
      y: this.toolbarHeight,
      width: bounds.width,
      height: bounds.height - this.toolbarHeight
    });
  }

  /**
   * 监听窗口大小变化
   */
  setupResizeListener() {
    this.mainWindow.on('resize', () => {
      this.layoutViews();
    });
  }
}

module.exports = {
  createNewWindow,
  createSimpleNewWindow,
  LayoutManager
};
