const { dialog, BrowserWindow, shell } = require('electron');
const path = require('path');
const { getChineseFormattedVersion, getAppVersion } = require('./versionHelper');
const PlatformHelper = require('./platformHelper');

/**
 * 显示域名拦截对话框
 * @param {BrowserWindow} parentWindow - 父窗口
 * @param {string} hostname - 被拦截的域名
 * @param {string} reason - 拦截原因
 * @param {string} type - 拦截类型（可选：'redirect' | 'default'）
 * @param {Function} [callback] - 弹窗关闭后的回调
 */
function showBlockedDialog(parentWindow, hostname, reason, type = 'default', callback) {
  const messages = {
    default: [
      '哎呀~比赛期间不能访问这个网站哦！',
      '注意，这里在比赛模式下无法打开。',
      '抱歉，比赛规则限制了该网站的访问。',
      '请专注比赛，暂时无法访问此页面。',
      '当前环境仅允许访问指定网站。',
      '比赛模式已开启，请专心答题！'
    ],
    redirect: [
      '检测到页面发生重定向，目标网站不在允许范围，已为你拦截！',
      '页面重定向被拦截，保护你的比赛环境！'
    ]
  };
  const details = {
    default: [
      `目标网站：${hostname}  \n拦截原因：${reason}\n\n比赛期间只能访问指定网站，祝你取得好成绩！`,
      `被拦截的网站：${hostname}  \n详细说明：${reason}\n\n请将注意力集中在比赛题目上，加油！`,
      `无法访问：${hostname}  \n原因说明：${reason}\n\n比赛模式下仅可使用允许的网站。`,
      `访问限制：${hostname}  \n限制说明：${reason}\n\n专注比赛才能发挥最佳水平！`,
      `网站屏蔽：${hostname}  \n屏蔽原因：${reason}\n\n比赛环境需要保持纯净，回到题目页面继续努力吧！`
    ],
    redirect: [
      `检测到页面发生重定向，目标网站：${hostname} 已被系统拦截！\n原因：${reason}\n\n比赛期间请勿访问非指定网站，祝你取得好成绩！`,
      `页面重定向到 ${hostname} 已被拦截，保护你的比赛环境！\n原因：${reason}\n\n继续加油！`
    ]
  };
  const buttons = [
    '好的，专心比赛！',
    '了解，继续答题！',
    '明白啦，回去做题！',
    '收到，加油比赛！',
    '知道了，Focus！'
  ];
  const msgArr = messages[type] || messages.default;
  const detArr = details[type] || details.default;
  const randomMessage = msgArr[Math.floor(Math.random() * msgArr.length)];
  const randomDetail = detArr[Math.floor(Math.random() * detArr.length)];
  const randomButton = buttons[Math.floor(Math.random() * buttons.length)];

  const titles = [
    '比赛模式提醒',
    '访问限制通知',
    '安全提示',
    '访问被拦截',
    '专注比赛',
    '系统提示'
  ];
  const randomTitle = titles[Math.floor(Math.random() * titles.length)];
  
  // 所有平台都使用原生弹窗
  const opts = {
    type: 'info',
    title: randomTitle,
    message: randomMessage,
    detail: randomDetail,
    buttons: [randomButton],
    defaultId: 0,
    icon: null
  };
  if (process.platform === 'darwin') {
    opts.message = randomMessage;
    opts.modal = true;
    opts.noLink = true;
  }
  
  dialog.showMessageBox(parentWindow, opts).then(() => {
    if (parentWindow && process.platform === 'darwin') {
      try { parentWindow.focus(); } catch {}
    }
    if (typeof callback === 'function') callback();
  });
}

// 全局变量跟踪当前打开的系统信息窗口
let currentInfoWindow = null;

/**
 * 检查指定窗口是否是关于窗口
 * @param {BrowserWindow} window - 要检查的窗口
 * @returns {boolean} 如果是关于窗口返回 true
 */
function isAboutWindow(window) {
  return currentInfoWindow && !currentInfoWindow.isDestroyed() && currentInfoWindow === window;
}

/**
 * 显示系统信息对话框
 * @param {BrowserWindow} parentWindow - 父窗口
 */
function showInfoDialog(parentWindow) {
  console.log('showInfoDialog 被调用');
  
  // 获取系统信息
  const appVersion = getChineseFormattedVersion();
  const electronVersion = process.versions.electron;
  const nodeVersion = process.versions.node;
  const chromiumVersion = process.versions.chrome;
  const v8Version = process.versions.v8;
  
  // 构建详细信息文本
  const detailText = `应用版本：${appVersion}
Electron：${electronVersion}
Node.js：${nodeVersion}
Chromium：${chromiumVersion}
V8：${v8Version}

开发团队：SDUTACM
项目地址：https://github.com/sdutacm/oj-competition-side-client
官方网站：https://oj.sdutacm.cn/onlinejudge3/`;

  // 对话框选项
  const options = {
    type: 'info',
    title: '关于 SDUT OJ 竞赛客户端',
    message: 'SDUT OJ 竞赛客户端',
    detail: detailText,
    buttons: ['确定', '复制信息'],
    defaultId: 0,
    cancelId: 0,
    noLink: true
  };

  // 显示对话框
  dialog.showMessageBox(parentWindow, options).then((result) => {
    console.log('系统信息对话框结果:', result);
    
    if (result.response === 1) { // 复制信息按钮
      const { clipboard } = require('electron');
      const copyText = `SDUT OJ 竞赛客户端 ${appVersion}

系统信息：
- Electron: ${electronVersion}
- Node.js: ${nodeVersion}
- Chromium: ${chromiumVersion}
- V8: ${v8Version}

开发团队：SDUTACM
项目地址：https://github.com/sdutacm/oj-competition-side-client
官方网站：https://oj.sdutacm.cn/onlinejudge3/`;
      
      clipboard.writeText(copyText);
      console.log('系统信息已复制到剪贴板');
    }
  }).catch((error) => {
    console.error('显示系统信息对话框时出错:', error);
  });
}

// 防抖弹窗，防止同一窗口/类型短时间重复弹窗
let lastBlockedUrl = '';
let lastBlockedType = '';
let lastBlockedTime = 0;
function showBlockedDialogWithDebounce(win, url, message, type = 'default') {
  const now = Date.now();
  if (url === lastBlockedUrl && type === lastBlockedType && now - lastBlockedTime < 1000) {
    return;
  }
  lastBlockedUrl = url;
  lastBlockedType = type;
  lastBlockedTime = now;
  showBlockedDialog(win, url, message, type);
}

module.exports = {
  showBlockedDialog,
  showBlockedDialogWithDebounce,
  showInfoDialog,
  isAboutWindow
};
