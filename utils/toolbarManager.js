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
              
              // 显示同步确认对话框
              const currentWindow = BrowserWindow.getFocusedWindow() || this.mainWindow;
              
              // 创建带倒计时的自定义对话框
              const isMac = process.platform === 'darwin';
              const confirmWindow = new BrowserWindow({
                width: 520,
                height: 420,
                frame: false, // 完全无框
                resizable: false,
                alwaysOnTop: false, // 不置顶，允许其他窗口覆盖
                center: true,
                modal: false, // 不设为模态，允许其他窗口正常交互
                parent: currentWindow,
                show: false,
                transparent: true, // Mac也启用透明，解决边框问题
                backgroundColor: 'rgba(0,0,0,0)', // 完全透明背景
                skipTaskbar: false, // 允许在任务栏显示
                focusable: true,
                titleBarStyle: isMac ? 'customButtonsOnHover' : undefined, // Mac隐藏原生按钮
                trafficLightPosition: isMac ? { x: -100, y: -100 } : undefined, // Mac隐藏交通灯按钮
                hasShadow: false, // 禁用窗口阴影
                thickFrame: false, // 禁用厚边框
                webPreferences: {
                  nodeIntegration: false,
                  contextIsolation: true,
                  devTools: false
                }
              });

              // 创建确认对话框HTML
              const confirmHTML = this.getConfirmDialogHTML();
              const confirmDataURL = `data:text/html;charset=utf-8,${encodeURIComponent(confirmHTML)}`;
              
              confirmWindow.loadURL(confirmDataURL);
              
              let dialogResult = false;
              
              // 监听对话框结果
              confirmWindow.webContents.once('dom-ready', () => {
                // Mac系统特殊处理：确保窗口可见但不置顶，隐藏原生控件
                if (isMac) {
                  confirmWindow.setVisibleOnAllWorkspaces(false); // 不在所有工作区显示
                  // 确保窗口完全透明且无边框
                  confirmWindow.setBackgroundColor('rgba(0,0,0,0)');
                  // 移除窗口阴影和边框
                  try {
                    confirmWindow.setHasShadow(false);
                  } catch (e) {
                    // 静默处理可能的API错误
                  }
                }
                
                confirmWindow.show();
                confirmWindow.focus();
                
                confirmWindow.webContents.on('console-message', (event, level, message) => {
                  if (message.startsWith('DIALOG_RESULT:')) {
                    const result = message.replace('DIALOG_RESULT:', '');
                    dialogResult = (result === 'confirm');
                    confirmWindow.close();
                  }
                });
              });

              // 等待对话框关闭
              confirmWindow.on('closed', () => {
                if (!dialogResult) {
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
                
                // 立即显示启动页窗口
                this.showStartupWindow(() => {
                  // 启动页关闭后重启主窗口
                  if (app && app.emit) {
                    app.emit('reopen-main-window');
                  }
                });
              });
            }
          }
        }
      });
    });

    return this.toolbarView;
  }

  /**
   * 获取确认对话框HTML内容
   */
  getConfirmDialogHTML() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>确认系统重置</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      user-select: none;
    }

    :root {
      --bg-primary: #ffffff;
      --bg-secondary: #f8fafc;
      --text-primary: #1e293b;
      --text-secondary: #64748b;
      --text-danger: #ff2e2ed0;
      --border-color: #e2e8f0;
      --shadow-color: rgba(0, 0, 0, 0.1);
      --danger-bg: rgba(254, 242, 242, 0.8);
      --danger-border: rgba(239, 68, 68, 0.3);
      --confirm-bg: #dc2626;
      --confirm-hover: #b91c1c;
      --confirm-disabled: #9ca3af;
      --cancel-bg: #6b7280;
      --cancel-hover: #4b5563;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg-primary: #1e293b;
        --bg-secondary: #0f172a;
        --text-primary: #f1f5f9;
        --text-secondary: #94a3b8;
        --text-danger: #ef4444;
        --border-color: #334155;
        --shadow-color: rgba(0, 0, 0, 0.3);
        --danger-bg: rgba(127, 29, 29, 0.3);
        --danger-border: rgba(239, 68, 68, 0.3);
        --confirm-bg: #dc2626;
        --confirm-hover: #b91c1c;
        --confirm-disabled: #6b7280;
        --cancel-bg: #475569;
        --cancel-hover: #334155;
      }
    }

    html, body {
      height: 100%;
      width: 100%;
      font-family: "Segoe UI", "Helvetica Neue", sans-serif;
      background: transparent;
      overflow: hidden;
      border-radius: 16px;
      scrollbar-width: none;
      -ms-overflow-style: none;
      border: none; /* 移除任何边框 */
      outline: none; /* 移除轮廓 */
    }

    /* Mac系统特殊处理 */
    @supports (-webkit-backdrop-filter: blur(10px)) {
      html, body {
        background: transparent; /* 保持透明，让dialog-content处理背景 */
        -webkit-backdrop-filter: none; /* 移除背景滤镜避免边框 */
        backdrop-filter: none;
      }
    }

    html::-webkit-scrollbar, 
    body::-webkit-scrollbar {
      display: none;
    }

    .dialog-container {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border-radius: 16px;
      overflow: hidden;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .dialog-container::-webkit-scrollbar {
      display: none;
    }

    .dialog-content {
      background: var(--bg-primary);
      border-radius: 16px;
      border: 2px solid var(--border-color);
      box-shadow: 0 25px 50px -12px var(--shadow-color), 0 0 0 1px rgba(255,255,255,0.05);
      padding: 24px;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      animation: dialogAppear 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      overflow: hidden;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    /* Mac系统特殊处理 - 使用毛玻璃效果 */
    @supports (-webkit-backdrop-filter: blur(10px)) {
      .dialog-content {
        background: rgba(255, 255, 255, 0.95);
        -webkit-backdrop-filter: blur(20px);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.3);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), 
                    inset 0 1px 0 rgba(255, 255, 255, 0.2);
      }
      
      @media (prefers-color-scheme: dark) {
        .dialog-content {
          background: rgba(30, 41, 59, 0.95);
          border: 1px solid rgba(148, 163, 184, 0.3);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 
                      inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }
      }
    }

    .dialog-content::-webkit-scrollbar {
      display: none;
    }

    @keyframes dialogAppear {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(-20px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .dialog-header {
      display: flex;
      align-items: center;
      margin-bottom: 14px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border-color);
      flex-shrink: 0;
    }

    .dialog-icon {
      width: 32px;
      height: 32px;
      background: var(--danger-bg);
      border: 2px solid var(--danger-border);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 16px;
      flex-shrink: 0;
    }

    .dialog-icon::after {
      content: "!";
      color: var(--text-danger);
      font-size: 18px;
      font-weight: bold;
    }

    .dialog-title {
      font-size: 20px;
      font-weight: 600;
      color: var(--text-danger);
      margin: 0;
    }

    .dialog-message {
      color: var(--text-primary);
      font-size: 15px;
      line-height: 1.3;
      margin-bottom: 16px;
      font-weight: 500;
      flex-shrink: 0;
    }

    .dialog-details {
      background: var(--danger-bg);
      border: 2px solid var(--danger-border);
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 18px;
      font-size: 12px;
      line-height: 1.4;
      color: var(--text-primary);
      max-height: 160px;
      overflow: hidden;
      flex: 1;
      min-height: 0;
    }

    .dialog-details strong {
      color: var(--text-danger);
      font-weight: 600;
      display: block;
      margin-bottom: 8px;
      font-size: 13px;
    }

    .dialog-details ul {
      margin: 8px 0;
      padding-left: 16px;
    }

    .dialog-details li {
      margin-bottom: 4px;
    }

    .dialog-details p {
      margin-top: 8px;
      font-style: italic;
      color: var(--text-secondary);
      font-size: 11px;
      line-height: 1.3;
    }

    .dialog-buttons {
      display: flex;
      gap: 16px;
      justify-content: flex-end;
      padding-top: 12px;
      border-top: 1px solid var(--border-color);
      margin-top: auto;
      flex-shrink: 0;
    }

    .dialog-btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 90px;
      position: relative;
      z-index: 10;
    }

    .dialog-btn:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    .btn-cancel {
      background: var(--cancel-bg);
      color: white;
      border: 2px solid var(--cancel-bg);
    }

    .btn-cancel:hover:not(:disabled) {
      background: var(--cancel-hover);
      border-color: var(--cancel-hover);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .btn-confirm {
      background: var(--confirm-disabled);
      color: white;
      position: relative;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border: 2px solid transparent;
    }

    .btn-confirm:not(:disabled) {
      background: var(--confirm-bg);
      border-color: var(--confirm-bg);
      box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.2);
    }

    .btn-confirm:hover:not(:disabled) {
      background: var(--confirm-hover);
      border-color: var(--confirm-hover);
      box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.3), 0 4px 12px rgba(220, 38, 38, 0.2);
      transform: translateY(-1px);
    }

    .countdown {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--confirm-disabled);
      border-radius: 6px;
      font-weight: 600;
      transition: opacity 0.3s ease;
      border: 2px solid transparent;
    }

    .countdown.hidden {
      opacity: 0;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div class="dialog-container">
    <div class="dialog-content">
      <div class="dialog-header">
        <div class="dialog-icon"></div>
        <h3 class="dialog-title">确认系统重置</h3>
      </div>
      
      <div class="dialog-message">
        此操作将清理所有本地数据并重启应用程序
      </div>
      
      <div class="dialog-details">
        <strong>警告：此操作无法撤销</strong>
        <ul>
          <li>清空所有本地存储数据（localStorage）</li>
          <li>清空所有会话存储数据（sessionStorage）</li>
          <li>清空所有 Cookie 数据</li>
          <li>关闭所有窗口并重启应用</li>
        </ul>
        <p>重启后将返回到应用主页，所有当前状态将丢失。</p>
      </div>
      
      <div class="dialog-buttons">
        <button class="dialog-btn btn-cancel" onclick="cancel()">取消</button>
        <button class="dialog-btn btn-confirm" id="confirmBtn" disabled onclick="confirm()">
          <span class="countdown" id="countdown">确认重置 (5)</span>
          <span>确认重置</span>
        </button>
      </div>
    </div>
  </div>

  <script>
    let countdownInterval;
    let remainingTime = 5;

    function startCountdown() {
      const countdownElement = document.getElementById('countdown');
      const confirmBtn = document.getElementById('confirmBtn');
      
      countdownInterval = setInterval(() => {
        remainingTime--;
        countdownElement.textContent = \`确认重置 (\${remainingTime})\`;
        
        if (remainingTime <= 0) {
          clearInterval(countdownInterval);
          countdownElement.classList.add('hidden');
          confirmBtn.disabled = false;
        }
      }, 1000);
    }

    function confirm() {
      console.log('Confirm button clicked');
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
      console.log('DIALOG_RESULT:confirm');
    }

    function cancel() {
      console.log('Cancel button clicked');
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
      console.log('DIALOG_RESULT:cancel');
    }

    // 页面加载完成后开始倒计时
    document.addEventListener('DOMContentLoaded', () => {
      // Mac系统调试信息
      console.log('Dialog loaded on platform:', navigator.platform);
      console.log('User agent:', navigator.userAgent);
      
      startCountdown();
      
      // Mac系统特殊处理：移除可能的边框和确保样式正确
      if (navigator.platform.includes('Mac')) {
        // 确保整个文档没有边框
        document.documentElement.style.cssText += \`
          border: none !important;
          outline: none !important;
          background: transparent !important;
          -webkit-appearance: none !important;
        \`;
        
        document.body.style.cssText += \`
          border: none !important;
          outline: none !important;
          background: transparent !important;
          -webkit-appearance: none !important;
          margin: 0 !important;
          padding: 0 !important;
        \`;
        
        // 应用毛玻璃背景到dialog-content
        const dialogContent = document.querySelector('.dialog-content');
        if (dialogContent) {
          dialogContent.style.cssText += \`
            background: rgba(255, 255, 255, 0.95) !important;
            -webkit-backdrop-filter: blur(20px) !important;
            backdrop-filter: blur(20px) !important;
            border: 1px solid rgba(255, 255, 255, 0.3) !important;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
          \`;
        }
        
        console.log('Applied Mac-specific styling without borders');
      }
      
      // 拦截所有可能的快捷键
      document.addEventListener('keydown', (e) => {
        // 阻止刷新、后退、前进等浏览器快捷键
        if (
          (e.ctrlKey && (e.key === 'r' || e.key === 'R')) ||
          (e.metaKey && (e.key === 'r' || e.key === 'R')) ||
          e.key === 'F5' ||
          (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) ||
          (e.ctrlKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) ||
          (e.metaKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) ||
          (e.ctrlKey && e.key === 'w') ||
          (e.metaKey && e.key === 'w') ||
          (e.ctrlKey && e.key === 't') ||
          (e.metaKey && e.key === 't')
        ) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      });
    });

    // 处理ESC键
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        cancel();
      }
    });
  </script>
</body>
</html>`;
  }

  /**
   * 显示启动页窗口
   */
  showStartupWindow(callback) {
    const { BrowserWindow } = require('electron');
    
    // 获取完整的 index.html 内容
    const startupHTML = this.getStartupHTML();
    
    // 防止回调函数被多次调用
    let callbackCalled = false;
    const safeCallback = () => {
      if (!callbackCalled && callback && typeof callback === 'function') {
        callbackCalled = true;
        callback();
      }
    };
    
    // 创建无框启动页窗口
    const startupWindow = new BrowserWindow({
      width: 1000,
      height: 600,
      frame: false, // 无框窗口
      resizable: false,
      alwaysOnTop: true,
      center: true,
      show: false, // 先不显示，等内容加载完成后再显示
      transparent: true, // 启用透明窗口
      backgroundColor: 'rgba(0,0,0,0)', // 设置透明背景
      hasShadow: false, // 禁用窗口阴影
      skipTaskbar: true, // 不在任务栏显示
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        devTools: false,
        backgroundThrottling: false // 防止背景节流
      }
    });

    // 加载启动页内容
    const startupDataURL = `data:text/html;charset=utf-8,${encodeURIComponent(startupHTML)}`;
    
    startupWindow.loadURL(startupDataURL);
    
    // 内容加载完成后显示窗口
    startupWindow.webContents.once('dom-ready', () => {
      // 确保窗口完全透明
      if (process.platform === 'win32') {
        // Windows平台的额外透明设置
        startupWindow.setBackgroundColor('rgba(0,0,0,0)');
      }
      
      // 设置窗口圆角形状 - 通过CSS clip-path实现
      startupWindow.webContents.executeJavaScript(`
        // 创建一个遮罩层来隐藏直角边缘
        const mask = document.createElement('div');
        mask.style.cssText = \`
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          pointer-events: none;
          z-index: 9999;
          background: transparent;
          -webkit-clip-path: polygon(
            12px 0%, calc(100% - 12px) 0%, 
            100% 12px, 100% calc(100% - 12px), 
            calc(100% - 12px) 100%, 12px 100%, 
            0% calc(100% - 12px), 0% 12px
          );
          clip-path: polygon(
            12px 0%, calc(100% - 12px) 0%, 
            100% 12px, 100% calc(100% - 12px), 
            calc(100% - 12px) 100%, 12px 100%, 
            0% calc(100% - 12px), 0% 12px
          );
        \`;
        
        // 设置body的clip-path来创建圆角效果
        document.body.style.cssText += \`
          -webkit-clip-path: inset(0 round 12px);
          clip-path: inset(0 round 12px);
          border-radius: 12px;
          overflow: hidden;
        \`;
        
        document.documentElement.appendChild(mask);
      `).catch(() => {});
      
      startupWindow.show();
      
      // 3秒后关闭启动页窗口并立即开启主窗口
      setTimeout(() => {
        try {
          startupWindow.close();
          // 立即触发主窗口重启
          safeCallback();
        } catch (e) {
          // 窗口可能已经关闭，静默处理错误
          safeCallback();
        }
      }, 5000);
    });

    // 处理窗口关闭事件 - 作为备用机制
    startupWindow.on('closed', () => {
      // 确保回调一定会被调用
      safeCallback();
    });

    return startupWindow;
  }

  /**
   * 获取启动页 HTML 内容
   */
  getStartupHTML() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SDUT OJ 竞赛客户端启动页</title>
  </head>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      user-select: none; /* 禁止选中 */
      --left-vw: 7vw;
      --org-text-size: 3vw;
      --product-text-size: 6vw;
      --version-text-size: 2vw;
    }

    :root {
      --bg-primary: #0d1117;
      --bg-secondary: #21262d;
      --bg-tertiary: #5b5f64;
      --text-primary: #f0f6fc;
      --text-secondary: #8b949e;
      --accent-color: rgba(255, 255, 255, 0.08);
      --shadow-color: rgba(0, 0, 0, 0.4);
      --border-color: rgba(139, 148, 158, 0.4); /* 增强边框可见度 */
    }

    @media (prefers-color-scheme: light) {
      :root {
        --bg-primary: #ffffff;
        --bg-secondary: #eff2f5;
        --bg-tertiary: #87929f;
        --text-primary: #1f2837;
        --text-secondary: #475569;
        --accent-color: rgba(59, 130, 246, 0.15);
        --shadow-color: rgba(15, 23, 42, 0.2);
        --border-color: rgba(71, 85, 105, 0.4); /* 浅色主题下的边框 */
      }
    }

    html, body {
      height: 100%;
      width: 100%;
      font-family: "Segoe UI", "Helvetica Neue", sans-serif;
      background: transparent; /* 让html/body透明，让container处理背景 */
      color: var(--text-primary);
      overflow: hidden;
      line-height: 1.5;
      margin: 0;
      padding: 0;
      border: none;
      outline: none;
      border-radius: 12px; /* 确保根元素也有圆角 */
    }

    .container {
      position: relative;
      width: 100%; /* 完全填充窗口 */
      height: 100%; /* 完全填充窗口 */
      margin: 0; /* 移除边距 */
      padding: var(--left-vw);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border-radius: 12px;
      overflow: hidden;
      background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 50%, var(--bg-tertiary) 100%);
      background-size: 200% 200%;
      border: 2px solid var(--border-color); /* 添加边框用于区分 */
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
      transition: background 0.3s ease;
      animation: gradientShift 6s ease-in-out infinite alternate;
    }

    .container::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, transparent 0%, var(--accent-color) 50%, transparent 100%), radial-gradient(ellipse at center, transparent 60%, var(--accent-color) 100%);
      pointer-events: none;
      z-index: -1;
      transition: background 0.3s ease;
      animation: backgroundPulse 8s ease-in-out infinite alternate;
      border-radius: 12px;
    }

    @media (prefers-color-scheme: light) {
      .container::before {
        background: linear-gradient(135deg, transparent 0%, rgba(59, 130, 246, 0.12) 30%, rgba(147, 51, 234, 0.08) 60%, transparent 90%), radial-gradient(ellipse at 30% 70%, rgba(236, 72, 153, 0.1) 0%, transparent 60%), radial-gradient(ellipse at 70% 30%, rgba(34, 197, 94, 0.08) 0%, transparent 50%);
      }
    }

    .org, .product-text, .version {
      opacity: 0;
      transform: translateY(30px);
      color: var(--text-primary);
      transition: color 0.3s ease;
    }

    .org {
      display: flex;
      align-items: center;
      animation: fadeInUp 1s ease forwards;
    }

    .org svg {
      height: 3.5vw;
      width: auto;
      margin-right: 1vw;
      filter: drop-shadow(0 2px 4px var(--shadow-color));
      transition: filter 0.3s ease;
    }

    .product {
      display: flex;
      flex-direction: column;
      justify-content: start;
      align-items: start;
    }

    .product-text {
      animation: fadeInUp 1s ease forwards;
      animation-delay: 0.3s;
    }

    .org-text {
      font-size: var(--org-text-size);
      font-weight: 600;
      color: var(--text-primary);
      text-shadow: 0 1px 3px var(--shadow-color);
      transition: color 0.3s ease, text-shadow 0.3s ease;
      letter-spacing: 0.02em;
    }

    .product-text {
      font-size: var(--product-text-size);
      font-weight: 700;
      display: flex;
      flex-direction: column;
      align-items: start;
      text-align: center;
      color: var(--text-primary);
      text-shadow: 0 1px 3px var(--shadow-color);
      transition: color 0.3s ease, text-shadow 0.3s ease;
    }

    .version {
      font-size: var(--version-text-size);
      font-weight: 300;
      color: var(--text-secondary);
      transition: color 0.3s ease;
      opacity: 0;
      transform: translateY(30px);
      animation: fadeInUpVersion 1s ease forwards;
      animation-delay: 0.6s;
    }

    @media (prefers-color-scheme: light) {
      .org-text, .product-text {
        text-shadow: 0 1px 2px var(--shadow-color);
      }
    }

    @media (max-width: 768px) {
      .org svg { height: 8vw; }
      .org-text { font-size: 5vw; }
      .product-text { font-size: 8vw; }
    }

    @keyframes fadeInUp {
      0% { opacity: 0; transform: translateY(30px); }
      100% { opacity: 1; transform: translateY(0); }
    }

    @keyframes fadeInUpVersion {
      0% { opacity: 0; transform: translateY(30px); }
      100% { opacity: 0.85; transform: translateY(0); }
    }

    @keyframes backgroundPulse {
      0% { transform: scale(1) rotate(0deg); opacity: 0.8; }
      25% { transform: scale(1.05) rotate(1deg); opacity: 0.9; }
      50% { transform: scale(1.1) rotate(0deg); opacity: 1; }
      75% { transform: scale(1.05) rotate(-1deg); opacity: 0.9; }
      100% { transform: scale(1) rotate(0deg); opacity: 0.8; }
    }

    @keyframes gradientShift {
      0% { background-position: 0% 50%; }
      25% { background-position: 50% 0%; }
      50% { background-position: 100% 50%; }
      75% { background-position: 50% 100%; }
      100% { background-position: 0% 50%; }
    }
  </style>
  <body>
    <div class="container">
      <div class="org">
        <svg width="42" height="42" viewBox="0 0 256 256" style="margin-right: 1vw; filter: drop-shadow(0 2px 4px var(--shadow-color));">
          <path fill="#5386B9" d="M110.5,226.6L110.5,226.6H13.3c-8.1,0-13.2-9-8.7-15.9l0,0l21.6-33.3l9.3-14.4h25.8c8.1,0,14.4,6.6,14.4,14.4l0,0H46.3l-21.6,33.3H94C103.3,210.7,110.5,217.9,110.5,226.6z"/>
          <path fill="#F1CF43" d="M176.6,96h-11.1c-6.6,0-12.9-3.3-16.5-9L127,53.4l-23.1,35.7c-2.7,4.2-7.5,6.6-12.3,6.6H79.3l37.8-58.2l2.1-3.3c4.2-6.3,13.5-6.3,17.7,0l1.5,2.1L176.6,96z"/>
          <path fill="#AF3D2F" d="M176.6,210.7h52.5l-52.2-80.4l-48.9,56.1l-50.1-57l-8.7,13.5c-4.2,6.6-11.4,10.5-19.2,10.5h-8.1l25.8-39.6l0,0l3-4.5c1.5-2.1,3.9-3.6,6.3-3.6h0.3c2.4,0,4.8,1.2,6,3.3l45,49.2l44.4-49.5c1.2-2.1,3.6-3.3,6-3.3l0,0c2.4,0,4.5,1.2,6,3.3l3,4.8l63,97.3l0.9,1.5c3.9,6.3-0.3,14.4-7.8,14.4h-83.7l0,0C160.7,217.9,167.6,210.7,176.6,210.7z"/>
        </svg>
        <div class="org-text">SDUTACM</div>
      </div>
      <div class="product">
        <div class="product-text">
          <p>SDUT OJ</p>
          <p>Competition Side Client</p>
        </div>
        <p class="version">version 1.0.0</p>
      </div>
    </div>
  </body>
</html>`;
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
          // 主页 Option+Cmd+H
          if (input.meta && input.alt && !input.shift && !input.control && input.key.toUpperCase() === 'H') {
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
          <button class="toolbar-btn" data-action="clean" title="系统重置">
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
