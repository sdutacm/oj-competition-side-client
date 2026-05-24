const APP_CONFIG = {
  HOME_URL: 'https://op.sdutacm.cn/onlinejudge3_cs/competitions',
  MAIN_DOMAIN: 'op.sdutacm.cn',
  DOWNLOAD_URL: 'https://oj.sdutacm.cn/oj-competition-side-client/',
  POPUP_WHITELIST: new Set([
    'rl.algoux.cn',
    'rl.algoux.org',
    'rank.ac',
    'acm.sdut.edu.cn',
    'cdn.shaly.sdutacm.cn',
    'cdn.sdutacm.cn',
    'cdn.algoux.cn',
    'rl-api.algoux.cn',
    'algoux-rl.cdn.blueverse.cc'
  ]),
  BLOCKED_DOMAINS: new Set([])
};

module.exports = APP_CONFIG;
