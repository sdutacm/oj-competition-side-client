const { contextBridge, ipcRenderer } = require('electron');

const subscriptions = new Set();

function subscribe(channel, listener) {
  const wrapped = (_event, payload) => listener(payload);
  ipcRenderer.on(channel, wrapped);
  const unsubscribe = () => ipcRenderer.removeListener(channel, wrapped);
  subscriptions.add(unsubscribe);
  return unsubscribe;
}

contextBridge.exposeInMainWorld('ojClient', {
  getInitialState: () => ipcRenderer.invoke('app:get-initial-state'),
  navigate: (action) => ipcRenderer.invoke('browser:navigate', action),
  checkUpdate: () => ipcRenderer.invoke('app:check-update'),
  openDownloadPage: () => ipcRenderer.invoke('app:open-download-page'),
  resetClient: () => ipcRenderer.invoke('app:reset-client'),
  openUtilityWindow: (type) => ipcRenderer.invoke('app:open-utility-window', type),
  controlWindow: (action) => ipcRenderer.invoke('window:control', action),
  onNavigationState: (listener) => subscribe('browser:navigation-state', listener),
  onPageTitle: (listener) => subscribe('browser:page-title', listener),
  onTheme: (listener) => subscribe('app:theme', listener),
  removeAllListeners: () => {
    subscriptions.forEach((unsubscribe) => unsubscribe());
    subscriptions.clear();
  }
});
