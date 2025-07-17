const { BrowserView } = require('electron');
const fs = require('fs');
const path = require('path');
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
    
    // 禁用工具栏视图的开发者工具相关功能
    this.disableDevToolsForToolbar();
    
    // 创建工具栏 HTML 内容
    const toolbarHTML = this.createToolbarHTML();
    const toolbarDataURL = `data:text/html;charset=utf-8,${encodeURIComponent(toolbarHTML)}`;
    
    const webContents = this.toolbarView.webContents;
    webContents.loadURL(toolbarDataURL);
    
    // 工具栏按钮点击事件处理
    webContents.on('dom-ready', () => {
      webContents.on('console-message', (event, level, message, line, sourceId) => {
        if (message.startsWith('TOOLBAR_ACTION:')) {
          const action = message.replace('TOOLBAR_ACTION:', '');
          if (this.onActionCallback) {
            this.onActionCallback(action);
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
   * 创建工具栏 HTML 内容
   */
  createToolbarHTML() {
    // 读取本地 SVG 文件内容，增加错误处理
    let backSVG, forwardSVG, refreshSVG, homeSVG, infoSVG;
    
    try {
      const svgPath = PlatformHelper.joinPath(__dirname, '..', 'public', 'svg');
      
      backSVG = fs.readFileSync(PlatformHelper.joinPath(svgPath, 'back.svg'), 'utf8');
      forwardSVG = fs.readFileSync(PlatformHelper.joinPath(svgPath, 'forward.svg'), 'utf8');
      refreshSVG = fs.readFileSync(PlatformHelper.joinPath(svgPath, 'refresh.svg'), 'utf8');
      homeSVG = fs.readFileSync(PlatformHelper.joinPath(svgPath, 'home.svg'), 'utf8');
      infoSVG = fs.readFileSync(PlatformHelper.joinPath(svgPath, 'info.svg'), 'utf8');
    } catch (error) {
      console.error('Error loading SVG files:', error);
      
      // 提供默认的 SVG 图标
      const defaultSVG = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM5.354 4.646L4.646 5.354 7.293 8l-2.647 2.646.708.708L8 8.707l2.646 2.647.708-.708L8.707 8l2.647-2.646-.708-.708L8 7.293 5.354 4.646z"/></svg>';
      backSVG = defaultSVG;
      forwardSVG = defaultSVG;
      refreshSVG = defaultSVG;
      homeSVG = defaultSVG;
      infoSVG = defaultSVG;
    }

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
          }

          .toolbar-left {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .toolbar-right {
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
            transition: background 0.3s ease;
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
          <button class="toolbar-btn" data-action="back" title="后退 (Alt+←)">
            ${backSVG}
          </button>
          <button class="toolbar-btn" data-action="forward" title="前进 (Alt+→)">
            ${forwardSVG}
          </button>
          <button class="toolbar-btn" data-action="refresh" title="刷新 (Alt+R)">
            ${refreshSVG}
          </button>
          <button class="toolbar-btn" data-action="home" title="主页 (Alt+H)">
            ${homeSVG}
          </button>
        </div>
        
        <div class="toolbar-right">
          <button class="toolbar-btn" data-action="info" title="系统信息 (Alt+I)">
            ${infoSVG}
          </button>
        </div>
        
        <script>
          // 工具栏按钮点击处理
          document.addEventListener('click', (e) => {
            const btn = e.target.closest('.toolbar-btn');
            if (!btn || btn.disabled) return;
            
            const action = btn.getAttribute('data-action');
            
            // 为刷新和主页按钮添加动画效果
            if (action === 'refresh' || action === 'home') {
              btn.classList.add('animate');
              setTimeout(() => {
                btn.classList.remove('animate');
              }, 600);
            }
            
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
      webContents.executeJavaScript(`
        window.updateButtonStates(${canGoBack}, ${canGoForward});
      `).catch(err => {
        console.log('更新按钮状态失败:', err);
      });
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
