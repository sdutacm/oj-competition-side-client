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
    height: 600,
    parent: parentWindow,
    modal: true,
    resizable: false,
    show: false,
    icon: path.join(__dirname, '../public/favicon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

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
      '<div class="logo" style="background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px;">OJ</div>';

    return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>系统信息</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Microsoft YaHei', sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #333;
          line-height: 1.6;
          padding: 0;
          margin: 0;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        
        .container {
          background: rgba(255, 255, 255, 0.95);
          margin: 20px;
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px);
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        
        .header {
          text-align: center;
          padding: 30px 30px 20px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }
        
        .logo {
          width: 64px;
          height: 64px;
          margin: 0 auto 16px;
          border-radius: 12px;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
        }
        
        .app-name {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .app-version {
          font-size: 16px;
          color: #666;
          margin-bottom: 4px;
        }
        
        .app-description {
          font-size: 14px;
          color: #888;
        }
        
        .content {
          padding: 20px 30px;
          flex: 1;
        }
        
        .feature-section {
          margin-bottom: 24px;
        }
        
        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #333;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .section-icon {
          width: 20px;
          height: 20px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
        }
        
        .feature-list {
          list-style: none;
          padding-left: 0;
        }
        
        .feature-item {
          padding: 8px 0;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .feature-item:last-child {
          border-bottom: none;
        }
        
        .feature-icon {
          width: 6px;
          height: 6px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .feature-text {
          color: #555;
          font-size: 14px;
        }
        
        .shortcuts {
          background: rgba(102, 126, 234, 0.1);
          padding: 16px;
          border-radius: 12px;
          margin-top: 16px;
        }
        
        .shortcut-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          border-bottom: 1px solid rgba(102, 126, 234, 0.1);
        }
        
        .shortcut-item:last-child {
          border-bottom: none;
        }
        
        .shortcut-key {
          background: rgba(102, 126, 234, 0.2);
          padding: 4px 8px;
          border-radius: 6px;
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 12px;
          font-weight: 600;
          color: #667eea;
        }
        
        .footer {
          text-align: center;
          padding: 20px 30px;
          border-top: 1px solid rgba(0, 0, 0, 0.1);
          background: rgba(0, 0, 0, 0.02);
          border-radius: 0 0 16px 16px;
        }
        
        .close-btn {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
        
        .close-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
        
        .close-btn:active {
          transform: translateY(0);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${logoImg}
          <div class="app-name">OJ Client</div>
          <div class="app-version">版本 1.0.0</div>
          <div class="app-description">专业的在线评测系统客户端</div>
        </div>
        
        <div class="content">
          <div class="feature-section">
            <div class="section-title">
              <div class="section-icon">✨</div>
              核心功能
            </div>
            <ul class="feature-list">
              <li class="feature-item">
                <div class="feature-icon"></div>
                <div class="feature-text">智能浏览器环境，专为编程竞赛优化</div>
              </li>
              <li class="feature-item">
                <div class="feature-icon"></div>
                <div class="feature-text">域名白名单机制，确保专注比赛环境</div>
              </li>
              <li class="feature-item">
                <div class="feature-icon"></div>
                <div class="feature-text">自定义工具栏，提供便捷的导航操作</div>
              </li>
              <li class="feature-item">
                <div class="feature-icon"></div>
                <div class="feature-text">全局快捷键支持，提升操作效率</div>
              </li>
              <li class="feature-item">
                <div class="feature-icon"></div>
                <div class="feature-text">跨平台兼容，支持 Windows、macOS、Linux</div>
              </li>
            </ul>
          </div>
          
          <div class="feature-section">
            <div class="section-title">
              <div class="section-icon">⌨️</div>
              快捷键
            </div>
            <div class="shortcuts">
              <div class="shortcut-item">
                <span>后退</span>
                <span class="shortcut-key">Alt + ←</span>
              </div>
              <div class="shortcut-item">
                <span>前进</span>
                <span class="shortcut-key">Alt + →</span>
              </div>
              <div class="shortcut-item">
                <span>刷新</span>
                <span class="shortcut-key">Alt + R</span>
              </div>
              <div class="shortcut-item">
                <span>主页</span>
                <span class="shortcut-key">Alt + H</span>
              </div>
              <div class="shortcut-item">
                <span>系统信息</span>
                <span class="shortcut-key">Alt + I</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <button class="close-btn" onclick="window.close()">关闭 (◕‿◕)✨</button>
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
