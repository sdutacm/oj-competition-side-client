const { BrowserView } = require('electron');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const PlatformHelper = require('./platformHelper');
class ToolbarManager {
  constructor(mainWindow, onActionCallback, startupManager = null) {
    this.mainWindow = mainWindow;
    this.toolbarView = null;
    this.onActionCallback = onActionCallback;
    this.startupManager = startupManager;
    this.startupStateFile = path.join(app.getPath('userData'), 'startup-state.json');
  }

  /**
   * 检查是否需要显示启动窗口
   */
  shouldShowStartupWindow() {
    try {
      if (!fs.existsSync(this.startupStateFile)) {
        return true;
      }

      const state = JSON.parse(fs.readFileSync(this.startupStateFile, 'utf8'));
      return state.showStartupOnNextLaunch === true;
    } catch (error) {
      console.error('Error reading startup state:', error);
      return true;
    }
  }

  /**
   * 标记启动窗口已显示，后续启动不再显示
   */
  markStartupShown() {
    try {
      const state = {
        showStartupOnNextLaunch: false,
        lastShownTime: Date.now()
      };
      fs.writeFileSync(this.startupStateFile, JSON.stringify(state, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving startup state:', error);
    }
  }

  /**
   * 标记下次启动需要显示启动窗口（重置后调用）
   */
  markShowStartupOnNextLaunch() {
    try {
      const state = {
        showStartupOnNextLaunch: true,
        resetTime: Date.now()
      };
      fs.writeFileSync(this.startupStateFile, JSON.stringify(state, null, 2), 'utf8');
    } catch (error) {
      console.error('Error marking startup for next launch:', error);
    }
  }

  /**
   * 处理应用启动逻辑 - 决定是否显示启动窗口
   * @param {Function} onStartupComplete 启动完成后的回调
   */
  handleAppStartup(onStartupComplete) {
    if (this.shouldShowStartupWindow()) {
      console.log('显示启动窗口 - 第一次启动或重置后启动');
      this.showStartupWindow(() => {
        console.log('启动窗口显示完成');
        if (onStartupComplete) onStartupComplete();
      });
    } else {
      console.log('跳过启动窗口 - 非第一次启动');
      if (onStartupComplete) onStartupComplete();
    }
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
    const { getAppVersion } = require('./versionHelper');
    const customUserAgent = `${defaultUserAgent} SDUTOJCompetitionSideClient/${getAppVersion()}`;
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
              const { BrowserWindow, app } = require('electron');

              // 显示同步确认对话框
              const currentWindow = BrowserWindow.getFocusedWindow() || this.mainWindow;

              // 创建带倒计时的自定义对话框
              const isMac = process.platform === 'darwin';
              const confirmWindow = new BrowserWindow({
                width: 460,
                height: 400,
                frame: false, // 完全无框
                resizable: false,
                center: true,
                modal: true, // 设为模态，阻止父窗口交互，自动在父窗口之上
                parent: currentWindow,
                show: false, // 重要：先不显示，等内容完全加载后再显示
                transparent: true, // 所有平台都启用透明
                backgroundColor: 'rgba(0,0,0,0)', // 所有平台都使用完全透明背景
                skipTaskbar: false, // 允许在任务栏显示
                focusable: true,
                level: 'modal-panel', // 设置窗口层级为模态面板层级
                titleBarStyle: isMac ? 'hidden' : undefined, // Mac使用hidden而不是customButtonsOnHover
                trafficLightPosition: undefined, // 移除交通灯位置设置，避免闪烁
                hasShadow: !isMac, // Mac上禁用阴影，其他系统启用
                thickFrame: false, // 禁用厚边框
                webPreferences: {
                  nodeIntegration: false,
                  contextIsolation: true,
                  devTools: false
                }
              });

              let dialogResult = false;

              // 先设置console-message监听器，确保在对话框加载前就准备好
              confirmWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
                console.log('[Dialog Console]', message);
                if (message.startsWith('DIALOG_RESULT:')) {
                  const result = message.replace('DIALOG_RESULT:', '');
                  dialogResult = (result === 'confirm');
                  confirmWindow.close();
                } else if (message.startsWith('REQUEST_LOGOUT:')) {
                  // 处理登出请求 - 创建隐藏窗口发送请求
                  const requestId = message.replace('REQUEST_LOGOUT:', '');
                  console.log(`Received logout request: ${requestId}`);

                  this.performLogoutInHiddenWindow(requestId, confirmWindow);
                }
              });

              // 创建确认对话框HTML
              const confirmHTML = this.getConfirmDialogHTML();
              const confirmDataURL = `data:text/html;charset=utf-8,${encodeURIComponent(confirmHTML)}`;

              confirmWindow.loadURL(confirmDataURL);

              // 监听对话框DOM准备就绪
              confirmWindow.webContents.once('dom-ready', () => {
                // 确保CSS完全加载后再显示窗口，避免闪烁
                setTimeout(() => {
                  // 确保所有平台窗口完全透明且无边框
                  confirmWindow.setVisibleOnAllWorkspaces(false); // 不在所有工作区显示
                  // 强制设置窗口完全透明背景
                  confirmWindow.setBackgroundColor('rgba(0,0,0,0)');
                  // Mac系统额外处理
                  if (isMac) {
                    // 移除窗口阴影和边框
                    try {
                      confirmWindow.setHasShadow(false);
                    } catch (e) {
                      // 静默处理可能的API错误
                    }
                  }

                  confirmWindow.show();
                  confirmWindow.focus();
                }, 100); // 延迟100ms确保CSS完全应用
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
                    `).catch(() => { });
                    // 清理 session cookies
                    try {
                      win.webContents.session.clearStorageData({ storages: ['cookies'] });
                    } catch (e) { }
                  }
                });
                // 标记下次启动需要显示启动窗口
                if (this.startupManager) {
                  // 使用传入的 startupManager 实例
                  this.startupManager.markShowStartupOnNextLaunch();

                  // 所有平台统一处理：先显示启动窗口，再关闭其他窗口，确保应用程序连续性
                  // 先创建并显示启动窗口
                  const startupWin = this.startupManager.showStartupWindow(() => {
                    // 启动页关闭后重启主窗口
                    if (app && app.emit) {
                      app.emit('reopen-main-window');
                    }
                  });

                  // 等待启动窗口显示后再关闭其他窗口
                  startupWin.once('show', () => {
                    // 延迟关闭，确保启动窗口已完全显示，避免闪烁
                    const delay = process.platform === 'linux' ? 200 : 100; // Linux需要更长延迟
                    setTimeout(() => {
                      allWindows.forEach(win => {
                        if (win !== startupWin) {
                          try { win.close(); } catch (e) { }
                        }
                      });
                    }, delay);
                  });
                } else {
                  // 兼容性逻辑：如果没有传入 startupManager，使用本地方法
                  this.markShowStartupOnNextLaunch();

                  // 所有平台统一处理
                  // 先创建并显示启动窗口
                  const startupWin = this.showStartupWindow(() => {
                    // 启动页关闭后重启主窗口
                    if (app && app.emit) {
                      app.emit('reopen-main-window');
                    }
                  });

                  // 等待启动窗口显示后再关闭其他窗口
                  startupWin.once('show', () => {
                    // 延迟关闭，确保启动窗口已完全显示，避免闪烁
                    const delay = process.platform === 'linux' ? 200 : 100; // Linux需要更长延迟
                    setTimeout(() => {
                      allWindows.forEach(win => {
                        if (win !== startupWin) {
                          try { win.close(); } catch (e) { }
                        }
                      });
                    }, delay);
                  });
                }
              });
            }
          }
        } else if (message === 'UPDATE_CHECK_REQUESTED') {
          // 处理更新检测请求
          this.showUpdateWindow();
        }
      });
    });

    return this.toolbarView;
  }

  /**
   * 在隐藏窗口中执行登出请求
   */
  performLogoutInHiddenWindow(requestId, dialogWindow) {
    const { BrowserWindow } = require('electron');

    // 创建隐藏的登出窗口
    const logoutWindow = new BrowserWindow({
      width: 1,
      height: 1,
      show: false, // 隐藏窗口
      webSecurity: true,
      nodeIntegration: false,
      contextIsolation: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true
      }
    });

    console.log('Creating hidden logout window...');

    // 加载登录页面以获取 cookies 和 CSRF token
    logoutWindow.loadURL('https://op.sdutacm.cn/onlinejudge3/').then(() => {
      console.log('Hidden window loaded, attempting logout...');

      // 等待页面完全加载后执行登出
      setTimeout(() => {
        logoutWindow.webContents.executeJavaScript(`
          (async function() {
            console.log('Starting logout process in hidden window...');
            
            try {
              // 获取 CSRF token
              let csrfToken = null;
              
              // 1. 从cookie获取 csrfToken
              const allCookies = document.cookie;
              console.log('Hidden window cookies:', allCookies);
              
              if (allCookies) {
                const cookies = allCookies.split(';');
                for (let cookie of cookies) {
                  const trimmedCookie = cookie.trim();
                  const equalIndex = trimmedCookie.indexOf('=');
                  if (equalIndex === -1) continue;
                  
                  const name = trimmedCookie.substring(0, equalIndex).trim();
                  const value = trimmedCookie.substring(equalIndex + 1).trim();
                  
                  if (name === 'csrfToken') {
                    csrfToken = decodeURIComponent(value);
                    console.log('Found csrfToken in hidden window:', csrfToken);
                    break;
                  }
                }
              }
              
              if (!csrfToken) {
                // 2. 从meta标签获取
                const metaToken = document.querySelector('meta[name="csrf-token"]') || 
                                 document.querySelector('meta[name="csrf_token"]') ||
                                 document.querySelector('meta[name="_token"]');
                if (metaToken) {
                  csrfToken = metaToken.getAttribute('content');
                  console.log('Found CSRF token in hidden window meta tag:', csrfToken);
                }
              }
              
              if (!csrfToken) {
                console.warn('No CSRF token found in hidden window');
                return { success: false, error: 'NO_TOKEN', message: '未找到CSRF令牌，可能未登录' };
              }
              
              // 发送登出请求
              console.log('Sending logout request with token:', csrfToken);
              const response = await fetch('https://op.sdutacm.cn/onlinejudge3/api/logout', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-CSRF-Token': csrfToken
                },
                credentials: 'include'
              });
              
              console.log('Logout response status:', response.status);
              
              if (!response.ok) {
                return { 
                  success: false, 
                  error: 'HTTP_ERROR', 
                  status: response.status,
                  message: \`登出请求失败，HTTP状态: \${response.status}\`
                };
              }
              
              const data = await response.json();
              console.log('Logout response data:', data);
              
              if (data && data.success === true) {
                return { success: true, message: '登出成功' };
              } else {
                return { 
                  success: false, 
                  error: 'API_ERROR', 
                  data: data,
                  message: '登出API返回失败状态'
                };
              }
              
            } catch (error) {
              console.error('Logout error in hidden window:', error);
              
              if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                return { 
                  success: false, 
                  error: 'NETWORK_ERROR', 
                  message: '网络连接失败'
                };
              } else {
                return { 
                  success: false, 
                  error: 'UNKNOWN_ERROR', 
                  message: error.message || '未知错误'
                };
              }
            }
          })()
        `).then(result => {
          console.log('Logout result from hidden window:', result);

          // 关闭隐藏窗口
          logoutWindow.close();

          // 将结果发送回对话框
          dialogWindow.webContents.executeJavaScript(`
            if (window.handleLogoutResponse) {
              window.handleLogoutResponse('${requestId}', ${JSON.stringify(result)});
            }
          `).catch(err => {
            console.error('Error sending logout response to dialog:', err);
          });

        }).catch(err => {
          console.error('Error executing logout script in hidden window:', err);

          // 关闭隐藏窗口
          logoutWindow.close();

          // 发送错误结果
          const errorResult = {
            success: false,
            error: 'SCRIPT_ERROR',
            message: '执行登出脚本时出错'
          };

          dialogWindow.webContents.executeJavaScript(`
            if (window.handleLogoutResponse) {
              window.handleLogoutResponse('${requestId}', ${JSON.stringify(errorResult)});
            }
          `).catch(() => { });
        });
      }, 2000); // 等待2秒确保页面完全加载

    }).catch(err => {
      console.error('Error loading hidden logout window:', err);

      // 关闭隐藏窗口
      logoutWindow.close();

      // 发送错误结果
      const errorResult = {
        success: false,
        error: 'LOAD_ERROR',
        message: '无法加载登出页面'
      };

      dialogWindow.webContents.executeJavaScript(`
        if (window.handleLogoutResponse) {
          window.handleLogoutResponse('${requestId}', ${JSON.stringify(errorResult)});
        }
      `).catch(() => { });
    });

    // 设置超时，防止窗口长时间未响应
    setTimeout(() => {
      if (!logoutWindow.isDestroyed()) {
        console.warn('Logout window timeout, closing...');
        logoutWindow.close();

        const timeoutResult = {
          success: false,
          error: 'TIMEOUT',
          message: '登出请求超时'
        };

        dialogWindow.webContents.executeJavaScript(`
          if (window.handleLogoutResponse) {
            window.handleLogoutResponse('${requestId}', ${JSON.stringify(timeoutResult)});
          }
        `).catch(() => { });
      }
    }, 15000); // 15秒超时
  }

