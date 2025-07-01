const { app, BrowserWindow, Menu, dialog, nativeImage, globalShortcut, BrowserView } = require('electron');
const urlModule = require('url');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let toolbarView = null;
let contentView = null;

// 主页面地址
const HOME_URL = 'https://op.sdutacm.cn/';

// 主窗口允许访问的根域名（支持子路径）
const MAIN_DOMAIN = 'op.sdutacm.cn';

const POPUP_WHITELIST = new Set([
  'rl.algoux.cn',
  'rl.algoux.org',
  'rank.ac',
  'acm.sdut.edu.cn'
]);

const BLOCKED_DOMAINS = new Set([
  'oj.sdutacm.cn'
]);

app.whenReady().then(() => {
  // 创建主窗口
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // 隐藏默认菜单栏
  mainWindow.setMenuBarVisibility(false);

  // 创建工具栏视图
  createToolbarView();
  
  // 创建内容视图
  createContentView();

  // 布局视图
  layoutViews();

  // 创建工具栏视图
  function createToolbarView() {
    toolbarView = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      }
    });
    
    mainWindow.setBrowserView(toolbarView);
    
    // 创建工具栏 HTML 内容
    const toolbarHTML = createToolbarHTML();
    const toolbarDataURL = `data:text/html;charset=utf-8,${encodeURIComponent(toolbarHTML)}`;
    
    toolbarView.webContents.loadURL(toolbarDataURL);
    
    // 工具栏按钮点击事件处理
    toolbarView.webContents.on('dom-ready', () => {
      // 监听控制台消息来处理按钮点击
      toolbarView.webContents.on('console-message', (event, level, message, line, sourceId) => {
        if (message.startsWith('TOOLBAR_ACTION:')) {
          const action = message.replace('TOOLBAR_ACTION:', '');
          handleToolbarAction(action);
        }
      });
    });
  }

  // 创建内容视图
  function createContentView() {
    contentView = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      }
    });
    
    mainWindow.addBrowserView(contentView);
    contentView.webContents.loadURL(HOME_URL);
    
    // 设置内容视图的导航监听
    setupContentViewNavigation();
  }

  // 布局视图
  function layoutViews() {
    const bounds = mainWindow.getBounds();
    const toolbarHeight = 48;
    
    // 设置工具栏位置（顶部）
    if (toolbarView) {
      toolbarView.setBounds({ 
        x: 0, 
        y: 0, 
        width: bounds.width, 
        height: toolbarHeight 
      });
    }
    
    // 设置内容视图位置（工具栏下方）
    if (contentView) {
      contentView.setBounds({ 
        x: 0, 
        y: toolbarHeight, 
        width: bounds.width, 
        height: bounds.height - toolbarHeight 
      });
    }
  }

  // 监听窗口大小变化
  mainWindow.on('resize', layoutViews);

  // 创建工具栏 HTML 内容
  function createToolbarHTML() {
    // 读取本地 SVG 文件内容
    const backSVG = fs.readFileSync(path.join(__dirname, 'public/svg/back.svg'), 'utf8');
    const forwardSVG = fs.readFileSync(path.join(__dirname, 'public/svg/forward.svg'), 'utf8');
    const refreshSVG = fs.readFileSync(path.join(__dirname, 'public/svg/refresh.svg'), 'utf8');
    const homeSVG = fs.readFileSync(path.join(__dirname, 'public/svg/home.svg'), 'utf8');

    return `
      <!DOCTYPE html>
      <html>
      <head>
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
            padding: 0 12px;
            gap: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
            transform: translateY(-1px);
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
          }

          /* 主题变量 - 亮色主题 */
          :root {
            --toolbar-bg: #ffffff;
            --toolbar-border: #e5e7eb;
            --toolbar-btn-hover: #f3f4f6;
            --toolbar-icon-color: #4b5563;
          }

          /* 暗色主题检测 */
          @media (prefers-color-scheme: dark) {
            :root {
              --toolbar-bg: #1f2937;
              --toolbar-border: #374151;
              --toolbar-btn-hover: #374151;
              --toolbar-icon-color: #d1d5db;
            }
          }
        </style>
      </head>
      <body>
        <button class="toolbar-btn" data-action="back" title="后退 (Ctrl+←)">
          ${backSVG}
        </button>
        <button class="toolbar-btn" data-action="forward" title="前进 (Ctrl+→)">
          ${forwardSVG}
        </button>
        <button class="toolbar-btn" data-action="refresh" title="刷新 (Ctrl+R)">
          ${refreshSVG}
        </button>
        <button class="toolbar-btn" data-action="home" title="主页 (Ctrl+H)">
          ${homeSVG}
        </button>
        
        <script>
          // 工具栏按钮点击处理
          document.addEventListener('click', (e) => {
            const btn = e.target.closest('.toolbar-btn');
            if (!btn) return;
            
            const action = btn.getAttribute('data-action');
            
            // 直接发送消息到主进程
            fetch('electron://toolbar-action', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action })
            }).catch(() => {
              // 备用方案：使用 console 消息
              console.log('TOOLBAR_ACTION:' + action);
            });
          });
        </script>
      </body>
      </html>
    `;
  }

  // 设置内容视图导航
  function setupContentViewNavigation() {
    contentView.webContents.on('will-navigate', (event, targetUrl) => {
      const hostname = getHostname(targetUrl);
      if (!hostname) {
        event.preventDefault();
        return;
      }

      // 拦截禁止访问的域名
      if (BLOCKED_DOMAINS.has(hostname)) {
        event.preventDefault();
        console.log(`⛔ 拦截禁止域名：${hostname}`);
        showBlockedDialog(hostname, '该域名已被明确禁止访问');
        return;
      }

      if (hostname === MAIN_DOMAIN) {
        // 允许 op.sdutacm.cn 主窗口跳转
        return;
      }

      if (POPUP_WHITELIST.has(hostname)) {
        // 弹出新窗口
        event.preventDefault();
        openNewWindow(targetUrl);
        return;
      }

      // 其余一律禁止
      event.preventDefault();
      showBlockedDialog(hostname, '该域名不在允许访问的白名单中');
    });

    contentView.webContents.setWindowOpenHandler(({ url }) => {
      const hostname = getHostname(url);
      if (POPUP_WHITELIST.has(hostname)) {
        openNewWindow(url);
      } else {
        showBlockedDialog(hostname, '该域名不在允许访问的白名单中');
      }
      return { action: 'deny' };
    });
  }

  // 注册全局快捷键
  globalShortcut.register('CmdOrCtrl+Left', () => {
    if (contentView && contentView.webContents.navigationHistory.canGoBack()) {
      contentView.webContents.goBack();
    }
  });

  globalShortcut.register('CmdOrCtrl+Right', () => {
    if (contentView && contentView.webContents.navigationHistory.canGoForward()) {
      contentView.webContents.goForward();
    }
  });

  globalShortcut.register('CmdOrCtrl+R', () => {
    if (contentView) {
      contentView.webContents.reload();
    }
  });

  globalShortcut.register('CmdOrCtrl+H', () => {
    if (contentView) {
      contentView.webContents.loadURL(HOME_URL);
    }
  });

  function handleToolbarAction(action) {
    switch(action) {
      case 'back':
        if (contentView && contentView.webContents.navigationHistory.canGoBack()) {
          contentView.webContents.goBack();
        }
        break;
      case 'forward':
        if (contentView && contentView.webContents.navigationHistory.canGoForward()) {
          contentView.webContents.goForward();
        }
        break;
      case 'refresh':
        if (contentView) {
          contentView.webContents.reload();
        }
        break;
      case 'home':
        if (contentView) {
          contentView.webContents.loadURL(HOME_URL);
        }
        break;
    }
  }

  function getHostname(targetUrl) {
    try {
      return new urlModule.URL(targetUrl).hostname;
    } catch {
      return null;
    }
  }

  function showBlockedDialog(hostname, reason) {
    dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: '访问拦截 ⛔️',
      message: '网站访问被阻止',
      detail: `域名：${hostname}\n原因：${reason}`,
      buttons: ['确定'],
      defaultId: 0,
      icon: null
    });
  }

  function openNewWindow(url) {
    const newWin = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      }
    });
    newWin.loadURL(url);
  }
});

app.on('will-quit', () => {
  // 取消注册所有快捷键
  globalShortcut.unregisterAll();
});
