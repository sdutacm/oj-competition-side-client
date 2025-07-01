const { BrowserView } = require('electron');
const fs = require('fs');
const path = require('path');

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
      }
    });
    
    this.mainWindow.setBrowserView(this.toolbarView);
    
    // 创建工具栏 HTML 内容
    const toolbarHTML = this.createToolbarHTML();
    const toolbarDataURL = `data:text/html;charset=utf-8,${encodeURIComponent(toolbarHTML)}`;
    
    this.toolbarView.webContents.loadURL(toolbarDataURL);
    
    // 工具栏按钮点击事件处理
    this.toolbarView.webContents.on('dom-ready', () => {
      this.toolbarView.webContents.on('console-message', (event, level, message, line, sourceId) => {
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
   * 创建工具栏 HTML 内容
   */
  createToolbarHTML() {
    // 读取本地 SVG 文件内容
    const backSVG = fs.readFileSync(path.join(__dirname, '../public/svg/back.svg'), 'utf8');
    const forwardSVG = fs.readFileSync(path.join(__dirname, '../public/svg/forward.svg'), 'utf8');
    const refreshSVG = fs.readFileSync(path.join(__dirname, '../public/svg/refresh.svg'), 'utf8');
    const homeSVG = fs.readFileSync(path.join(__dirname, '../public/svg/home.svg'), 'utf8');

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

  /**
   * 设置工具栏位置
   */
  setBounds(bounds) {
    if (this.toolbarView) {
      this.toolbarView.setBounds(bounds);
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
