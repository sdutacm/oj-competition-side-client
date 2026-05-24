const path = require('path');
const { pathToFileURL } = require('url');
const { app, BrowserWindow, BrowserView, ipcMain, nativeTheme, dialog, shell, Menu } = require('electron');
const APP_CONFIG = require('./appConfig');
const { getHostname } = require('../../utils/urlHelper');
const { checkDomainAllowed, isWhiteDomain } = require('../../utils/domainHelper');
const { getCustomUserAgent } = require('../../utils/uaHelper');
const { getAppVersion } = require('../../utils/versionHelper');
const UpdateManager = require('../../utils/updateManager');
const { calculateCenteredPosition } = require('../../utils/screenCenterPosition');

const TOOLBAR_HEIGHT = 44;
const WINDOW_SIZE = { width: 1400, height: 900 };
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

if (process.platform === 'win32') {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('--disable-gpu');
  app.commandLine.appendSwitch('--disable-gpu-compositing');
  app.commandLine.appendSwitch('--disable-gpu-rasterization');
  app.commandLine.appendSwitch('--disable-gpu-sandbox');
  app.commandLine.appendSwitch('--disable-software-rasterizer');
  app.commandLine.appendSwitch('--disable-webgl');
  app.commandLine.appendSwitch('--disable-webgl2');
}

let mainState = null;
let updateManager = null;
let confirmedQuit = false;
const windowStates = new Map();
const domainWindows = new Map();
const utilityWindows = new Map();

function normalizeUrl(url) {
  try {
    return new URL(url).href;
  } catch {
    return url || '';
  }
}

function isMainDomain(domain) {
  return Boolean(domain && (domain === APP_CONFIG.MAIN_DOMAIN || domain.endsWith(`.${APP_CONFIG.MAIN_DOMAIN}`)));
}

function isAllowedInShell(url, isMainWindow) {
  const domain = getHostname(url);
  const result = checkDomainAllowed(domain, APP_CONFIG, isMainWindow);
  return result.allowed;
}

function rendererUrl(view = 'shell') {
  const suffix = `?view=${encodeURIComponent(view)}`;
  if (!app.isPackaged) return `${DEV_SERVER_URL}${suffix}`;
  return `${pathToFileURL(path.join(app.getAppPath(), 'dist', 'renderer', 'index.html')).href}${suffix}`;
}

function getBackgroundColor() {
  return nativeTheme.shouldUseDarkColors ? '#141414' : '#ffffff';
}

function getStateFromWebContents(webContents) {
  const win = BrowserWindow.fromWebContents(webContents);
  return win ? windowStates.get(win.id) : null;
}

function sendToShell(state, channel, payload) {
  if (!state || state.window.isDestroyed()) return;
  state.window.webContents.send(channel, payload);
}

function updateNavigationState(state) {
  const webContents = state?.view?.webContents;
  if (!webContents || webContents.isDestroyed()) return;
  sendToShell(state, 'browser:navigation-state', {
    canGoBack: webContents.canGoBack(),
    canGoForward: webContents.canGoForward(),
    url: webContents.getURL(),
    domain: getHostname(webContents.getURL()),
    title: webContents.getTitle()
  });
}

function platformWindowOptions() {
  if (process.platform === 'darwin') {
    return {
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 14, y: 12 }
    };
  }
  return { frame: false };
}

function focusWindow(win) {
  if (!win || win.isDestroyed()) return;
  if (win.isMinimized()) win.restore();
  if (!win.isVisible()) win.show();
  win.focus();
}

function layoutBrowserView(state) {
  if (!state || state.window.isDestroyed() || !state.view) return;
  const bounds = state.window.getContentBounds();
  state.view.setBounds({
    x: 0,
    y: TOOLBAR_HEIGHT,
    width: bounds.width,
    height: Math.max(0, bounds.height - TOOLBAR_HEIGHT)
  });
  state.view.setAutoResize({ width: true, height: true });
}

