const { BrowserWindow, app, screen } = require('electron');
const fs = require('fs');
const path = require('path');
const { getFormattedVersion } = require('./versionHelper');
const { calculateCenteredPosition } = require('./screenCenterPosition');

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
        console.log('First time startup - will show startup window');
        return true;
      }

      const state = JSON.parse(fs.readFileSync(this.startupStateFile, 'utf8'));
      const shouldShow = state.showStartupOnNextLaunch === true;
      return shouldShow;
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
    const { createStartupWindow } = require('./startupWindowHelper');
    const html = this.getStartupHTML();
    return createStartupWindow(html, {
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
      }
    }

    html, body {
      height: 100%;
      width: 100%;
      font-family: "Segoe UI", "Helvetica Neue", sans-serif;
      color: var(--text-primary);
      overflow: hidden;
      line-height: 1.5;
      margin: 0;
      padding: 0;
      border: none;
      outline: none;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
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
        background: linear-gradient(135deg, transparent 0%, var(--accent-color) 50%, transparent 100%), radial-gradient(ellipse at center, transparent 60%, var(--accent-color) 100%);
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
        <p class="version">${getFormattedVersion()}</p>
      </div>
    </div>
  </body>
</html>`;
  }
}

module.exports = StartupManager;
