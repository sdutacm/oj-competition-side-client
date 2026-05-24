const fallbackClient = {
  async getInitialState() {
    return {
      version: 'dev',
      platform: 'browser',
      theme: window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      view: new URLSearchParams(window.location.search).get('view') || 'shell',
      homeUrl: '',
      canGoBack: false,
      canGoForward: false,
      title: ''
    };
  },
  async navigate() {
    return false;
  },
  async checkUpdate() {
    return {
      hasUpdate: false,
      currentVersion: 'dev',
      error: '当前运行在浏览器预览模式，更新检测需要在 Electron 中使用。'
    };
  },
  async openDownloadPage() {
    return false;
  },
  async resetClient() {
    return false;
  },
  async openUtilityWindow() {
    return false;
  },
  async controlWindow() {
    return false;
  },
  onNavigationState() {
    return () => {};
  },
  onPageTitle() {
    return () => {};
  },
  onTheme() {
    return () => {};
  }
};

export function getClientApi() {
  return window.ojClient || fallbackClient;
}
