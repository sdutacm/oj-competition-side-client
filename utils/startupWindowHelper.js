const { BrowserWindow } = require('electron');
const { calculateCenteredPosition } = require('./screenCenterPosition');

/**
 * 创建启动窗口（无框、透明、圆角、严格居中）
 * @param {string} htmlContent - 启动窗口 HTML 内容
 * @param {object} [options] - 可选参数（width, height, onClose, onShow, duration）
 * @returns {BrowserWindow}
 */
function createStartupWindow(htmlContent, options = {}) {
  const width = options.width || 1000;
  const height = options.height || 600;
  const centeredPosition = calculateCenteredPosition(width, height);
  const windowOptions = {
    width,
    height,
    x: centeredPosition.x,
    y: centeredPosition.y,
    frame: false,
    resizable: false,
    alwaysOnTop: false,
    show: false,
    transparent: true,
    backgroundColor: 'rgba(0,0,0,0)',
    hasShadow: false,
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false,
      backgroundThrottling: false
    }
  };
  const startupWindow = new BrowserWindow(windowOptions);
  const startupDataURL = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
  startupWindow.loadURL(startupDataURL);
  startupWindow.webContents.once('dom-ready', () => {
    if (process.platform === 'win32') {
      startupWindow.setBackgroundColor('rgba(0,0,0,0)');
    }
    // 圆角遮罩
    startupWindow.webContents.executeJavaScript(`
      document.body.style.cssText += ` +
        "'-webkit-clip-path: inset(0 round 12px);clip-path: inset(0 round 12px);border-radius: 12px;overflow: hidden;'" +
      ";");
    startupWindow.show();
    if (typeof options.onShow === 'function') options.onShow(startupWindow);
    // 自动关闭
    if (options.duration) {
      setTimeout(() => {
        startupWindow.close();
      }, options.duration);
    }
  });
  startupWindow.on('closed', () => {
    if (typeof options.onClose === 'function') options.onClose();
  });
  return startupWindow;
}

module.exports = { createStartupWindow };
