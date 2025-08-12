const { dialog, BrowserWindow, shell } = require('electron');
const path = require('path');
const { getChineseFormattedVersion, getAppVersion } = require('./versionHelper');
const PlatformHelper = require('./platformHelper');

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
      '哎呀~比赛期间不能访问这个网站哦！',
      '注意，这里在比赛模式下无法打开。',
      '抱歉，比赛规则限制了该网站的访问。',
      '请专注比赛，暂时无法访问此页面。',
      '当前环境仅允许访问指定网站。',
      '比赛模式已开启，请专心答题！'
    ],
    redirect: [
      '检测到页面发生重定向，目标网站不在允许范围，已为你拦截！',
      '页面重定向被拦截，保护你的比赛环境！'
    ]
  };
  const details = {
    default: [
      `目标网站：${hostname}  \n拦截原因：${reason}\n\n比赛期间只能访问指定网站，祝你取得好成绩！`,
      `被拦截的网站：${hostname}  \n详细说明：${reason}\n\n请将注意力集中在比赛题目上，加油！`,
      `无法访问：${hostname}  \n原因说明：${reason}\n\n比赛模式下仅可使用允许的网站。`,
      `访问限制：${hostname}  \n限制说明：${reason}\n\n专注比赛才能发挥最佳水平！`,
      `网站屏蔽：${hostname}  \n屏蔽原因：${reason}\n\n比赛环境需要保持纯净，回到题目页面继续努力吧！`
    ],
    redirect: [
      `检测到页面发生重定向，目标网站：${hostname} 已被系统拦截！\n原因：${reason}\n\n比赛期间请勿访问非指定网站，祝你取得好成绩！`,
      `页面重定向到 ${hostname} 已被拦截，保护你的比赛环境！\n原因：${reason}\n\n继续加油！`
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

  const titles = [
    '比赛模式提醒',
    '访问限制通知',
    '安全提示',
    '访问被拦截',
    '专注比赛',
    '系统提示'
  ];
  const randomTitle = titles[Math.floor(Math.random() * titles.length)];
  
  const isWindows = process.platform === 'win32';
  
  if (isWindows) {
    // Windows 使用自定义 HTML 弹窗，标题固定为"白名单拦截"
    showCustomBlockedDialog(parentWindow, '白名单拦截', randomMessage, randomDetail, randomButton, callback);
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
      opts.message = randomMessage;
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
  const { nativeTheme } = require('electron');
  const isDark = nativeTheme.shouldUseDarkColors;
  const dialogWindow = new BrowserWindow({
    width: 480,
    height: 340,
    parent: parentWindow,
    modal: true,
    show: false,
    backgroundColor: isDark ? '#23272e' : '#f5f5f5',
    webPreferences: {
      contextIsolation: true
    }
  });

  // Linux平台：设置窗口类名，确保与主窗口保持一致
  if (process.platform === 'linux' && dialogWindow.setWMClass) {
    try {
      dialogWindow.setWMClass('sdut-oj-competition-client', 'SDUT OJ Competition Side Client');
      console.log('Linux 对话框窗口类名设置成功');
    } catch (error) {
      console.log('设置对话框窗口类名失败:', error);
    }
  }

  // 隐藏菜单栏
  dialogWindow.setMenuBarVisibility(false);

  // 同步获取 favicon 的 base64 编码
  function getFaviconBase64Sync() {
    try {
      const fs = require('fs');
      const path = require('path');
      const imagePath = path.join(__dirname, '../public/icon.png');
      const imageBuffer = fs.readFileSync(imagePath);
      return imageBuffer.toString('base64');
    } catch (error) {
      console.error('Error loading favicon:', error);
      return '';
    }
  }

  // 创建 HTML 内容
  function createDialogHTML(faviconBase64 = '') {
    // 检测是否为Windows系统
    const isWindows = PlatformHelper.isWindows();
    
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
          border-radius: ${isWindows ? '0' : '8px'}; /* Windows系统使用直角 */
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
        
        // ESC键绑定已删除，仅使用按钮关闭对话框
        
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

  // 同步加载 favicon 并创建窗口
  const faviconBase64 = getFaviconBase64Sync();
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
}

// 全局变量跟踪当前打开的系统信息窗口
let currentInfoWindow = null;

/**
 * 检查指定窗口是否是关于窗口
 * @param {BrowserWindow} window - 要检查的窗口
 * @returns {boolean} 如果是关于窗口返回 true
 */
function isAboutWindow(window) {
  return currentInfoWindow && !currentInfoWindow.isDestroyed() && currentInfoWindow === window;
}

/**
 * 显示系统信息对话框
 * @param {BrowserWindow} parentWindow - 父窗口
 */
function showInfoDialog(parentWindow) {
  console.log('showInfoDialog 被调用');
  
  // 获取系统信息
  const appVersion = getChineseFormattedVersion();
  const electronVersion = process.versions.electron;
  const nodeVersion = process.versions.node;
  const chromiumVersion = process.versions.chrome;
  const v8Version = process.versions.v8;
  
  // 构建详细信息文本
  const detailText = `应用版本：${appVersion}
Electron：${electronVersion}
Node.js：${nodeVersion}
Chromium：${chromiumVersion}
V8：${v8Version}

开发团队：SDUTACM
项目地址：https://github.com/sdutacm/oj-competition-side-client
官方网站：https://oj.sdutacm.cn/onlinejudge3/`;

  // 对话框选项
  const options = {
    type: 'info',
    title: '关于 SDUT OJ 竞赛客户端',
    message: 'SDUT OJ 竞赛客户端',
    detail: detailText,
    buttons: ['确定', '复制信息'],
    defaultId: 0,
    cancelId: 0,
    noLink: true
  };

  // 显示对话框
  dialog.showMessageBox(parentWindow, options).then((result) => {
    console.log('系统信息对话框结果:', result);
    
    if (result.response === 1) { // 复制信息按钮
      const { clipboard } = require('electron');
      const copyText = `SDUT OJ 竞赛客户端 ${appVersion}

系统信息：
- Electron: ${electronVersion}
- Node.js: ${nodeVersion}
- Chromium: ${chromiumVersion}
- V8: ${v8Version}

开发团队：SDUTACM
项目地址：https://github.com/sdutacm/oj-competition-side-client
官方网站：https://oj.sdutacm.cn/onlinejudge3/`;
      
      clipboard.writeText(copyText);
      console.log('系统信息已复制到剪贴板');
    }
  }).catch((error) => {
    console.error('显示系统信息对话框时出错:', error);
  });
}

// 防抖弹窗，防止同一窗口/类型短时间重复弹窗
let lastBlockedUrl = '';
let lastBlockedType = '';
let lastBlockedTime = 0;
function showBlockedDialogWithDebounce(win, url, message, type = 'default') {
  const now = Date.now();
  if (url === lastBlockedUrl && type === lastBlockedType && now - lastBlockedTime < 1000) {
    return;
  }
  lastBlockedUrl = url;
  lastBlockedType = type;
  lastBlockedTime = now;
  showBlockedDialog(win, url, message, type);
}

module.exports = {
  showBlockedDialog,
  showBlockedDialogWithDebounce,
  showInfoDialog,
  isAboutWindow
};