function bindContentEvents(state) {
  const webContents = state.view.webContents;

  webContents.on('page-title-updated', (event, title) => {
    event.preventDefault();
    if (!state.window.isDestroyed()) {
      state.window.setTitle(title);
      sendToShell(state, 'browser:page-title', title);
    }
  });

  const refreshState = (_event, url) => {
    if (url) {
      state.lastUrl = normalizeUrl(url);
      const domain = getHostname(url);
      if (domain && !state.isMainWindow) {
        if (state.domain && domainWindows.get(state.domain) === state) {
          domainWindows.delete(state.domain);
        }
        state.domain = domain;
        domainWindows.set(domain, state);
      }
    }
    updateNavigationState(state);
  };

  webContents.on('did-navigate', refreshState);
  webContents.on('did-navigate-in-page', refreshState);
  webContents.on('did-finish-load', () => updateNavigationState(state));
  webContents.on('did-start-loading', () => updateNavigationState(state));
  webContents.on('did-stop-loading', () => updateNavigationState(state));

  webContents.on('will-navigate', (event, targetUrl) => {
    if (handleNavigationRequest(state, targetUrl)) {
      event.preventDefault();
    }
  });

  webContents.on('will-redirect', (event, targetUrl) => {
    const domain = getHostname(targetUrl);
    if (!isMainDomain(domain) && !isWhiteDomain(targetUrl, APP_CONFIG)) {
      event.preventDefault();
      showBlockedDialog(state.window, domain, '非法重定向拦截，已阻止跳转');
    }
  });

  webContents.setWindowOpenHandler(({ url }) => {
    if (handleNavigationRequest(state, url)) {
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  webContents.on('before-input-event', (event, input) => {
    if (isDevtoolsShortcut(input)) {
      event.preventDefault();
    }
  });
}

function isDevtoolsShortcut(input) {
  return (
    input.key === 'F12' ||
    (input.control && input.shift && ['I', 'J'].includes(input.key.toUpperCase())) ||
    (input.meta && input.alt && ['I', 'J'].includes(input.key.toUpperCase())) ||
    (input.control && input.key.toUpperCase() === 'U') ||
    (input.meta && input.key.toUpperCase() === 'U')
  );
}

function handleNavigationRequest(state, targetUrl) {
  const domain = getHostname(targetUrl);
  if (!domain) return false;

  if (domain.includes('github.com')) {
    showBlockedDialog(state.window, domain, '该域名不在允许访问范围');
    return true;
  }

  if (state.isMainWindow) {
    if (isMainDomain(domain)) return false;
    if (isWhiteDomain(targetUrl, APP_CONFIG)) {
      openManagedWindow(targetUrl);
      return true;
    }
    showBlockedDialog(state.window, domain, '该域名不在主窗口允许访问范围');
    return true;
  }

  if (domain === state.domain || isMainDomain(domain)) return false;

  if (isWhiteDomain(targetUrl, APP_CONFIG)) {
    openManagedWindow(targetUrl);
    return true;
  }

  showBlockedDialog(state.window, domain, '该域名不在允许访问范围');
  return true;
}

function showBlockedDialog(parentWindow, domain, reason) {
  dialog.showMessageBox(parentWindow, {
    type: 'warning',
    title: '访问已拦截',
    message: '该页面不在允许访问范围内',
    detail: `域名: ${domain || '未知'}\n原因: ${reason}`,
    buttons: ['确定'],
    noLink: true
  }).catch(() => {});
}

function createContentView(state, url) {
  const view = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      spellcheck: false,
      webgl: false,
      enableWebSQL: false,
      backgroundColor: getBackgroundColor(),
      ...(process.platform === 'win32' ? { hardwareAcceleration: false, offscreen: false } : {})
    }
  });

  const defaultUserAgent = view.webContents.getUserAgent();
  view.webContents.setUserAgent(getCustomUserAgent(defaultUserAgent));

  state.window.addBrowserView(view);
  state.view = view;
  bindContentEvents(state);
  layoutBrowserView(state);

  if (isAllowedInShell(url, state.isMainWindow)) {
    state.lastUrl = normalizeUrl(url);
    view.webContents.loadURL(url);
  } else {
    showBlockedDialog(state.window, getHostname(url), '首次加载 URL 不在允许访问范围');
  }
}

