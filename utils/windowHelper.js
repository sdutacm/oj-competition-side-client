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
    }
  };

  const windowOptions = { ...defaultOptions, ...options };
  
  const newWin = new BrowserWindow(windowOptions);
  newWin.loadURL(url);
  
  return newWin;
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
