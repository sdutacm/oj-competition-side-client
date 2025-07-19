const { dialog, BrowserWindow, shell } = require('electron');
const path = require('path');

/**
 * 显示域名拦截对话框
 * @param {BrowserWindow} parentWindow - 父窗口
 * @param {string} hostname - 被拦截的域名
 * @param {string} reason - 拦截原因
 * @param {string} type - 拦截类型（可选：'redirect' | 'default'）
 */
function showBlockedDialog(parentWindow, hostname, reason, type = 'default') {
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
  // Mac 下弹窗需 alwaysOnTop 并聚焦，防止被主窗口遮挡
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
  });
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
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Microsoft YaHei', sans-serif;
          background: var(--bg-color);
          color: var(--text-color);
          line-height: 1.6;
          padding: 0;
          margin: 0;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          overflow: hidden; /* 隐藏滚动条 */
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
        }
        
        .app-version {
          font-size: 16px;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }
        
        .app-description {
          font-size: 14px;
          color: var(--text-tertiary);
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
          gap: 20px;
          flex-wrap: wrap;
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
          width: 130px;
          min-width: 130px;
          max-width: 130px;
          box-sizing: border-box;
          white-space: nowrap;
          text-align: center;
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
