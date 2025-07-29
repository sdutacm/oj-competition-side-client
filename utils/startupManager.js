const { BrowserWindow, app } = require('electron');
const fs = require('fs');
const path = require('path');

class StartupManager {
  constructor() {
    this.startupStateFile = path.join(app.getPath('userData'), 'startup-state.json');
  }

  /**
   * 检查是否需要显示启动窗口
   */
  shouldShowStartupWindow() {
    try {
      if (!fs.existsSync(this.startupStateFile)) {
        // 第一次运行程序
        console.log('First time startup - will show startup window');
        return true;
      }
      
      const state = JSON.parse(fs.readFileSync(this.startupStateFile, 'utf8'));
      const shouldShow = state.showStartupOnNextLaunch === true;
      console.log('Startup state check:', shouldShow ? 'Show startup window' : 'Skip startup window');
      return shouldShow;
    } catch (error) {
      console.error('Error reading startup state:', error);
      // 出错时默认显示启动窗口
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
      console.log('Marked startup as shown, next launch will skip startup window');
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
      console.log('Marked to show startup window on next launch');
    } catch (error) {
      console.error('Error marking startup for next launch:', error);
    }
  }

    /**
   * 显示启动窗口
   * @param {Function} callback 启动窗口关闭后的回调
   */
  showStartupWindow(callback) {
    console.log('Creating startup window...');
    
    let callbackCalled = false;
    const safeCallback = () => {
      if (!callbackCalled) {
        callbackCalled = true;
        if (callback) callback();
      }
    };

    const isMac = process.platform === 'darwin';
    
    // 根据平台选择图标
    const os = require('os');
    const platform = os.platform();
    let iconPath;

    // 确定图标文件名
    let iconFileName;
    if (platform === 'linux') {
      iconFileName = 'icon.png';
    } else if (platform === 'darwin') {
      iconFileName = 'favicon.icns';
    } else {
      // Windows 使用 .ico 文件
      iconFileName = 'favicon.ico';
    }

    // 尝试多个可能的路径来适应不同环境
    const possibleIconPaths = [
      path.join(__dirname, '../public', iconFileName), // 开发环境
      path.join(process.resourcesPath, 'app/public', iconFileName), // 构建后的路径
      path.join(process.cwd(), 'public', iconFileName), // 当前工作目录
      path.join(app.getAppPath(), 'public', iconFileName), // 应用路径
      path.join(path.dirname(app.getAppPath()), 'public', iconFileName) // 应用目录的上级
    ];

    // 尝试找到存在的图标文件
    for (const testPath of possibleIconPaths) {
      try {
        if (fs.existsSync(testPath)) {
          iconPath = testPath;
          console.log('找到图标文件:', iconPath);
          break;
        }
      } catch (error) {
        console.warn('检查图标路径失败:', testPath, error.message);
      }
    }

    if (!iconPath) {
      console.warn('无法找到图标文件，尝试的路径:', possibleIconPaths);
    }
    
    // 创建无框透明启动页窗口
    const windowOptions = {
      width: 1000,
      height: 600,
      frame: false, // 完全无框窗口
      transparent: true,
      alwaysOnTop: false, // 不要始终置顶，避免各平台桌面环境特殊处理
      center: true, // 启用居中
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      show: false, // 重要：先不显示，等定位完成后再显示
      skipTaskbar: false, // 所有平台都确保在任务栏显示，提供一致体验
      icon: iconPath, // 设置应用图标（如果找到的话）
      backgroundColor: 'rgba(0,0,0,0)', // 完全透明背景
      // Mac 下完全移除标题栏相关设置，确保无框
      ...(isMac && {
        titleBarStyle: 'hidden',
        trafficLightPosition: { x: -1000, y: -1000 }, // 将交通灯按钮移到视野外
        // Mac 特定的居中设置
        x: undefined, // 让系统自动计算 x 位置
        y: undefined, // 让系统自动计算 y 位置
      }),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        devTools: false,
        backgroundThrottling: false // 防止后台时动画停止
      }
    };

    // 平台特定窗口设置
    if (process.platform === 'linux') {
      Object.assign(windowOptions, {
        title: 'SDUT OJ Competition Side Client', // 使用英文标题避免乱码
        skipTaskbar: false, // 明确设置显示在任务栏
        focusable: true, // 确保窗口可以获得焦点
        // 添加图标路径确保Linux正确识别
        ...(iconPath && { icon: iconPath }),
      });
    } else if (process.platform === 'win32') {
      Object.assign(windowOptions, {
        title: 'SDUT OJ Competition Side Client',
        skipTaskbar: false, // Windows也明确设置显示在任务栏
        focusable: true,
      });
    } else if (process.platform === 'darwin') {
      // macOS特定设置，虽然Dock通常没问题，但保持一致性
      Object.assign(windowOptions, {
        title: 'SDUT OJ Competition Side Client',
        skipTaskbar: false,
      });
    }

    const startupWindow = new BrowserWindow(windowOptions);

