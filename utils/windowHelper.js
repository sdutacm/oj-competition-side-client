const { BrowserWindow } = require('electron');
const path = require('path');

/**
 * 创建新窗口
 * @param {string} url - 要加载的 URL
 * @param {Object} options - 窗口选项
 */
function createNewWindow(url, options = {}) {
  const defaultOptions = {
    width: 1280,
    height: 800,
    icon: path.join(__dirname, '../public/favicon.png'), // 设置应用图标
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false, // 禁用开发者工具
    }
  };

  const windowOptions = { ...defaultOptions, ...options };
  
  const newWin = new BrowserWindow(windowOptions);
  
  // 禁用新窗口的开发者工具相关功能
  disableDevToolsForWindow(newWin);
  
  newWin.loadURL(url);
  
  return newWin;
}

/**
 * 为指定窗口禁用开发者工具
 */
function disableDevToolsForWindow(window) {
  if (window && window.webContents) {
    // 隐藏菜单栏
    window.setMenuBarVisibility(false);
    
    // 禁用右键菜单
    window.webContents.on('context-menu', (event) => {
      event.preventDefault();
    });

    // 禁用开发者工具快捷键
    window.webContents.on('before-input-event', (event, input) => {
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
}

/**
 * 布局视图管理器
 */
class LayoutManager {
  constructor(mainWindow, toolbarManager, contentViewManager) {
    this.mainWindow = mainWindow;
    this.toolbarManager = toolbarManager;
    this.contentViewManager = contentViewManager;
    this.toolbarHeight = 48;
  }

  /**
   * 布局所有视图
   */
  layoutViews() {
    const bounds = this.mainWindow.getBounds();
    
    // 设置工具栏位置（顶部）
    this.toolbarManager.setBounds({ 
      x: 0, 
      y: 0, 
      width: bounds.width, 
      height: this.toolbarHeight 
    });
    
    // 设置内容视图位置（工具栏下方）
    this.contentViewManager.setBounds({ 
      x: 0, 
      y: this.toolbarHeight, 
      width: bounds.width, 
      height: bounds.height - this.toolbarHeight 
    });
  }

  /**
   * 监听窗口大小变化
   */
  setupResizeListener() {
    this.mainWindow.on('resize', () => {
      this.layoutViews();
    });
  }
}

module.exports = {
  createNewWindow,
  LayoutManager
};
