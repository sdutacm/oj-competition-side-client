const { getFormattedVersion } = require('./versionHelper');
const { BrowserWindow } = require('electron');
const { calculateCenteredPosition } = require('./screenCenterPosition');

/**
 * 获取统一的启动窗口 HTML 内容（带 SDUTACM 主题、版本号等）
 */
function getStartupHtml(isWindows = false) {
    // Windows 系统使用直角设计，其他系统保持圆角
  const containerStyle = isWindows 
    ? 'background: #21262d; border-radius: 0px;' // Windows使用纯色背景，无渐变
    : 'background: linear-gradient(135deg, #0d1117 0%, #21262d 25%, #30363d 50%, #21262d 75%, #0d1117 100%); border-radius: 16px;';    return `<!DOCTYPE html>
              <html lang="zh-CN">
                <head>
                  <meta charset="UTF-8" />
                  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                  <title>SDUT OJ 竞赛客户端启动页</title>
                  <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; user-select: none; --left-vw: 7vw; --org-text-size: 3vw; --product-text-size: 6vw; --version-text-size: 2vw; }
                    :root { --bg-primary: #0d1117; --bg-secondary: #21262d; --bg-tertiary: #5b5f64; --text-primary: #f0f6fc; --text-secondary: #8b949e; --accent-color: rgba(255, 255, 255, 0.08); --shadow-color: rgba(0, 0, 0, 0.4); }
                    @media (prefers-color-scheme: light) { :root { --bg-primary: #ffffff; --bg-secondary: #eff2f5; --bg-tertiary: #87929f; --text-primary: #1f2837; --text-secondary: #475569; --accent-color: rgba(59, 130, 246, 0.15); --shadow-color: rgba(15, 23, 42, 0.2); } }
                    html, body { height: 100%; width: 100%; font-family: "Segoe UI", "Helvetica Neue", sans-serif; color: var(--text-primary); overflow: hidden; line-height: 1.5; margin: 0; padding: 0; border: none; outline: none; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; ${isWindows ? 'opacity: 0; transition: opacity 0.3s ease;' : ''} }
                    .container { position: relative; width: 100%; height: 100%; margin: 0; padding: var(--left-vw); display: flex; flex-direction: column; justify-content: space-between; ${containerStyle} overflow: hidden; background-size: 200% 200%; transition: background 0.3s ease; ${isWindows ? '' : 'animation: gradientShift 6s ease-in-out infinite alternate;'}}
                    .container::before { content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%; ${isWindows ? 'background: none;' : 'background: linear-gradient(135deg, transparent 0%, var(--accent-color) 50%, transparent 100%), radial-gradient(ellipse at center, transparent 60%, var(--accent-color) 100%);'} pointer-events: none; z-index: -1; transition: background 0.3s ease; ${isWindows ? 'border-radius: 0px;' : 'border-radius: 16px;'} ${isWindows ? '' : 'animation: backgroundPulse 8s ease-in-out infinite alternate;'} }
                    @media (prefers-color-scheme: light) { .container::before { background: linear-gradient(135deg, transparent 0%, var(--accent-color) 50%, transparent 100%), radial-gradient(ellipse at center, transparent 60%, var(--accent-color) 100%); } }
                    .org, .product-text, .version { opacity: 0; transform: translateY(30px); color: var(--text-primary); transition: color 0.3s ease; }
                    .org { display: flex; align-items: center; }
                    .org svg { height: 3.5vw; width: auto; margin-right: 1vw; filter: drop-shadow(0 2px 4px var(--shadow-color)); transition: filter 0.3s ease; }
                    .product { display: flex; flex-direction: column; justify-content: start; align-items: start; }
                    .product-text { font-size: var(--product-text-size); font-weight: 700; display: flex; flex-direction: column; align-items: start; text-align: center; color: var(--text-primary); text-shadow: 0 1px 3px var(--shadow-color); transition: color 0.3s ease, text-shadow 0.3s ease; }
                    .org-text { font-size: var(--org-text-size); font-weight: 600; color: var(--text-primary); text-shadow: 0 1px 3px var(--shadow-color); transition: color 0.3s ease, text-shadow 0.3s ease; letter-spacing: 0.02em; }
                    .version { font-size: var(--version-text-size); font-weight: 300; color: var(--text-secondary); transition: color 0.3s ease; opacity: 0; transform: translateY(30px); }
                    /* 内容淡入动画只在 start-animation 类下触发，背景动画始终自动播放 */
                    .org, .product-text, .version { opacity: 0; transform: translateY(30px); }
                    body.start-animation .org { animation: fadeInUp 1s ease forwards; animation-delay: 0.2s; }
                    body.start-animation .product-text { animation: fadeInUp 1s ease forwards; animation-delay: 0.5s; }
                    body.start-animation .version { animation: fadeInUpVersion 1s ease forwards; animation-delay: 0.8s; }
                    @media (prefers-color-scheme: light) { .org-text, .product-text { text-shadow: 0 1px 2px var(--shadow-color); } }
                    @media (max-width: 768px) { .org svg { height: 8vw; } .org-text { font-size: 5vw; } .product-text { font-size: 8vw; } }
                    @keyframes fadeInUp { 0% { opacity: 0; transform: translateY(30px); } 100% { opacity: 1; transform: translateY(0); } }
                    @keyframes fadeInUpVersion { 0% { opacity: 0; transform: translateY(30px); } 100% { opacity: 0.85; transform: translateY(0); } }
                    @keyframes backgroundPulse { 0% { transform: scale(1) rotate(0deg); opacity: 0.8; } 25% { transform: scale(1.05) rotate(1deg); opacity: 0.9; } 50% { transform: scale(1.1) rotate(0deg); opacity: 1; } 75% { transform: scale(1.05) rotate(-1deg); opacity: 0.9; } 100% { transform: scale(1) rotate(0deg); opacity: 0.8; } }
                    @keyframes gradientShift { 0% { background-position: 0% 50%; } 25% { background-position: 50% 0%; } 50% { background-position: 100% 50%; } 75% { background-position: 50% 100%; } 100% { background-position: 0% 50%; } }
                  </style>
                  <script>
                    // 兼容 preload 失败时的兜底
                    window.addEventListener('message', function(event) {
                      if (event.data && event.data.type === 'START_ANIMATION') {
                        document.body.classList.add('start-animation');
                      }
                    });
                  </script>
                </head>
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
                      <p class="version">${getFormattedVersion()}</p>
                    </div>
                  </div>
                </body>
              </html>
`;
}