function createShellWindow({ url, isMainWindow = false }) {
  const center = calculateCenteredPosition(WINDOW_SIZE.width, WINDOW_SIZE.height);
  const win = new BrowserWindow({
    ...WINDOW_SIZE,
    x: center.x,
    y: center.y,
    ...platformWindowOptions(),
    show: false,
    backgroundColor: getBackgroundColor(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      devTools: !app.isPackaged
    }
  });

  const domain = getHostname(url);
  const state = {
    window: win,
    view: null,
    type: 'shell',
    isMainWindow,
    domain,
    homeUrl: url,
    lastUrl: normalizeUrl(url)
  };

  windowStates.set(win.id, state);
  if (!isMainWindow && domain) {
    domainWindows.set(domain, state);
  }

  win.loadURL(rendererUrl('shell')).catch((error) => {
    console.error('加载 Vue 渲染进程失败:', error);
  });

  win.once('ready-to-show', () => {
    createContentView(state, url);
    win.show();
    win.focus();
  });

  win.on('close', (event) => {
    if (!state.isMainWindow || confirmedQuit) return;

    event.preventDefault();
    dialog.showMessageBox(win, {
      type: 'question',
      title: '确认关闭',
      message: '确认关闭竞赛客户端？',
      detail: '关闭后当前打开的竞赛页面和子窗口都会退出。',
      buttons: ['取消', '关闭'],
      defaultId: 0,
      cancelId: 0,
      noLink: true
    }).then(({ response }) => {
      if (response !== 1) return;
      confirmedQuit = true;
      app.quit();
    }).catch(() => {});
  });

  win.on('resize', () => layoutBrowserView(state));
  win.on('closed', () => {
    windowStates.delete(win.id);
    if (domainWindows.get(state.domain) === state) {
      domainWindows.delete(state.domain);
    }
    if (mainState === state) {
      mainState = null;
    }
  });

  return state;
}

function createUtilityWindow(type) {
  const existing = utilityWindows.get(type);
  if (existing && !existing.isDestroyed()) {
    focusWindow(existing);
    return existing;
  }

  const config = {
    update: {
      title: '检查更新',
      width: 520,
      height: 360,
      resizable: false
    },
    reset: {
      title: '确认系统重置',
      width: 560,
      height: 420,
      resizable: false
    }
  }[type];

  if (!config) return null;

  const center = calculateCenteredPosition(config.width, config.height);
  const win = new BrowserWindow({
    width: config.width,
    height: config.height,
    minWidth: config.width,
    minHeight: config.height,
    x: center.x,
    y: center.y,
    title: config.title,
    ...platformWindowOptions(),
    resizable: config.resizable,
    maximizable: false,
    minimizable: true,
    show: false,
    backgroundColor: getBackgroundColor(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      devTools: !app.isPackaged
    }
  });

  const state = {
    window: win,
    view: null,
    type: 'utility',
    utilityType: type,
    isMainWindow: false,
    domain: '',
    homeUrl: '',
    lastUrl: ''
  };

  windowStates.set(win.id, state);
  utilityWindows.set(type, win);

  win.loadURL(rendererUrl(type)).catch((error) => {
    console.error(`加载 ${type} 窗口失败:`, error);
  });

  win.once('ready-to-show', () => {
    win.show();
    win.focus();
  });

  win.on('closed', () => {
    windowStates.delete(win.id);
    if (utilityWindows.get(type) === win) {
      utilityWindows.delete(type);
    }
  });

  return win;
}

function openManagedWindow(url) {
  const domain = getHostname(url);
  const existing = domain ? domainWindows.get(domain) : null;
  if (existing && !existing.window.isDestroyed()) {
    const targetUrl = normalizeUrl(url);
    focusWindow(existing.window);
    if (targetUrl !== existing.lastUrl && targetUrl !== normalizeUrl(existing.view?.webContents.getURL())) {
      existing.lastUrl = targetUrl;
      existing.homeUrl = targetUrl;
      existing.view.webContents.loadURL(targetUrl);
    }
    return existing;
  }
  return createShellWindow({ url, isMainWindow: false });
}

function createMainWindow() {
  mainState = createShellWindow({ url: APP_CONFIG.HOME_URL, isMainWindow: true });
}

function getWindowStatePayload(state) {
  const webContents = state?.view?.webContents;
  return {
    version: getAppVersion(),
    platform: process.platform,
    theme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
    view: state?.utilityType || 'shell',
    homeUrl: state?.homeUrl || APP_CONFIG.HOME_URL,
    canGoBack: Boolean(webContents?.canGoBack()),
    canGoForward: Boolean(webContents?.canGoForward()),
    title: webContents?.getTitle() || ''
  };
}

