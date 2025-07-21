const { dialog, BrowserWindow, shell } = require('electron');
const path = require('path');

/**
 * 显示域名拦截对话框
 * @param {BrowserWindow} parentWindow - 父窗口
 * @param {string} hostname - 被拦截的域名
 * @param {string} reason - 拦截原因
 * @param {string} type - 拦截类型（可选：'redirect' | 'default'）
 * @param {Function} [callback] - 弹窗关闭后的回调
 */
function showBlockedDialog(parentWindow, hostname, reason, type = 'default', callback) {
  const messages = {
    default: [
      '哎呀~ 🚫 比赛期间不能访问这个网站哦！',
      '注意 ⚠️ 这里在比赛模式下无法打开。',
      '抱歉，比赛规则限制了该网站的访问。🛡️',
      '请专注比赛，暂时无法访问此页面。🏆',
      '当前环境仅允许访问指定网站。🔒',
      '比赛模式已开启，请专心答题！😊'
    ],
    redirect: [
      '检测到页面发生重定向，目标网站不在允许范围，已为你拦截！🚫',
      '页面重定向被拦截，保护你的比赛环境！🛡️'
    ]
  };
  const details = {
    default: [
      `目标网站：${hostname}  \n拦截原因：${reason}\n\n比赛期间只能访问指定网站，祝你取得好成绩！🏆`,
      `被拦截的网站：${hostname}  \n详细说明：${reason}\n\n请将注意力集中在比赛题目上，加油！💪`,
      `无法访问：${hostname}  \n原因说明：${reason}\n\n比赛模式下仅可使用允许的网站。😊`,
      `访问限制：${hostname}  \n限制说明：${reason}\n\n专注比赛才能发挥最佳水平！🎯`,
      `网站屏蔽：${hostname}  \n屏蔽原因：${reason}\n\n比赛环境需要保持纯净，回到题目页面继续努力吧！✨`
    ],
    redirect: [
      `检测到页面发生重定向，目标网站：${hostname} 已被系统拦截！\n原因：${reason}\n\n比赛期间请勿访问非指定网站，祝你取得好成绩！🏆`,
      `页面重定向到 ${hostname} 已被拦截，保护你的比赛环境！\n原因：${reason}\n\n继续加油！💪`
    ]
  };
  const buttons = [
    '好的，专心比赛！',
    '了解，继续答题！',
    '明白啦，回去做题！',
    '收到，加油比赛！',
    '知道了，Focus！'
  ];
  const msgArr = messages[type] || messages.default;
  const detArr = details[type] || details.default;
  const randomMessage = msgArr[Math.floor(Math.random() * msgArr.length)];
  const randomDetail = detArr[Math.floor(Math.random() * detArr.length)];
  const randomButton = buttons[Math.floor(Math.random() * buttons.length)];
  // 优化 title，使用主流 emoji，兼容三系统
  const titles = [
    '比赛模式提醒 🏅',
    '访问限制通知 🚦',
    '安全提示 🔒',
    '访问被拦截 🚫',
    '专注比赛 🏆',
    '系统提示 ℹ️'
  ];
  const randomTitle = titles[Math.floor(Math.random() * titles.length)];
  
  // Windows 系统使用自定义弹窗以支持彩色 emoji
  const isWindows = process.platform === 'win32';
  
  if (isWindows) {
    // Windows 使用自定义 HTML 弹窗
    showCustomBlockedDialog(parentWindow, randomTitle, randomMessage, randomDetail, randomButton, callback);
  } else {
    // Mac/Linux 使用原生弹窗
    const opts = {
      type: 'info',
      title: randomTitle,
      message: randomMessage,
      detail: randomDetail,
      buttons: [randomButton],
      defaultId: 0,
      icon: null
    };
    if (process.platform === 'darwin') {
      opts.message = '🚦 ' + randomMessage;
      opts.modal = true;
      opts.noLink = true;
    }
    dialog.showMessageBox(parentWindow, opts).then(() => {
      if (parentWindow && process.platform === 'darwin') {
        try { parentWindow.focus(); } catch {}
      }
      if (typeof callback === 'function') callback();
    });
  }
}

/**
 * Windows 专用的自定义拦截弹窗（支持彩色 emoji）
 */