/**
 * 创建启动窗口（无框、透明、圆角、严格居中）
 * @param {string} htmlContent - 启动窗口 HTML 内容
 * @param {object} [options] - 可选参数（width, height, onClose, onShow, duration）
 * @returns {BrowserWindow}
 */
function createStartupWindow(htmlContent, options = {}) {
  const isWindows = process.platform === 'win32';
  if (!htmlContent) htmlContent = getStartupHtml(isWindows);
  const width = options.width || 1000;
  const height = options.height || 600;
  const centeredPosition = calculateCenteredPosition(width, height);
  
  // Windows使用非透明避免闪烁，其他系统保持透明设计
  const windowOptions = {
    width,
    height,
    x: centeredPosition.x,
    y: centeredPosition.y,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    show: isWindows, // Windows立即显示，避免显示时机问题
    transparent: !isWindows, // 只有Windows不使用透明，避免闪烁
    backgroundColor: isWindows ? '#21262d' : undefined, // Windows使用CSS渐变的主色调
    hasShadow: true,
    skipTaskbar: false,
    webPreferences: {
      contextIsolation: true,
      backgroundThrottling: false, // 防止后台时动画暂停
      offscreen: false // 确保正常渲染
    }
  };
  
  console.log('[Splash] 创建启动窗口', isWindows ? '(Windows立即显示模式)' : '(透明圆角模式)');
  const startupWindow = new BrowserWindow(windowOptions);
  const startupDataURL = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
  
  // Windows系统：窗口创建时就显示，内容初始隐藏，避免显示时机问题
  if (isWindows) {
    startupWindow.loadURL(startupDataURL);
    console.log('[Splash] Windows窗口已创建并显示');
    
    // 等待内容加载完成后再显示内容
    startupWindow.webContents.once('did-finish-load', () => {
      console.log('[Splash] Windows内容加载完成，显示内容');
      setTimeout(() => {
        try {
          // 显示内容并开始动画
          startupWindow.webContents.executeJavaScript(`
            document.body.style.opacity = '1';
            document.body.classList.add("start-animation");
          `);
        } catch (e) {
          console.warn('[Splash] 注入显示内容JS失败:', e.message);
        }
        if (typeof options.onShow === 'function') options.onShow(startupWindow);
      }, 50);
    });
  } else {
    // 其他平台继续使用原有逻辑
    startupWindow.webContents.once('did-finish-load', () => {
      console.log('[Splash] did-finish-load，页面加载完成');
      
      // 等待一个渲染周期，确保内容完全渲染
      setTimeout(() => {
        startupWindow.show();
        console.log('[Splash] 延迟显示启动窗口，规避闪屏');
        
        // 显示后立即开始动画
        setTimeout(() => {
          try {
            startupWindow.webContents.executeJavaScript('document.body.classList.add("start-animation")');
          } catch (e) {
            console.warn('[Splash] 注入动画启动JS失败:', e.message);
          }
        }, 50);
        
        if (typeof options.onShow === 'function') options.onShow(startupWindow);
      }, 100);
    });
    
    // 加载页面
    startupWindow.loadURL(startupDataURL);
  }
  
  // 自动关闭逻辑对所有平台一致
  if (options.duration) {
    setTimeout(() => {
      console.log('[Splash] 到时自动关闭启动窗口');
      startupWindow.close();
    }, options.duration);
  }
  
  startupWindow.on('closed', () => {
    console.log('[Splash] 启动窗口已关闭');
    if (typeof options.onClose === 'function') options.onClose();
  });
  
  return startupWindow;
}

module.exports = { createStartupWindow, getStartupHtml };
