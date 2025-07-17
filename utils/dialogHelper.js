const { dialog, BrowserWindow } = require('electron');
const path = require('path');

/**
 * 显示域名拦截对话框
 * @param {BrowserWindow} parentWindow - 父窗口
 * @param {string} hostname - 被拦截的域名
 * @param {string} reason - 拦截原因
 */
function showBlockedDialog(parentWindow, hostname, reason) {
  const messages = [
    '哎呀~ (´･ω･`) 比赛期间不能访问这个网站呢！',
    '诶？！(°ロ°) 这里在比赛模式下不能打开哦~',
    '呜呜~ (｡•́︿•̀｡) 比赛规则限制了这个网站！',
    '欸嘿~ (＾◡＾) 选手大人，专心比赛不要分心哦！',
    '咦？(⊙_⊙) 比赛环境下只能访问指定网站呢~',
    '啊哈~ (◉‿◉) 比赛模式已开启，请专注答题！'
  ];

  const details = [
    `目标网站：${hostname} ✨\n拦截原因：${reason}\n\n(｡♥‿♥｡) 比赛期间只能访问指定网站哦~ 专心答题吧！`,
    `被拦截的网站：${hostname} 🌸\n详细说明：${reason}\n\n(◕‿◕) 这是比赛规则呢！让我们把注意力集中在题目上吧~`,
    `无法访问：${hostname} 🎀\n原因说明：${reason}\n\n(´∀｀) 比赛模式下只能使用允许的网站呢，加油做题吧！`,
    `访问限制：${hostname} 🎯\n限制说明：${reason}\n\n(＾▽＾) 专注比赛才能发挥最佳水平哦~ 继续努力！`,
    `网站屏蔽：${hostname} 💫\n屏蔽原因：${reason}\n\n(◡ ‿ ◡) 比赛环境需要保持纯净呢，回到题目页面继续加油吧！`
  ];

  const buttons = [
    '好的，专心比赛！(´▽`)',
    '了解~ 继续答题！(◡ ‿ ◡)',
    '明白啦！回去做题~(•‿•)',
    '收到~ 加油比赛！(＾▽＾)',
    '知道了！Focus！(◕‿◕)✨'
  ];

  // 随机选择消息内容
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];
  const randomDetail = details[Math.floor(Math.random() * details.length)];
  const randomButton = buttons[Math.floor(Math.random() * buttons.length)];

  dialog.showMessageBox(parentWindow, {
    type: 'info',
    title: '比赛模式提醒 (◕‿◕)🏆',
    message: randomMessage,
    detail: randomDetail,
    buttons: [randomButton],
    defaultId: 0,
    icon: null
  });
}

/**
 * 显示系统信息窗口
 * @param {BrowserWindow} parentWindow - 父窗口
 */
function showInfoDialog(parentWindow) {
  // 创建一个新的信息窗口
  const infoWindow = new BrowserWindow({
    width: 500,
    height: 520,
    parent: parentWindow,
    modal: true,
    resizable: false,
    show: false,
    autoHideMenuBar: true, // 自动隐藏菜单栏
    icon: path.join(__dirname, '../public/favicon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false, // 禁用开发者工具
    }
  });

  // 确保隐藏菜单栏
  infoWindow.setMenuBarVisibility(false);

  // 禁用信息窗口的开发者工具相关功能
  if (infoWindow.webContents) {
    // 禁用右键菜单
    infoWindow.webContents.on('context-menu', (event) => {
      event.preventDefault();
    });

    // 禁用开发者工具快捷键
    infoWindow.webContents.on('before-input-event', (event, input) => {
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

  // 异步函数获取 favicon 的 base64 编码
  async function getBase64Image() {
    try {
      const fs = require('fs');
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
    const logoImg = base64Image ? 
      `<img src="data:image/png;base64,${base64Image}" alt="Logo" class="logo">` : 
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
        
        <div class="footer">
          <div class="copyright">© 2008-2025 SDUTACM. All Rights Reserved.</div>
        </div>
      </div>
    </body>
    </html>`;
  }

  // 加载图片并创建窗口
  getBase64Image().then(base64Image => {
    const finalHTML = createInfoHTML(base64Image);
    const dataURL = `data:text/html;charset=utf-8,${encodeURIComponent(finalHTML)}`;
    
    infoWindow.loadURL(dataURL);
    infoWindow.once('ready-to-show', () => {
      infoWindow.show();
    });
  }).catch(error => {
    console.error('Error creating info dialog:', error);
    // 无图片版本
    const simpleHTML = createInfoHTML();
    const dataURL = `data:text/html;charset=utf-8,${encodeURIComponent(simpleHTML)}`;
    
    infoWindow.loadURL(dataURL);
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