function registerIpc() {
  ipcMain.handle('app:get-initial-state', (event) => getWindowStatePayload(getStateFromWebContents(event.sender)));

  ipcMain.handle('browser:navigate', (event, action) => {
    const state = getStateFromWebContents(event.sender);
    const webContents = state?.view?.webContents;
    if (!state || !webContents || webContents.isDestroyed()) return false;

    if (action === 'back' && webContents.canGoBack()) webContents.goBack();
    if (action === 'forward' && webContents.canGoForward()) webContents.goForward();
    if (action === 'refresh') webContents.reload();
    if (action === 'home') webContents.loadURL(state.homeUrl);
    if (action === 'info') showInfoDialog(state.window);

    updateNavigationState(state);
    return true;
  });

  ipcMain.handle('app:check-update', async () => {
    if (!updateManager) {
      return { hasUpdate: false, error: '更新管理器未初始化' };
    }
    return updateManager.checkForUpdatesQuiet();
  });

  ipcMain.handle('app:open-download-page', () => {
    shell.openExternal(APP_CONFIG.DOWNLOAD_URL);
    return true;
  });

  ipcMain.handle('app:reset-client', async () => {
    await resetClientState();
    return true;
  });

  ipcMain.handle('app:open-utility-window', (_event, type) => {
    createUtilityWindow(type);
    return true;
  });

  ipcMain.handle('window:control', (event, action) => {
    const state = getStateFromWebContents(event.sender);
    const win = state?.window;
    if (!win || win.isDestroyed()) return false;

    if (action === 'minimize') win.minimize();
    if (action === 'maximize') {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
    if (action === 'close') win.close();

    return true;
  });
}

function showInfoDialog(parentWindow) {
  dialog.showMessageBox(parentWindow, {
    type: 'info',
    title: '系统信息',
    message: 'SDUT OJ 竞赛客户端',
    detail: `版本: ${getAppVersion()}\nElectron: ${process.versions.electron}\nChrome: ${process.versions.chrome}\nNode.js: ${process.versions.node}`,
    buttons: ['确定'],
    noLink: true
  }).catch(() => {});
}

async function resetClientState() {
  const sessions = new Set();
  for (const state of windowStates.values()) {
    if (state.view && !state.view.webContents.isDestroyed()) {
      sessions.add(state.view.webContents.session);
    }
    sessions.add(state.window.webContents.session);
  }

  await Promise.all([...sessions].map((item) => item.clearStorageData().catch(() => {})));

  for (const state of [...windowStates.values()]) {
    if (state.type === 'shell' && !state.isMainWindow && !state.window.isDestroyed()) {
      state.window.close();
    }
  }

  if (mainState?.view && !mainState.view.webContents.isDestroyed()) {
    mainState.homeUrl = APP_CONFIG.HOME_URL;
    mainState.lastUrl = normalizeUrl(APP_CONFIG.HOME_URL);
    mainState.view.webContents.loadURL(APP_CONFIG.HOME_URL);
  }
}

function broadcastTheme() {
  const payload = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  for (const state of windowStates.values()) {
    sendToShell(state, 'app:theme', payload);
  }
}

function setupAppEvents() {
  app.on('browser-window-created', (_event, win) => {
    try {
      win.setMenuBarVisibility(false);
      win.setMenu(null);
    } catch {}
  });

  app.on('window-all-closed', () => {
    app.quit();
  });

  app.on('activate', () => {
    if (mainState && !mainState.window.isDestroyed()) {
      focusWindow(mainState.window);
    } else {
      createMainWindow();
    }
  });

  nativeTheme.on('updated', () => {
    for (const state of windowStates.values()) {
      if (!state.window.isDestroyed()) {
        state.window.setBackgroundColor(getBackgroundColor());
        try {
          state.view?.setBackgroundColor(getBackgroundColor());
        } catch {}
      }
    }
    broadcastTheme();
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  updateManager = new UpdateManager();
  registerIpc();
  setupAppEvents();
  createMainWindow();
}).catch((error) => {
  console.error('应用启动失败:', error);
});
