const { BrowserView } = require('electron');
const fs = require('fs');
const PlatformHelper = require('./platformHelper');

class ToolbarManager {
  constructor(mainWindow, onActionCallback) {
    this.mainWindow = mainWindow;
    this.toolbarView = null;
    this.onActionCallback = onActionCallback;
  }

  /**
   * 创建工具栏视图
   */
  createToolbarView() {
    this.toolbarView = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        devTools: false, // 禁用开发者工具
      }
    });

    this.mainWindow.setBrowserView(this.toolbarView);

    // 设置自定义 User-Agent 并加载内容
    const webContents = this.toolbarView.webContents;
    const defaultUserAgent = webContents.getUserAgent();
    const customUserAgent = `${defaultUserAgent} SDUTOJCompetitionSideClient/1.0.0`;
    webContents.setUserAgent(customUserAgent);

    // 禁用工具栏视图的开发者工具相关功能
    this.disableDevToolsForToolbar();

    // 创建工具栏 HTML 内容
    const toolbarHTML = this.createToolbarHTML();
    const toolbarDataURL = `data:text/html;charset=utf-8,${encodeURIComponent(toolbarHTML)}`;

    webContents.loadURL(toolbarDataURL);

    // 工具栏按钮点击事件处理
    webContents.on('dom-ready', () => {
      webContents.on('console-message', (event, level, message, line, sourceId) => {
        if (message.startsWith('TOOLBAR_ACTION:')) {
          const action = message.replace('TOOLBAR_ACTION:', '');
          if (this.onActionCallback) {
            this.onActionCallback(action);
            // 如果是 clean，则主窗口也清理 localStorage 和 cookie
            if (action === 'clean') {
              const { BrowserWindow, app, dialog } = require('electron');
              
              // 显示确认对话框
              const currentWindow = BrowserWindow.getFocusedWindow() || this.mainWindow;
              const choice = dialog.showMessageBoxSync(currentWindow, {
                type: 'warning',
                buttons: ['🚀 确认清理并重启', '❌ 取消'],
                defaultId: 1, // 默认选中"取消"
                cancelId: 1, // ESC键对应"取消"
                title: '🔄 确认系统重置',
                message: '⚡ 清理本地存储并重启应用',
                detail: '🧹 此操作将执行以下内容：\n\n📦 清空所有本地存储数据（localStorage）\n💾 清空所有会话存储数据（sessionStorage）\n🍪 清空所有 Cookie 数据\n🗃️ 清空 IndexedDB 数据库\n🔄 关闭所有窗口并重启应用\n\n🏠 重启后将返回到应用主页。确定要继续吗？',
                noLink: true // 不显示链接样式
              });
              
              // 如果用户选择取消（选项1），则不执行任何操作
              if (choice !== 0) {
                return;
              }
              
              // 用户确认后，设置重启状态，防止应用退出
              if (global.setRestartingState) {
                global.setRestartingState(true);
              }
              
              const allWindows = BrowserWindow.getAllWindows();
              // 清理所有窗口存储和 cookie
              allWindows.forEach(win => {
                if (win && win.webContents) {
                  win.webContents.executeJavaScript(`
                    try {
                      localStorage.clear();
                      sessionStorage.clear();
                      document.cookie.split(';').forEach(function(c) {
                        document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
                      });
                      if (window.indexedDB && indexedDB.databases) {
                        indexedDB.databases().then(dbs => {
                          dbs.forEach(db => {
                            indexedDB.deleteDatabase(db.name);
                          });
                        });
                      }
                      if (window._resetAppState) window._resetAppState();
                    } catch (e) {}
                  `).catch(() => {});
                  // 清理 session cookies
                  try {
                    win.webContents.session.clearStorageData({ storages: ['cookies'] });
                  } catch (e) {}
                }
              });
              // 关闭所有窗口
              allWindows.forEach(win => {
                try { win.close(); } catch (e) {}
              });
              // 3秒后重启主窗口
              setTimeout(() => {
                if (app && app.emit) {
                  app.emit('reopen-main-window');
                }
              }, 3000);
            }
          }
        }
      });
    });

    return this.toolbarView;
  }

  /**
   * 禁用工具栏视图的开发者工具
   */
  disableDevToolsForToolbar() {
    const webContents = this.toolbarView?.webContents;
    if (webContents) {
      webContents.on('before-input-event', (event, input) => {
        // 只拦截开发者工具相关快捷键
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
        // Mac 下处理导航/刷新/主页/info/clean快捷键，且只在 toolbarView 聚焦时生效
        if (process.platform === 'darwin' && webContents.isFocused && webContents.isFocused()) {
          // 主页 Cmd+Shift+H
          if (input.meta && input.shift && !input.alt && !input.control && input.key.toUpperCase() === 'H') {
            if (this.onActionCallback) this.onActionCallback('home');
          }
          // 刷新 Cmd+R
          else if (input.meta && !input.shift && !input.alt && !input.control && input.key.toUpperCase() === 'R') {
            if (this.onActionCallback) this.onActionCallback('refresh');
          }
          // 后退 Cmd+Left
          else if (input.meta && !input.shift && !input.alt && !input.control && input.key === 'Left') {
            if (this.onActionCallback) this.onActionCallback('back');
          }
          // 前进 Cmd+Right
          else if (input.meta && !input.shift && !input.alt && !input.control && input.key === 'Right') {
            if (this.onActionCallback) this.onActionCallback('forward');
          }
          // 系统信息 Cmd+I
          else if (input.meta && !input.shift && !input.alt && !input.control && input.key.toUpperCase() === 'I') {
            if (this.onActionCallback) this.onActionCallback('info');
          }
          // 清空本地存储 Cmd+Shift+Delete
          else if (input.meta && input.shift && !input.alt && !input.control && input.key === 'Delete') {
            if (this.onActionCallback) this.onActionCallback('clean');
          }
        }
      });
    }
  }

  /**
   * 创建工具栏 HTML 内容
   */
  createToolbarHTML() {
    // 读取本地 SVG 文件内容，增加错误处理
    let backSVG, forwardSVG, refreshSVG, homeSVG, infoSVG, cleanSVG;

    try {
      const svgPath = PlatformHelper.joinPath(__dirname, '..', 'public', 'svg');

      backSVG = fs.readFileSync(PlatformHelper.joinPath(svgPath, 'back.svg'), 'utf8');
      forwardSVG = fs.readFileSync(PlatformHelper.joinPath(svgPath, 'forward.svg'), 'utf8');
      refreshSVG = fs.readFileSync(PlatformHelper.joinPath(svgPath, 'refresh.svg'), 'utf8');
      homeSVG = fs.readFileSync(PlatformHelper.joinPath(svgPath, 'home.svg'), 'utf8');
      infoSVG = fs.readFileSync(PlatformHelper.joinPath(svgPath, 'info.svg'), 'utf8');
      cleanSVG = fs.readFileSync(PlatformHelper.joinPath(svgPath, 'clean.svg'), 'utf8');
    } catch (error) {
      console.error('Error loading SVG files:', error);

      // 提供默认的 SVG 图标
      const defaultSVG = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM5.354 4.646L4.646 5.354 7.293 8l-2.647 2.646.708.708L8 8.707l2.646 2.647.708-.708L8.707 8l2.647-2.646-.708-.708L8 7.293 5.354 4.646z"/></svg>';
      backSVG = defaultSVG;
      forwardSVG = defaultSVG;
      refreshSVG = defaultSVG;
      homeSVG = defaultSVG;
      infoSVG = defaultSVG;
      cleanSVG = defaultSVG;
    }

    // 获取平台快捷键信息
    const shortcuts = PlatformHelper.getNavigationShortcuts();
    // 判断是否为 macOS，主窗口也隐藏 info 按钮
    const isMac = process.platform === 'darwin';
    // 判断是否为 About 弹窗或特殊模式，隐藏 info 按钮
    const isAboutDialog = !!global._aboutDialogMode;
    const isMainWindow = !!global._mainToolbarMode;
    // 只在 About 弹窗和特殊模式下隐藏 info 按钮
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
            justify-content: space-between;
            padding: 0 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            -webkit-app-region: drag; /* 允许拖动窗口 */
          }

          .toolbar-left {
            display: flex;
            align-items: center;
            gap: 8px;
            -webkit-app-region: no-drag; /* 按钮区域不允许拖动 */
          }

          .toolbar-right {
            display: flex;
            align-items: center;
            gap: 8px;
            -webkit-app-region: no-drag; /* 按钮区域不允许拖动 */
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
            transition: background 0.3s ease;
            -webkit-app-region: no-drag; /* 确保按钮不会拖动窗口 */
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
          <button class="toolbar-btn" data-action="back" title="后退 (${shortcuts.backLabel})">
            ${backSVG}
          </button>
          <button class="toolbar-btn" data-action="forward" title="前进 (${shortcuts.forwardLabel})">
            ${forwardSVG}
          </button>
          <button class="toolbar-btn" data-action="refresh" title="刷新 (${shortcuts.refreshLabel})">
            ${refreshSVG}
          </button>
          <button class="toolbar-btn" data-action="home" title="主页 (${shortcuts.homeLabel})">
            ${homeSVG}
          </button>
        </div>
        <div class="toolbar-right">
          ${(!isAboutDialog && !isMainWindow) ? `<button class="toolbar-btn" data-action="info" title="系统信息 (Alt+I)">${infoSVG}</button>` : ''}
          <button class="toolbar-btn" data-action="clean" title="系统重置（清理存储并重启）">
            ${cleanSVG}
          </button>
        </div>
        <script>
          // 工具栏按钮点击处理
          document.addEventListener('click', (e) => {
            const btn = e.target.closest('.toolbar-btn');
            if (!btn || btn.disabled) return;
            const action = btn.getAttribute('data-action');
            
            // 处理清空本地存储
            if (action === 'clean') {
              try {
                // 清空 localStorage
                localStorage.clear();
                
                // 清空 cookies
                document.cookie.split(";").forEach(function(c) { 
                  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
                });
                
                // 添加动画效果
                btn.classList.add('animate');
                setTimeout(() => {
                  btn.classList.remove('animate');
                }, 600);
                
                console.log('Local storage and cookies cleared');
              } catch (error) {
                console.error('Error clearing local storage:', error);
              }
            }
            
            if (action === 'refresh' || action === 'home') {
              btn.classList.add('animate');
              setTimeout(() => {
                btn.classList.remove('animate');
              }, 600);
            }
            console.log('TOOLBAR_ACTION:' + action);
          });

          // 更新按钮状态的函数
          window.updateButtonStates = function(canGoBack, canGoForward) {
            const backBtn = document.querySelector('[data-action="back"]');
            const forwardBtn = document.querySelector('[data-action="forward"]');
            if (backBtn) {
              backBtn.disabled = !canGoBack;
            }
            if (forwardBtn) {
              forwardBtn.disabled = !canGoForward;
            }
          };

          // 监听来自主进程的状态更新消息
          window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'UPDATE_NAVIGATION_STATE') {
              window.updateButtonStates(event.data.canGoBack, event.data.canGoForward);
            }
          });
        </script>
      </body>
      </html>
    `;
  }

  /**
   * 设置工具栏位置
   */
  setBounds(bounds) {
    if (this.toolbarView) {
      this.toolbarView.setBounds(bounds);
    }
  }

  /**
   * 更新导航按钮状态
   */
  updateNavigationState(canGoBack, canGoForward) {
    const webContents = this.toolbarView?.webContents;
    if (webContents) {
      try {
        webContents.executeJavaScript(`
          if (window.updateButtonStates) {
            window.updateButtonStates(${canGoBack}, ${canGoForward});
          }
        `).catch(err => {
          // 静默处理 JavaScript 执行错误，避免在 macOS 上显示弹窗
        });
      } catch (error) {
        // 静默处理同步错误
      }
    }
  }

  /**
   * 更新导航按钮状态（别名方法）
   */
  updateNavigationButtons() {
    const webContents = this.mainWindow?.webContents;
    if (webContents) {
      const canGoBack = webContents.canGoBack();
      const canGoForward = webContents.canGoForward();
      this.updateNavigationState(canGoBack, canGoForward);
    }
  }

  /**
   * 获取工具栏视图
   */
  getView() {
    return this.toolbarView;
  }
}

module.exports = ToolbarManager;