    // 手动确保窗口居中（特别针对 Mac 系统）
    if (isMac) {
      // 获取屏幕尺寸
      const { screen } = require('electron');
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
      
      // 计算居中位置
      const windowWidth = windowOptions.width;
      const windowHeight = windowOptions.height;
      const x = Math.round((screenWidth - windowWidth) / 2);
      const y = Math.round((screenHeight - windowHeight) / 2);
      
      // 设置窗口位置
      startupWindow.setPosition(x, y);
      console.log(`Mac 启动窗口手动居中: 屏幕尺寸 ${screenWidth}x${screenHeight}, 窗口位置 (${x}, ${y})`);
    }

    // 创建启动页内容
    const startupHTML = this.getStartupHTML();
    const startupDataURL = `data:text/html;charset=utf-8,${encodeURIComponent(startupHTML)}`;

    startupWindow.loadURL(startupDataURL);

    // Mac 系统额外处理：确保完全隐藏原生控件
    if (isMac) {
      startupWindow.setWindowButtonVisibility(false);
    }

    startupWindow.webContents.on('dom-ready', () => {
      console.log('Startup window DOM ready, showing window...');
      
      // Mac 系统在显示前再次确保居中
      if (isMac) {
        const { screen } = require('electron');
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
        const x = Math.round((screenWidth - windowOptions.width) / 2);
        const y = Math.round((screenHeight - windowOptions.height) / 2);
        startupWindow.setPosition(x, y);
        console.log(`Mac 启动窗口显示前再次居中: (${x}, ${y})`);
      }
      
      startupWindow.show();

      // 平台特定的窗口优化
      if (process.platform === 'linux' && startupWindow.setWMClass) {
        // Linux：在窗口显示后设置窗口类名，确保与主窗口保持一致
        setTimeout(() => {
          try {
            startupWindow.setWMClass('sdut-oj-competition-client', 'SDUT OJ Competition Side Client');
            console.log('Linux 启动窗口类名设置成功');
          } catch (error) {
            console.log('设置启动窗口类名失败:', error);
          }
        }, 100);
      } else if (process.platform === 'win32') {
        // Windows：确保窗口在任务栏正确显示
        setTimeout(() => {
          try {
            // Windows特定的窗口优化
            startupWindow.setTitle('SDUT OJ Competition Side Client');
            console.log('Windows 启动窗口标题设置成功');
          } catch (error) {
            console.log('设置Windows启动窗口标题失败:', error);
          }
        }, 50);
      } else if (process.platform === 'darwin') {
        // macOS：在显示后进行最终的居中检查和优化
        setTimeout(() => {
          try {
            const [currentX, currentY] = startupWindow.getPosition();
            const { screen } = require('electron');
            const primaryDisplay = screen.getPrimaryDisplay();
            const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
            const idealX = Math.round((screenWidth - windowOptions.width) / 2);
            const idealY = Math.round((screenHeight - windowOptions.height) / 2);
            
            // 如果位置偏差超过5像素，重新调整
            if (Math.abs(currentX - idealX) > 5 || Math.abs(currentY - idealY) > 5) {
              startupWindow.setPosition(idealX, idealY);
              console.log(`macOS 启动窗口最终位置调整: 从 (${currentX}, ${currentY}) 到 (${idealX}, ${idealY})`);
            } else {
              console.log(`macOS 启动窗口位置正确: (${currentX}, ${currentY})`);
            }
          } catch (error) {
            console.log('macOS启动窗口位置检查失败:', error);
          }
        }, 100);
      }

      // 5秒后关闭启动窗口
      setTimeout(() => {
        try {
          console.log('Startup window timeout, closing...');
          this.markStartupShown();
          startupWindow.close();
          safeCallback();
        } catch (e) {
          console.log('Error closing startup window:', e);
          this.markStartupShown();
          safeCallback();
        }
      }, 5000);
    });

    // 处理窗口关闭事件
    startupWindow.on('closed', () => {
      console.log('Startup window closed');
      this.markStartupShown();
      safeCallback();
    });

    return startupWindow;
  }

  /**
   * 处理应用启动逻辑
   * @param {Function} onStartupComplete 启动完成后的回调
   */
  handleAppStartup(onStartupComplete) {
    console.log('HandleAppStartup called');
    
    if (this.shouldShowStartupWindow()) {
      console.log('Showing startup window - first time or after reset');
      this.showStartupWindow(() => {
        console.log('Startup window completed');
        if (onStartupComplete) onStartupComplete();
      });
    } else {
      console.log('Skipping startup window - not first time');
      if (onStartupComplete) onStartupComplete();
    }
  }

  /**
   * 获取启动窗口HTML内容
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
      border-radius: 16px; /* 确保根元素也有圆角，与 container 保持一致 */
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
      border-radius: 16px; /* 增加圆角半径 */
      overflow: hidden;
      background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 50%, var(--bg-tertiary) 100%);
      background-size: 200% 200%;
      border: none; /* 移除边框，避免直角边 */
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
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
      border-radius: 16px; /* 与 container 保持一致的圆角半径 */
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
}

module.exports = StartupManager;