  /**
   * 获取确认对话框HTML内容
   */
  getConfirmDialogHTML() {
    // 检测是否为Windows系统
    const isWindows = PlatformHelper.isWindows();
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>确认系统重置</title>
  <style>
    /* 预加载样式，确保窗口显示前就有正确的透明背景 */
    html, body {
      background: transparent !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      outline: none !important;
      overflow: hidden !important;
      box-shadow: none !important;
    }
    
    /* 防止body和html出现白色边框，但允许对话框内容有边框 */
    html, body {
      border-color: transparent !important;
      outline-color: transparent !important;
    }
  </style>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      user-select: none;
    }

  /* 与更新弹窗统一的基础主题变量（纯色卡片） */
    :root {
      --bg-primary: #fcfcfc;
      --bg-secondary: #f3f4f6;
      --text-primary: #1e293b;
      --text-secondary: #64748b;
      --text-danger: #dc2626;
      --border-color: rgba(140,140,140,0.2);
      --shadow-color: rgba(0,0,0,0.08);
      --danger-bg: rgba(254, 226, 226, 0.65);
      --danger-border: rgba(239, 68, 68, 0.35);
      --confirm-bg: #dc2626;
      --confirm-hover: #b91c1c;
      --confirm-disabled: #9ca3af;
      --cancel-bg: #6b7280;
      --cancel-hover: #4b5563;
  --box-shadow: 0 8px 32px rgba(0,0,0,0.12);
  --surface-bg: #fcfcfc; /* 与更新弹窗统一的卡片背景 */
  --border-ring: rgba(140,140,140,0.35);
  --card-border: rgba(0,0,0,0.08); /* 新增：内容区域细边框（亮色） */
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg-primary: #1f2937; /* 与更新弹窗暗色背景统一 */
        --bg-secondary: #111827;
        --text-primary: #f1f5f9;
        --text-secondary: #94a3b8;
        --text-danger: #ef4444;
        --border-color: rgba(156,163,175,0.25);
        --shadow-color: rgba(0,0,0,0.4);
        --danger-bg: rgba(127, 29, 29, 0.55);
        --danger-border: rgba(239, 68, 68, 0.4);
        --confirm-bg: #dc2626;
        --confirm-hover: #b91c1c;
        --confirm-disabled: #6b7280;
        --cancel-bg: #475569;
        --cancel-hover: #334155;
  --box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  --surface-bg: #1f2937; /* 与更新弹窗暗色卡片 */
  --border-ring: rgba(156,163,175,0.45);
  --card-border: rgba(255,255,255,0.10); /* 新增：内容区域细边框（暗色） */
      }
    }

    html, body {
      height: 100%;
      width: 100%;
      font-family: "Segoe UI", "Helvetica Neue", sans-serif;
      background: transparent; /* 确保透明背景，避免闪烁 */
  border-radius: ${isWindows ? '0' : '16px'}; /* Windows系统使用直角 */
  scrollbar-width: none;
  -ms-overflow-style: none;
  /* Windows 下去掉 outline，防止透明窗口外出现矩形背景 */
  outline: none !important;
      margin: 0;
      padding: 0;
      box-shadow: none; /* 移除任何阴影 */
    }

    /* Mac系统特殊处理 */
    @supports (-webkit-backdrop-filter: blur(10px)) {
      html, body {
        background: transparent; /* 保持透明，让dialog-content处理背景 */
        -webkit-backdrop-filter: none; /* 移除背景滤镜避免边框 */
        backdrop-filter: none;
        border: none !important; /* 强制移除边框 */
        outline: none !important; /* 强制移除轮廓 */
        box-shadow: none !important; /* 强制移除阴影 */
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
      border-radius: ${isWindows ? '0' : '16px'}; /* Windows系统使用直角 */
      overflow: hidden;
      scrollbar-width: none;
      -ms-overflow-style: none;
      border: none;
    }

    .dialog-container::-webkit-scrollbar {
      display: none;
    }

    .dialog-content {
      position: relative;
  /* 使用主题变量而不是硬编码颜色，确保暗色生效 */
  background: var(--bg-primary);
      border-radius: ${isWindows ? '0' : '12px'}; /* Windows系统使用直角 */
      box-shadow: 0 8px 32px rgba(0,0,0,0.2); /* 与更新弹窗一致 */
      ${isWindows ? 'border: 1px solid var(--card-border);' : ''} /* Windows系统添加边框 */
      padding: 24px;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      animation: dialogAppear 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      overflow: hidden;
      scrollbar-width: none;
      -ms-overflow-style: none;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }

    /* Windows 系统专用样式 */
    ${isWindows ? `
      html, body {
        border-radius: 0 !important;
      }
      .dialog-container {
        border-radius: 0 !important;
      }
      .dialog-content {
        border-radius: 0 !important;
        border: 1px solid var(--card-border) !important;
      }
    ` : ''}

    /* Mac系统特殊处理 - 使用毛玻璃效果 */
    @supports (-webkit-backdrop-filter: blur(10px)) {
      .dialog-content {
        /* 仍保持纯色，避免恢复毛玻璃半透明 */
        background: var(--bg-primary) !important;
	border: 1px solid var(--card-border) !important; /* 保持细边框 */
        box-shadow: 0 8px 32px rgba(0,0,0,0.2) !important;
        border-radius: ${isWindows ? '0 !important' : '12px !important'}; /* Windows系统强制直角 */
      }
    }

    /* 全局暗色模式下卡片背景与阴影加深（独立于 @supports，确保生效） */
    @media (prefers-color-scheme: dark) {
      .dialog-content {
        background: var(--bg-primary) !important;
        box-shadow: 0 8px 32px rgba(0,0,0,0.4) !important;
        border-radius: ${isWindows ? '0 !important' : '12px !important'}; /* Windows系统强制直角 */
      }
      
      /* Windows 暗色模式专用边框 */
      ${isWindows ? `
        .dialog-content {
          border: 1px solid #4b5563 !important;
        }
      ` : ''}
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
      justify-content: center;
      margin-bottom: 14px;
      padding-bottom: 10px;
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
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-primary);
      font-size: 15px;
      line-height: 1.3;
      margin-bottom: 16px;
      font-weight: 500;
      flex-shrink: 0;
    }

    .dialog-details {
      background: transparent;
      border: 2px solid var(--danger-border);
      border-radius: 12px;
      padding: 14px;
      // margin-bottom: 18px;
      font-size: 12px;
      line-height: 1.4;
      color: var(--text-primary);
      max-height: 190px;
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
      justify-content: center;
      align-items: center;
      padding-top: 12px;
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

    /* 按钮内文本状态管理 */
    .btn-confirm .normal-text,
    .btn-confirm .loading-text {
      transition: opacity 0.3s ease;
    }
    
    .btn-confirm .loading-text {
      display: none;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    
    .btn-confirm.loading .normal-text {
      display: none;
    }
    
    .btn-confirm.loading .loading-text {
      display: flex;
    }

    /* Loading 动画样式 */
    .loading-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top: 2px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* 错误提示样式 */
    .error-message {
      color: var(--text-danger);
      font-size: 12px;
      background: var(--danger-bg);
      border: 1px solid var(--danger-border);
      border-radius: 8px;
      padding: 8px 12px;
      margin-top: 8px;
      display: none;
    }

    .error-message.show {
      display: block;
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
        此操作将清空所有本地数据并重启应用程序
      </div>
      
      <div class="dialog-details">
        <strong>警告：此操作无法撤销</strong>
        <ul>
          <li>登出账号</li>
          <li>清空所有本地存储数据</li>
          <li>清空所有会话存储数据</li>
          <li>清空所有 Cookie 数据</li>
          <li>关闭所有窗口并重启应用</li>
        </ul>
        <p>重启后将返回到应用主页，所有当前状态将丢失。</p>
      </div>
      
      <div class="dialog-buttons">
        <button class="dialog-btn btn-cancel" onclick="cancel()">取消</button>
        <button class="dialog-btn btn-confirm" id="confirmBtn" disabled onclick="confirm()">
          <span class="countdown" id="countdown">确认重置 (5)</span>
          <span class="normal-text">确认重置</span>
          <span class="loading-text" id="loadingText">
            <span class="loading-spinner"></span>
            <span class="loading-message">正在退出登录...</span>
          </span>
        </button>
        <div class="error-message" id="errorMessage"></div>
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
      
      // 显示loading动画
      showLoading('正在退出登录...');
      
      // 先尝试登出用户
      logoutUser()
        .then(success => {
          console.log('Logout completed, success:', success);
          if (success) {
            // 登出成功，继续重置操作
            hideLoading();
            console.log('Logout successful, proceeding with reset');
            console.log('DIALOG_RESULT:confirm');
          } else {
            // 登出失败，显示错误信息但仍然允许重置
            hideLoading();
            console.log('Logout failed, but proceeding with reset anyway');
            showError('登出失败，但将继续重置本地数据');
            // 给用户2秒时间看到错误信息，然后继续重置
            setTimeout(() => {
              console.log('DIALOG_RESULT:confirm');
            }, 2000);
          }
        })
        .catch(error => {
          // 网络错误或其他异常
          hideLoading();
          console.error('Logout error:', error);
          console.log('Logout error occurred, will show error message with delay');
          showError('登出时发生网络错误，但将继续重置本地数据');
          // 给用户2秒时间看到错误信息，然后继续重置
          setTimeout(() => {
            console.log('DIALOG_RESULT:confirm');
          }, 2000);
        });
    }

    function cancel() {
      console.log('Cancel button clicked');
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
      console.log('DIALOG_RESULT:cancel');
    }

    function showLoading(text) {
      const confirmBtn = document.getElementById('confirmBtn');
      const loadingMessage = confirmBtn?.querySelector('.loading-message');
      if (loadingMessage) {
        loadingMessage.textContent = text;
      }
      if (confirmBtn) {
        confirmBtn.classList.add('loading');
        confirmBtn.disabled = true;
      }
    }

    function hideLoading() {
      const confirmBtn = document.getElementById('confirmBtn');
      if (confirmBtn) {
        confirmBtn.classList.remove('loading');
        // 注意：不要重新启用按钮，因为重置后会关闭对话框
      }
    }

    function showError(message) {
      const errorElement = document.getElementById('errorMessage');
      if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
        
        // 3秒后自动隐藏错误信息
        setTimeout(() => {
          errorElement.classList.remove('show');
        }, 3000);
      }
    }

    async function logoutUser() {
      try {
        console.log('Starting logout process using hidden window...');
        
        // 使用隐藏窗口发送登出请求
        const result = await performLogoutRequest();
        
        if (result.success) {
          console.log('Logout successful:', result.message);
          return true;
        } else {
          console.warn('Logout failed:', result.error, result.message);
          
          // 根据错误类型决定是否需要显示错误提示
          if (result.error === 'NO_TOKEN') {
            console.log('No token found, user might not be logged in, proceeding with reset silently');
            return true; // 没有token说明可能未登录，直接继续重置，不显示错误
          } else {
            console.log('Logout error, will show error message with delay');
            return false; // 所有实际的登出错误都需要显示错误信息和延迟
          }
        }
      } catch (error) {
        console.error('Unexpected error during logout process:', error);
        return false; // 意外错误时显示错误信息和延迟
      }
    }

    function performLogoutRequest() {
      return new Promise((resolve) => {
        const requestId = 'logout-request-' + Date.now();
        
        // 设置全局响应处理器
        window.handleLogoutResponse = (id, result) => {
          if (id === requestId) {
            delete window.handleLogoutResponse;
            resolve(result);
          }
        };
        
        // 发送登出请求（添加延迟确保监听器设置完成）
        setTimeout(() => {
          console.log('REQUEST_LOGOUT:' + requestId);
        }, 500);

        // 设置超时
        setTimeout(() => {
          if (window.handleLogoutResponse) {
            delete window.handleLogoutResponse;
            resolve({
              success: false,
              error: 'TIMEOUT',
              message: '登出请求超时'
            });
          }
        }, 20000); // 20秒超时
      });
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
        
  // 之前这里有一段针对 Mac 的毛玻璃与动态 border 覆盖逻辑，会破坏统一卡片式纯色+细边框方案，现已移除。
  console.log('Mac-specific blur override removed to keep unified solid card style');
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

    // ESC键绑定已删除，仅使用按钮关闭对话框
  </script>
</body>
</html>`;
  }

  /**
   * 显示启动页窗口
   */
  showStartupWindow(callback) {
    // 只依赖 startupWindowHelper 的统一实现
    const { createStartupWindow } = require('./startupWindowHelper');
    return createStartupWindow(undefined, {
      width: 1000,
      height: 600,
      duration: 5000,
      onClose: () => {
        this.markStartupShown();
        if (typeof callback === 'function') callback();
      }
    });
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
    let backSVG, forwardSVG, refreshSVG, homeSVG, infoSVG, cleanSVG, updateSVG;

    try {
      const svgPath = PlatformHelper.joinPath(__dirname, '..', 'public', 'svg');

      backSVG = fs.readFileSync(PlatformHelper.joinPath(svgPath, 'back.svg'), 'utf8');
      forwardSVG = fs.readFileSync(PlatformHelper.joinPath(svgPath, 'forward.svg'), 'utf8');
      refreshSVG = fs.readFileSync(PlatformHelper.joinPath(svgPath, 'refresh.svg'), 'utf8');
      homeSVG = fs.readFileSync(PlatformHelper.joinPath(svgPath, 'home.svg'), 'utf8');
      infoSVG = fs.readFileSync(PlatformHelper.joinPath(svgPath, 'info.svg'), 'utf8');
      cleanSVG = fs.readFileSync(PlatformHelper.joinPath(svgPath, 'clean.svg'), 'utf8');
      updateSVG = fs.readFileSync(PlatformHelper.joinPath(svgPath, 'update.svg'), 'utf8');
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
      updateSVG = defaultSVG;
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
            /* 确保 fill 使用 currentColor 的 SVG (如 update.svg) 跟随主题 */
            color: var(--toolbar-icon-color);
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
          <button class="toolbar-btn" data-action="update" title="检查更新">
            ${updateSVG}
          </button>
          <button class="toolbar-btn" data-action="clean" title="系统重置">
            <svg class="icon" viewBox="0 0 1024 1024" width="32" height="32" stroke="none" stroke-width="0" fill="var(--toolbar-icon-color)">
              <path d="M502.714987 58.258904l-126.531056-54.617723a52.797131 52.797131 0 0 0-41.873587 96.855428A447.865322 447.865322 0 0 0 392.02307 946.707184a61.535967 61.535967 0 0 0 13.83649 1.820591 52.797131 52.797131 0 0 0 13.65443-103.773672 342.453118 342.453118 0 0 1-31.678278-651.771485l-8.374718 19.480321a52.615072 52.615072 0 0 0 27.855039 69.182448 51.522718 51.522718 0 0 0 20.572675 4.369418A52.797131 52.797131 0 0 0 476.498481 254.882703L530.205907 127.441352a52.979191 52.979191 0 0 0-27.49092-69.182448zM962.960326 509.765407A448.775617 448.775617 0 0 0 643.992829 68.090094a52.797131 52.797131 0 1 0-30.403866 101.042786A342.635177 342.635177 0 0 1 674.578753 801.059925a52.615072 52.615072 0 0 0-92.30395-50.612422l-71.913335 117.246043a52.433013 52.433013 0 0 0 17.295612 72.82363l117.063985 72.823629a52.797131 52.797131 0 1 0 54.617722-89.755123l-16.021198-10.013249A448.593558 448.593558 0 0 0 962.960326 509.765407z"></path>
            </svg>
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
            
            // 处理更新检测
            if (action === 'update') {
              // 添加动画效果
              btn.classList.add('animate');
              setTimeout(() => {
                btn.classList.remove('animate');
              }, 600);
              
              console.log('UPDATE_CHECK_REQUESTED');
            }
            
            // 为导航按钮添加动画效果
            if (action === 'back' || action === 'forward' || action === 'refresh' || action === 'home') {
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
              // 确保移除可能的动画类
              backBtn.classList.remove('animate');
            }
            if (forwardBtn) {
              forwardBtn.disabled = !canGoForward;
              // 确保移除可能的动画类
              forwardBtn.classList.remove('animate');
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

  /**
   * 显示更新检测窗口
   */
  showUpdateWindow() {
    const { BrowserWindow } = require('electron');
    
    // 获取当前窗口作为父窗口
    const currentWindow = BrowserWindow.getFocusedWindow() || this.mainWindow;
    
    // 检测平台以应用不同的窗口设置
    const isMac = process.platform === 'darwin';
    
    // 检测系统主题
    const { nativeTheme } = require('electron');
    const isDarkMode = nativeTheme.shouldUseDarkColors;
    const windowBgColor = isDarkMode ? '#1f2937' : '#ffffff';
    
    const updateWindow = new BrowserWindow({
      width: 420,
      height: 380,
      frame: false, // 完全无框
      resizable: false,
      center: true,
      modal: true, // 设为模态，阻止父窗口交互，自动在父窗口之上
      parent: currentWindow,
      show: false, // 重要：先不显示，等内容完全加载后再显示
      transparent: false, // 关闭透明，避免半透明背景
      backgroundColor: windowBgColor, // 根据系统主题设置窗口背景
      skipTaskbar: false, // 允许在任务栏显示
      focusable: true,
      level: 'modal-panel', // 设置窗口层级为模态面板层级
      titleBarStyle: isMac ? 'hidden' : undefined, // Mac使用hidden而不是customButtonsOnHover
      trafficLightPosition: undefined, // 移除交通灯位置设置，避免闪烁
      hasShadow: !isMac, // Mac上禁用阴影，其他系统启用
      thickFrame: false, // 禁用厚边框
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        devTools: false
      }
    });

    // 监听控制台消息
    updateWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      if (message === 'UPDATE_WINDOW_CLOSE') {
        updateWindow.close();
      } else if (message === 'CHECK_UPDATE_CONFIRM') {
        // 开始更新检测
        this.performUpdateCheck(updateWindow);
      } else if (message.startsWith('DOWNLOAD_UPDATE:')) {
        // 处理下载更新
        const version = message.replace('DOWNLOAD_UPDATE:', '');
        const { shell } = require('electron');
        // 使用统一的下载页面地址
        shell.openExternal('https://oj.sdutacm.cn/oj-competition-side-client/');
        updateWindow.close();
      }
    });

    // 创建更新窗口HTML
    const updateHTML = this.createUpdateWindowHTML();
    const updateDataURL = `data:text/html;charset=utf-8,${encodeURIComponent(updateHTML)}`;

    updateWindow.loadURL(updateDataURL);

    // 监听对话框DOM准备就绪
    updateWindow.webContents.once('dom-ready', () => {
      // 确保CSS完全加载后再显示窗口，避免闪烁
      setTimeout(() => {
        // 确保窗口设置
        updateWindow.setVisibleOnAllWorkspaces(false); // 不在所有工作区显示
        // 根据系统主题设置窗口背景色
        updateWindow.setBackgroundColor(windowBgColor);
        // Mac系统额外处理
        if (isMac) {
          // 移除窗口阴影和边框
          try {
            updateWindow.setHasShadow(false);
          } catch (e) {
            // 静默处理可能的API错误
          }
        }

        updateWindow.show();
        updateWindow.focus();
      }, 100); // 延迟100ms确保CSS完全应用
    });
  }

  /**
   * 执行更新检测
   */
  async performUpdateCheck(updateWindow) {
    try {
      // 显示loading状态
      updateWindow.webContents.executeJavaScript(`
        document.getElementById('updateContent').innerHTML = \`
          <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>正在检查更新...</p>
          </div>
        \`;
      `);

      // 使用全局的更新管理器检测更新
      if (global.updateManager) {
        const result = await global.updateManager.checkForUpdatesQuiet();

        if (result.error) {
          throw new Error(result.error);
        }

        if (result.hasUpdate) {
          // 显示有更新信息
          updateWindow.webContents.executeJavaScript(`
            document.getElementById('updateContent').innerHTML = \`
              <div class="result-container">
                <div class="result-icon update">🎉</div>
                <h3>发现新版本</h3>
                <p>当前版本: ${result.currentVersion}<br>最新版本: ${result.latestVersion}</p>
                <div class="update-buttons">
                  <button class="update-btn secondary" onclick="console.log('UPDATE_WINDOW_CLOSE')">稍后</button>
                  <button class="update-btn primary" onclick="console.log('DOWNLOAD_UPDATE:${result.latestVersion}')">立即下载</button>
                </div>
              </div>
            \`;
          `);
        } else if (result.skipped) {
          // 显示跳过版本信息
          updateWindow.webContents.executeJavaScript(`
            document.getElementById('updateContent').innerHTML = \`
              <div class="result-container">
                <div class="result-icon info">ℹ️</div>
                <h3>版本已跳过</h3>
                <p>当前版本: ${result.currentVersion}<br>最新版本: ${result.latestVersion}<br><br>您之前选择跳过此版本</p>
                <button class="update-btn" onclick="console.log('UPDATE_WINDOW_CLOSE')">确定</button>
              </div>
            \`;
          `);
        } else {
          // 显示无更新信息
          updateWindow.webContents.executeJavaScript(`
            document.getElementById('updateContent').innerHTML = \`
              <div class="result-container">
                <div class="result-icon success">✓</div>
                <h3>已是最新版本</h3>
                <p>当前版本: ${result.currentVersion}</p>
                <button class="update-btn" onclick="console.log('UPDATE_WINDOW_CLOSE')">确定</button>
              </div>
            \`;
          `);
        }
      } else {
        throw new Error('更新管理器未初始化');
      }
    } catch (error) {
      console.error('更新检测失败:', error);

      // 显示错误信息
      updateWindow.webContents.executeJavaScript(`
        document.getElementById('updateContent').innerHTML = \`
          <div class="result-container">
            <div class="result-icon error">✗</div>
            <h3>检查更新失败</h3>
            <p>${error.message}</p>
            <button class="update-btn" onclick="console.log('UPDATE_WINDOW_CLOSE')">确定</button>
          </div>
        \`;
      `);
    }
  }

  /**
   * 创建更新窗口HTML
   */
  createUpdateWindowHTML() {
    // 检测是否为Windows系统
    const isWindows = PlatformHelper.isWindows();
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: transparent !important;
            color: #333;
            overflow: hidden;
          }
          html {
            background: transparent !important;
          }
          

          .update-window {
            width: 420px;
            height: 380px;
            background: #ffffff;
            border-radius: ${isWindows ? '0' : '16px'};
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            ${isWindows ? 'border: 1px solid #d1d5db;' : ''}
            display: flex;
            flex-direction: column;
            position: relative;
            outline: none;
            overflow: hidden;
          }

          /* Windows 系统样式 - 直角和灰色边框 */
          @media screen {
            body.windows .update-window {
              border-radius: 0;
              border: 1px solid #d1d5db;
              box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
            }
          }

          .window-header {
            padding: 20px 20px 0 20px;
            text-align: center;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 15px;
            background: transparent;
          }

          .window-title {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 5px;
          }

          .window-subtitle {
            font-size: 14px;
            color: #6b7280;
          }

          .update-content {
            flex: 1;
            padding: 20px 20px 30px 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: transparent;
          }

          .initial-content {
            text-align: center;
          }

          .update-icon {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
          }

          .update-icon svg {
            width: 32px;
            height: 32px;
            stroke: white;
            stroke-width: 2;
          }

          .update-description {
            font-size: 14px;
            color: #6b7280;
            line-height: 1.5;
            margin-bottom: 30px;
            text-align: center;
          }

          .update-buttons {
            display: flex;
            gap: 12px;
            margin-top: 5px;
            justify-content: center;
            align-items: center;
          }

          .update-btn {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .update-btn.primary {
            background: #3b82f6;
            color: white;
          }

          .update-btn.primary:hover {
            background: #2563eb;
            transform: translateY(-1px);
          }

          .update-btn.secondary {
            background: #f3f4f6;
            color: #6b7280;
          }

          .update-btn.secondary:hover {
            background: #e5e7eb;
          }

          /* Loading 样式 */
          .loading-container {
            text-align: center;
            padding: 10px 0;
          }

          .loading-spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #e5e7eb;
            border-top: 4px solid #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 25px;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .loading-container p {
            font-size: 14px;
            color: #6b7280;
          }

          /* 结果样式 */
          .result-container {
            text-align: center;
            padding: 5px 0;
          }

          .result-icon {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            font-size: 32px;
            font-weight: bold;
          }

          .result-icon.success {
            background: #10b981;
            color: white;
          }

          .result-icon.error {
            background: #ef4444;
            color: white;
          }

          .result-icon.update {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
          }

          .result-icon.info {
            background: #f59e0b;
            color: white;
          }

          .result-container h3 {
            font-size: 16px;
            margin-bottom: 10px;
            color: #1f2937;
          }

          .result-container p {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 25px;
            line-height: 1.4;
          }

          /* 暗色主题 */
          @media (prefers-color-scheme: dark) {
            .update-window {
              background: #1f2937;
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
              ${isWindows ? 'border: 1px solid #4b5563; border-radius: 0;' : ''}
            }

            .window-header {
              border-bottom-color: #374151;
            }

            .window-title {
              color: #f9fafb;
            }

            .window-subtitle {
              color: #9ca3af;
            }

            .update-description {
              color: #9ca3af;
            }

            .update-btn.secondary {
              background: #374151;
              color: #d1d5db;
            }

            .update-btn.secondary:hover {
              background: #4b5563;
            }

            .loading-container p {
              color: #9ca3af;
            }

            .result-container h3 {
              color: #f9fafb;
            }

            .result-container p {
              color: #9ca3af;
            }
          }
        </style>
      </head>
      <body>
        <div class="update-window">
          <div class="window-header">
            <div class="window-title">检查更新</div>
            <div class="window-subtitle">Check for Updates</div>
          </div>
          <div class="update-content" id="updateContent">
            <div class="initial-content">
              <div class="update-icon">
                <svg xmlns="http://www.w3.org/2000/svg"  viewBox="0 -960 960 960"  fill="#fff"><path d="M480-120q-75 0-140.5-28.5t-114-77q-48.5-48.5-77-114T120-480q0-75 28.5-140.5t77-114q48.5-48.5 114-77T480-840q82 0 155.5 35T760-706v-94h80v240H600v-80h110q-41-56-101-88t-129-32q-117 0-198.5 81.5T200-480q0 117 81.5 198.5T480-200q105 0 183.5-68T756-440h82q-15 137-117.5 228.5T480-120Zm112-192L440-464v-216h80v184l128 128-56 56Z"/></svg>
              </div>
              <div class="update-description">
                检查是否有新版本可用，确保您使用的是最新功能和安全修复。
              </div>
              <div class="update-buttons">
                <button class="update-btn secondary" onclick="console.log('UPDATE_WINDOW_CLOSE')">
                  取消
                </button>
                <button class="update-btn primary" onclick="console.log('CHECK_UPDATE_CONFIRM')">
                  检查更新
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <script>
          // 检测平台并添加相应的CSS类
          if (navigator.userAgent.includes('Windows')) {
            document.body.classList.add('windows');
          }
        </script>
      </body>
      </html>
    `;
  }
}

module.exports = ToolbarManager;
