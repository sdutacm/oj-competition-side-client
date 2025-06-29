const { app, BrowserWindow, Menu, dialog } = require('electron');
const urlModule = require('url');

let mainWindow = null;

// 主页面地址
const HOME_URL = 'https://op.sdutacm.cn/';

// 主窗口允许访问的根域名（支持子路径）
const MAIN_DOMAIN = 'op.sdutacm.cn';

// 新窗口白名单域名
const POPUP_WHITELIST = new Set([
  'rl.algoux.cn',
  'rl.algoux.org',
  'rank.ac',
  'acm.sdut.edu.cn'
]);

// 显式禁止的域名（如 oj.sdutacm.cn）
const BLOCKED_DOMAINS = new Set([
  'oj.sdutacm.cn'
]);

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  mainWindow.loadURL(HOME_URL);

  function getHostname(targetUrl) {
    try {
      return new urlModule.URL(targetUrl).hostname;
    } catch {
      return null;
    }
  }

  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    const hostname = getHostname(targetUrl);
    if (!hostname) {
      event.preventDefault();
      return;
    }

    // 拦截禁止访问的域名
    if (BLOCKED_DOMAINS.has(hostname)) {
      event.preventDefault();
      console.log(`⛔ 拦截禁止域名：${hostname}`);
      showBlockedDialog(hostname, '该域名已被明确禁止访问');
      return;
    }

    if (hostname === MAIN_DOMAIN) {
      // 允许 op.sdutacm.cn 主窗口跳转
      return;
    }

    if (POPUP_WHITELIST.has(hostname)) {
      // 弹出新窗口
      event.preventDefault();
      openNewWindow(targetUrl);
      return;
    }

    // 其余一律禁止
    event.preventDefault();
    // console.log(`⛔ 拦截非白名单域名：${hostname}`);
    showBlockedDialog(hostname, '该域名不在允许访问的白名单中');
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const hostname = getHostname(url);
    if (POPUP_WHITELIST.has(hostname)) {
      openNewWindow(url);
    } else {
      // 显示拦截弹窗
      showBlockedDialog(hostname, '该域名不在允许访问的白名单中');
    }
    return { action: 'deny' };
  });

  const menuTemplate = [
    {
      label: 'Back',
      accelerator: 'CmdOrCtrl+Left',
      click: () => {
        if (mainWindow.webContents.canGoBack()) mainWindow.webContents.goBack();
      }
    },
    {
      label: 'Forward',
      accelerator: 'CmdOrCtrl+Right',
      click: () => {
        if (mainWindow.webContents.canGoForward()) mainWindow.webContents.goForward();
      }
    },
    {
      label: 'Refresh',
      accelerator: 'CmdOrCtrl+R',
      click: () => mainWindow.webContents.reload()
    },
    {
      label: 'Home',
      accelerator: 'CmdOrCtrl+H',
      click: () => mainWindow.loadURL(HOME_URL)
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  function showBlockedDialog(hostname, reason) {
    dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: '访问拦截 ⛔️',
      message: '网站访问被阻止',
      detail: `域名：${hostname}\n原因：${reason}`,
      buttons: ['确定'],
      defaultId: 0,
      icon: null
    });
  }

  function openNewWindow(url) {
    const newWin = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      }
    });
    newWin.loadURL(url);
  }
});