function showCustomBlockedDialog(parentWindow, title, message, detail, buttonText, callback) {
  // 创建自定义弹窗窗口
  const dialogWindow = new BrowserWindow({
    width: 480,
    height: 340,
    parent: parentWindow,
    modal: true,
    resizable: false,
    show: false,
    frame: false, // 移除标题栏和边框
    titleBarStyle: 'hidden', // 隐藏标题栏
    closable: false, // 禁用关闭按钮
    minimizable: false, // 禁用最小化按钮
    maximizable: false, // 禁用最大化按钮
    icon: path.join(__dirname, '../public/favicon.ico'), // 设置窗口图标
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false,
    }
  });

  // 隐藏菜单栏
  dialogWindow.setMenuBarVisibility(false);

  // 异步获取 favicon 的 base64 编码
  async function getFaviconBase64() {
    try {
      const fs = require('fs');
      const path = require('path');
      const imagePath = path.join(__dirname, '../public/favicon.ico');
      const imageBuffer = fs.readFileSync(imagePath);
      return imageBuffer.toString('base64');
    } catch (error) {
      console.error('Error loading favicon:', error);
      return '';
    }
  }

  // 创建 HTML 内容
  function createDialogHTML(faviconBase64 = '') {
    const logoImg = faviconBase64 ? 
      `<img src="data:image/x-icon;base64,${faviconBase64}" alt="Logo" class="dialog-icon">` :
      '<div class="dialog-icon-fallback">⚠️</div>';

    return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: "Segoe UI", "Segoe UI Emoji", "Microsoft YaHei", "Noto Color Emoji", "Apple Color Emoji", sans-serif;
          background: var(--bg-color);
          color: var(--text-color);
          padding: 0;
          height: 100vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          /* 强制彩色 emoji */
          font-variant-emoji: emoji;
        }
        
        /* 系统主题适配 */
        :root {
          --bg-color: #ffffff;
          --container-bg: #ffffff;
          --text-color: #000000;
          --text-secondary: #666666;
          --border-color: #e0e0e0;
          --button-bg: #0078d4;
          --button-hover-bg: #106ebe;
          --detail-bg: #f8f9fa;
          --shadow-color: rgba(0, 0, 0, 0.1);
        }
        
        /* Windows 暗色主题 */
        @media (prefers-color-scheme: dark) {
          :root {
            --bg-color: #202020;
            --container-bg: #2d2d2d;
            --text-color: #ffffff;
            --text-secondary: #cccccc;
            --border-color: #404040;
            --button-bg: #0078d4;
            --button-hover-bg: #106ebe;
            --detail-bg: #353535;
            --shadow-color: rgba(0, 0, 0, 0.3);
          }
        }
        
        .dialog-container {
          background: var(--container-bg);
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border-radius: 8px; /* 添加圆角 */
          box-shadow: 0 10px 30px var(--shadow-color); /* 添加阴影 */
          border: 1px solid var(--border-color); /* 添加边框 */
          user-select: none; /* 禁止选中 */
        }
        
        .dialog-header {
          padding: 20px 20px 15px;
          border-bottom: 1px solid var(--border-color);
          flex-shrink: 0;
          border-radius: 8px 8px 0 0; /* 顶部圆角 */
          background: var(--container-bg); /* 确保背景一致 */
        }
        
        .dialog-title-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .dialog-icon {
          width: 24px;
          height: 24px;
          flex-shrink: 0;
        }
        
        .dialog-icon-fallback {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
        }
        
        .dialog-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-color);
          flex: 1;
        }
        
        .dialog-body {
          padding: 20px;
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        .dialog-message {
          font-size: 14px;
          color: var(--text-color);
          line-height: 1.5;
          flex-shrink: 0;
        }
        
        .dialog-detail {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.6;
          background: var(--detail-bg);
          padding: 12px;
          border-radius: 6px;
          white-space: pre-line;
          flex: 1;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 6;
          -webkit-box-orient: vertical;
          text-overflow: ellipsis;
        }
        
        .dialog-footer {
          padding: 15px 20px;
          border-top: 1px solid var(--border-color);
          display: flex;
          justify-content: flex-end;
          flex-shrink: 0;
          border-radius: 0 0 8px 8px; /* 底部圆角 */
          background: var(--container-bg); /* 确保背景一致 */
        }
        
        .dialog-button {
          background: var(--button-bg);
          color: white;
          border: none;
          padding: 10px 24px;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          font-family: inherit;
          transition: background-color 0.2s;
          min-width: 100px;
        }
        
        .dialog-button:hover {
          background: var(--button-hover-bg);
        }
        
        .dialog-button:active {
          transform: translateY(1px);
        }
        
        .dialog-button:focus {
          outline: 2px solid #0078d4;
          outline-offset: 2px;
        }
        
        /* 确保 emoji 显示为彩色 */
        .emoji {
          font-family: "Segoe UI Emoji", "Noto Color Emoji", "Apple Color Emoji", sans-serif;
          font-variant-emoji: emoji;
        }
        
        /* Windows 10/11 emoji 优化 */
        @media screen and (-ms-high-contrast: none) {
          body, .dialog-title, .dialog-message, .dialog-detail {
            font-family: "Segoe UI", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif;
          }
        }
        
        /* 禁用所有滚动条 */
        ::-webkit-scrollbar {
          display: none;
        }
        
        * {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
      </style>
    </head>
    <body>
      <div class="dialog-container">
        <div class="dialog-header">
          <div class="dialog-title-row">
            ${logoImg}
            <div class="dialog-title">${title}</div>
          </div>
        </div>
        <div class="dialog-body">
          <div class="dialog-message">${message}</div>
          <div class="dialog-detail">${detail}</div>
        </div>
        <div class="dialog-footer">
          <button class="dialog-button">${buttonText}</button>
        </div>
      </div>
      
      <script>
        function closeDialog() {
          console.log('CLOSE_DIALOG');
        }
        
        // ESC 键关闭
        document.addEventListener('keydown', function(event) {
          if (event.key === 'Escape') {
            closeDialog();
          }
        });
        
        // 自动聚焦按钮并绑定点击事件
        window.addEventListener('load', function() {
          const button = document.querySelector('.dialog-button');
          if (button) {
            button.focus();
            // 确保点击事件正确绑定
            button.onclick = function(e) {
              e.preventDefault();
              e.stopPropagation();
              closeDialog();
            };
            button.addEventListener('click', function(e) {
              e.preventDefault();
              e.stopPropagation();
              closeDialog();
            });
          }
        });
      </script>
    </body>
    </html>`;
  }

  // 加载 favicon 并创建窗口
  getFaviconBase64().then(faviconBase64 => {
    const htmlContent = createDialogHTML(faviconBase64);
    const dataURL = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
    dialogWindow.loadURL(dataURL);

    // 监听控制台消息
    dialogWindow.webContents.on('console-message', (event, level, message) => {
      console.log('Dialog console message:', message); // 调试日志
      if (message === 'CLOSE_DIALOG') {
        console.log('Closing dialog window'); // 调试日志
        dialogWindow.close();
      }
    });

    // 窗口关闭时的回调
    dialogWindow.on('closed', () => {
      console.log('Dialog window closed'); // 调试日志
      if (typeof callback === 'function') callback();
    });

    // 添加 IPC 通信作为备选方案
    dialogWindow.webContents.on('did-finish-load', () => {
      // 注入 IPC 通信代码
      dialogWindow.webContents.executeJavaScript(`
        // 重新定义 closeDialog 函数使用多种方式关闭
        function closeDialog() {
          console.log('CLOSE_DIALOG');
          // 尝试使用 window.close() 作为备选
          try {
            window.close();
          } catch(e) {
            console.log('window.close() failed:', e);
          }
        }
        
        // 确保按钮事件正确绑定
        document.addEventListener('DOMContentLoaded', function() {
          const button = document.querySelector('.dialog-button');
          if (button) {
            button.onclick = closeDialog;
            button.addEventListener('click', closeDialog);
          }
        });
        
        // 如果 DOM 已经加载完成，立即执行
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', function() {
            const button = document.querySelector('.dialog-button');
            if (button) {
              button.onclick = closeDialog;
              button.addEventListener('click', closeDialog);
            }
          });
        } else {
          const button = document.querySelector('.dialog-button');
          if (button) {
            button.onclick = closeDialog;
            button.addEventListener('click', closeDialog);
          }
        }
      `);
    });

    dialogWindow.once('ready-to-show', () => {
      dialogWindow.show();
    });
  }).catch(error => {
    console.error('Error creating custom dialog:', error);
    // 无图标版本
    const htmlContent = createDialogHTML();
    const dataURL = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
    dialogWindow.loadURL(dataURL);

    // 监听控制台消息
    dialogWindow.webContents.on('console-message', (event, level, message) => {
      console.log('Dialog console message (fallback):', message); // 调试日志
      if (message === 'CLOSE_DIALOG') {
        console.log('Closing dialog window (fallback)'); // 调试日志
        dialogWindow.close();
      }
    });

    // 窗口关闭时的回调
    dialogWindow.on('closed', () => {
      console.log('Dialog window closed (fallback)'); // 调试日志
      if (typeof callback === 'function') callback();
    });

    // 添加 IPC 通信作为备选方案
    dialogWindow.webContents.on('did-finish-load', () => {
      // 注入 IPC 通信代码
      dialogWindow.webContents.executeJavaScript(`
        // 重新定义 closeDialog 函数使用多种方式关闭
        function closeDialog() {
          console.log('CLOSE_DIALOG');
          // 尝试使用 window.close() 作为备选
          try {
            window.close();
          } catch(e) {
            console.log('window.close() failed:', e);
          }
        }
        
        // 确保按钮事件正确绑定
        document.addEventListener('DOMContentLoaded', function() {
          const button = document.querySelector('.dialog-button');
          if (button) {
            button.onclick = closeDialog;
            button.addEventListener('click', closeDialog);
          }
        });
        
        // 如果 DOM 已经加载完成，立即执行
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', function() {
            const button = document.querySelector('.dialog-button');
            if (button) {
              button.onclick = closeDialog;
              button.addEventListener('click', closeDialog);
            }
          });
        } else {
          const button = document.querySelector('.dialog-button');
          if (button) {
            button.onclick = closeDialog;
            button.addEventListener('click', closeDialog);
          }
        }
      `);
    });

    dialogWindow.once('ready-to-show', () => {
      dialogWindow.show();
    });
  });

  return dialogWindow;
}

/**
 * 显示系统信息窗口
 * @param {BrowserWindow} parentWindow - 父窗口
 */
function showInfoDialog(parentWindow) {
  // 根据操作系统选择图标文件
  const os = require('os');
  const platform = os.platform();
  let iconPath;

  if (platform === 'linux') {
    iconPath = path.join(__dirname, '../public/favicon.png');
  } else if (platform === 'darwin') {
    iconPath = path.join(__dirname, '../public/favicon.icns');
  } else {
    // Windows 使用 .ico 文件
    iconPath = path.join(__dirname, '../public/favicon.ico');
  }

  // 创建一个新的信息窗口
  const isMac = process.platform === 'darwin';
  const infoWindow = new BrowserWindow({
    width: 500,
    height: 580, // 增加高度以适应链接部分
    ...(isMac ? {} : { parent: parentWindow, modal: true }),
    resizable: false,
    show: false,
    icon: iconPath,
    frame: true, // 强制有原生边框和按钮
    titleBarStyle: isMac ? 'default' : undefined,
    closable: true, // 确保窗口可以关闭
    minimizable: false, // 禁用最小化按钮
    maximizable: false, // 禁用最大化按钮
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false, // 禁用开发者工具
    }
  });

  // 确保隐藏菜单栏
  infoWindow.setMenuBarVisibility(false);

  // 设置自定义 User-Agent
  const defaultUserAgent = infoWindow.webContents.getUserAgent();
  const customUserAgent = `${defaultUserAgent} SDUTOJCompetitionSideClient/1.0.0`;
  infoWindow.webContents.setUserAgent(customUserAgent);

  // 禁用信息窗口的开发者工具相关功能
  const webContents = infoWindow?.webContents;
  if (webContents) {
    // 移除禁止右键菜单的监听，恢复系统默认行为

    // 禁用开发者工具快捷键
    webContents.on('before-input-event', (event, input) => {
      // ESC 键关闭窗口（macOS 用户习惯）
      if (input.key === 'Escape') {
        infoWindow.close();
        return;
      }
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
      // Mac 下处理 info 快捷键，且只在 infoWindow 聚焦时生效
      if (process.platform === 'darwin' && webContents.isFocused && webContents.isFocused()) {
        // 系统信息 Cmd+I
        if (input.meta && !input.shift && !input.alt && !input.control && input.key.toUpperCase() === 'I') {
          require('./dialogHelper').showInfoDialog(infoWindow);
        }
      }
    });
  }

  // 异步函数获取 favicon 的 base64 编码
  async function getBase64Image() {
    try {
      const fs = require('fs');
      const path = require('path');
      // 强制使用 favicon.png 作为 logo
      const imagePath = path.join(__dirname, '../public/favicon.png');
      const imageBuffer = fs.readFileSync(imagePath);
      return imageBuffer.toString('base64');
    } catch (error) {
      console.error('Error loading favicon:', error);
      return '';
    }
  }

  // 创建信息页面的 HTML 内容
  function createInfoHTML(base64Image = '') {
    const os = require('os');
    const platform = os.platform();
    const isLinux = platform === 'linux';
    const isDarwin = platform === 'darwin';

    let mimeType = 'image/png'; // 强制 png

    const logoImg = base64Image ?
      `<img src="data:${mimeType};base64,${base64Image}" alt="Logo" class="logo">` :
      '<div class="logo" style="background: var(--accent-color); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: 600;">OJ</div>';

    return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>关于</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          /* 禁止用户选中文本 */
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }
        
        body {
          font-family: 'Segoe UI', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI Emoji', Roboto, 'Microsoft YaHei', 'Noto Color Emoji', 'Apple Color Emoji', system-ui, sans-serif;
          background: var(--bg-color);
          color: var(--text-color);
          line-height: 1.6;
          padding: 0;
          margin: 0;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          overflow: hidden; /* 隐藏滚动条 */
          /* 强制使用彩色 emoji */
          font-variant-emoji: emoji;
          /* 优化数字显示 */
          font-variant-numeric: normal;
          font-feature-settings: normal;
          /* 禁止用户选中文本 */
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }

        /* Windows 系统 emoji 字体优化 */
        .emoji, .emoji-text {
          font-family: "Segoe UI Emoji", "Noto Color Emoji", "Apple Color Emoji", "Twemoji Mozilla", sans-serif;
          font-feature-settings: "liga" off;
        }
        
        /* 强制所有 emoji 使用彩色字体 */
        * {
          font-variant-emoji: emoji;
        }
        
        /* Windows 特定的 emoji 优化 */
        @media (min-width: 0) {
          .app-name, .app-version, .app-description, .links-title, .copyright, .feature-text {
            font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, "Microsoft YaHei", "Segoe UI Emoji", "Apple Color Emoji", system-ui, sans-serif;
          }
          .link-item {
            font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, "Microsoft YaHei", system-ui, sans-serif !important;
            font-variant-emoji: none !important;
          }
        }
        
        /* 针对 Windows 的额外 emoji 渲染优化 */
        @supports (font-variant-emoji: emoji) {
          * {
            font-variant-emoji: emoji;
          }
        }
        
        /* 为旧版 Windows 提供备用方案 */
        @media screen and (-ms-high-contrast: active), (-ms-high-contrast: none) {
          body, .app-name, .app-version, .app-description, .feature-text, .links-title, .copyright {
            font-family: "Segoe UI", "Segoe UI Emoji", "Segoe UI Symbol", "Microsoft YaHei", system-ui, sans-serif;
          }
          .link-item {
            font-family: "Segoe UI", "Microsoft YaHei", system-ui, sans-serif !important;
            font-variant-emoji: none !important;
          }
        }

        /* 主题变量 */
        :root {
          --bg-color: #f5f5f5;
          --container-bg: rgba(255, 255, 255, 0.95);
          --text-color: #1f1f1f;
          --text-secondary: #666;
          --text-tertiary: #888;
          --border-color: rgba(0, 0, 0, 0.1);
          --accent-color: #007aff;
          --accent-bg: rgba(0, 122, 255, 0.1);
          --accent-border: rgba(0, 122, 255, 0.2);
          --hover-bg: rgba(0, 0, 0, 0.05);
          --shadow-color: rgba(0, 0, 0, 0.1);
        }

        /* 暗色主题 */
        @media (prefers-color-scheme: dark) {
          :root {
            --bg-color: #1a1a1a;
            --container-bg: rgba(30, 30, 30, 0.95);
            --text-color: #ffffff;
            --text-secondary: #a0a0a0;
            --text-tertiary: #707070;
            --border-color: rgba(255, 255, 255, 0.1);
            --accent-color: #0a84ff;
            --accent-bg: rgba(10, 132, 255, 0.15);
            --accent-border: rgba(10, 132, 255, 0.3);
            --hover-bg: rgba(255, 255, 255, 0.05);
            --shadow-color: rgba(0, 0, 0, 0.3);
          }
        }

        /* 隐藏所有滚动条 */
        ::-webkit-scrollbar {
          display: none;
        }
        
        * {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* Internet Explorer 10+ */
        }
        
        .container {
          background: transparent; 
          margin: 20px;
          border-radius: 12px;
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden; /* 防止内容溢出 */
          max-height: calc(100vh - 40px); /* 确保不超过视窗高度 */
        }
        
        .header {
          text-align: center;
          padding: 25px 30px 15px;
        }
        
        .logo {
          width: 56px;
          height: 56px;
          margin: 0 auto 12px;
          border-radius: 8px;
        }
        
        .app-name {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 6px;
          color: var(--text-color);
          font-family: 'Segoe UI', 'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
        }
        
        .app-version {
          font-size: 16px;
          color: var(--text-secondary);
          margin-bottom: 4px;
          font-family: 'Segoe UI', 'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          font-variant-numeric: tabular-nums; /* 使用等宽数字 */
          font-feature-settings: "tnum"; /* 表格数字 */
        }
        
        .app-description {
          font-size: 14px;
          color: var(--text-tertiary);
          font-family: 'Segoe UI', 'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
        }
        
        .content {
          padding: 20px 30px;
          flex: 1;
          overflow: hidden; /* 禁用滚动 */
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .feature-section {
          margin-bottom: 0;
          width: 100%;
          text-align: center;
        }
        
        .feature-list {
          list-style: none;
          padding-left: 0;
          display: inline-block;
          text-align: left;
        }
        
        .feature-item {
          padding: 6px 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .feature-icon {
          width: 4px;
          height: 4px;
          background: var(--text-tertiary);
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .feature-text {
          color: var(--text-secondary);
          font-size: 14px;
          font-family: 'Segoe UI', 'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          font-variant-numeric: tabular-nums; /* 使用等宽数字 */
          font-feature-settings: "tnum"; /* 表格数字 */
        }
        
        .footer {
          text-align: center;
          padding: 15px 30px;
          border-radius: 0 0 12px 12px;
        }
        
        .copyright {
          color: var(--text-tertiary);
          font-size: 12px;
          font-weight: 400;
        }
        
        .links-section {
          text-align: center;
          padding: 20px 30px 10px;
          border-top: 1px solid var(--border-color);
        }
        
        .links-title {
          font-size: 14px;
          color: var(--text-secondary);
          margin-bottom: 15px;
          font-weight: 500;
        }
        
        .links-container {
          display: flex;
          justify-content: center;
          gap: 15px; /* 减少按钮间距 */
          flex-wrap: wrap;
          align-items: center;
        }
        
        .link-item {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 8px 16px;
          background: var(--accent-bg);
          border: 1px solid var(--accent-border);
          border-radius: 6px;
          text-decoration: none;
          color: var(--accent-color);
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s ease;
          cursor: pointer;
          width: 130px; /* 固定宽度确保一致 */
          box-sizing: border-box;
          white-space: nowrap;
          text-align: center;
          letter-spacing: normal; /* 正常字符间距 */
          word-spacing: normal; /* 正常单词间距 */
          font-family: 'Segoe UI', 'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif !important; /* 强制使用系统字体，不使用 emoji 字体 */
          font-variant-emoji: none; /* 禁用 emoji 字体 */
        }
        
        .link-item:hover {
          background: var(--hover-bg);
          transform: translateY(-1px);
        }
        
        .link-icon {
          width: 16px;
          height: 16px;
          fill: currentColor;
          flex-shrink: 0;
          display: block;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${logoImg}
          <div class="app-name">SDUT OJ 竞赛客户端</div>
          <div class="app-version">版本 1.0.0</div>
          <div class="app-description">专业的在线评测系统客户端</div>
        </div>
        
        <div class="content">
          <div class="feature-section">
            <ul class="feature-list">
              <li class="feature-item">
                <div class="feature-icon"></div>
                <div class="feature-text">Electron 36.5.0</div>
              </li>
              <li class="feature-item">
                <div class="feature-icon"></div>
                <div class="feature-text">Node.js 18.19.1</div>
              </li>
              <li class="feature-item">
                <div class="feature-icon"></div>
                <div class="feature-text">Chromium 130.0.6723.131</div>
              </li>
              <li class="feature-item">
                <div class="feature-icon"></div>
                <div class="feature-text">V8 13.0.245.12</div>
              </li>
            </ul>
          </div>
        </div>
        
        <div class="links-section">
          <div class="links-title">相关链接</div>
          <div class="links-container">
            <a class="link-item" href="#" onclick="openExternalLink('https://oj.sdutacm.cn/onlinejudge3/')">
              <svg class="link-icon" viewBox="0 0 16 16" fill="currentColor">
                <path d="M13.5 3a.5.5 0 0 1 .5.5V11H2V3.5a.5.5 0 0 1 .5-.5h11zm-11-1A1.5 1.5 0 0 0 1 3.5V12h14V3.5A1.5 1.5 0 0 0 13.5 2h-11zM5 5.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0zm2 0a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0zm2 0a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z"/>
              </svg>
              SDUT OJ 官网
            </a>
            <a class="link-item" href="#" onclick="openExternalLink('https://github.com/ATRIOR-LCL/oj-client')">
              <svg class="link-icon" viewBox="0 0 16 16">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              GitHub
            </a>
          </div>
        </div>
        
        <div class="footer">
          <div class="copyright">© 2008-2025 SDUTACM. All Rights Reserved.</div>
        </div>
      </div>
      
      <script>
        // 打开外部链接的函数
        function openExternalLink(url) {
          // 通过 console 消息发送到主进程
          console.log('OPEN_EXTERNAL_LINK:' + url);
        }
        
        // 添加键盘事件监听（ESC键关闭窗口）
        document.addEventListener('keydown', function(event) {
          if (event.key === 'Escape') {
            
          }
        });
      </script>
    </body>
    </html>`;
  }

  // 加载图片并创建窗口
  getBase64Image().then(base64Image => {
    const finalHTML = createInfoHTML(base64Image);
    const dataURL = `data:text/html;charset=utf-8,${encodeURIComponent(finalHTML)}`;

    infoWindow.loadURL(dataURL);

    // 监听控制台消息以处理外部链接和窗口关闭
    infoWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      if (message.startsWith('OPEN_EXTERNAL_LINK:')) {
        const url = message.replace('OPEN_EXTERNAL_LINK:', '');
        shell.openExternal(url);
      } else if (message === 'CLOSE_WINDOW') {
        infoWindow.close();
      }
    });

    infoWindow.once('ready-to-show', () => {
      infoWindow.show();
    });
  }).catch(error => {
    console.error('Error creating info dialog:', error);
    // 无图片版本
    const simpleHTML = createInfoHTML();
    const dataURL = `data:text/html;charset=utf-8,${encodeURIComponent(simpleHTML)}`;

    infoWindow.loadURL(dataURL);

    // 监听控制台消息以处理外部链接和窗口关闭
    infoWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      if (message.startsWith('OPEN_EXTERNAL_LINK:')) {
        const url = message.replace('OPEN_EXTERNAL_LINK:', '');
        shell.openExternal(url);
      } else if (message === 'CLOSE_WINDOW') {
        infoWindow.close();
      }
    });

    infoWindow.once('ready-to-show', () => {
      infoWindow.show();
    });
  });

  return infoWindow;
}

module.exports = {
  showBlockedDialog,
  showInfoDialog
};
