const { dialog } = require('electron');

/**
 * 显示域名拦截对话框
 * @param {BrowserWindow} parentWindow - 父窗口
 * @param {string} hostname - 被拦截的域名
 * @param {string} reason - 拦截原因
 */
function showBlockedDialog(parentWindow, hostname, reason) {
  const messages = [
    '哎呀~ (´･ω･`) 这个网站暂时进不去呢！',
    '诶？！(°ロ°) 这里似乎不能访问哦~',
    '呜呜~ (｡•́︿•̀｡) 前方道路被封锁了！',
    '欸嘿~ (＾◡＾) 小主人，这个地方去不了呢！',
    '咦？(⊙_⊙) 这个网站好像不在允许名单里呢~'
  ];

  const details = [
    `目标网站：${hostname} ✨\n拦截原因：${reason}\n\n(｡♥‿♥｡) 为了您的安全，我们暂时阻止了这次访问~`,
    `被拦截的网站：${hostname} 🌸\n详细说明：${reason}\n\n(◕‿◕) 不要担心，这是为了保护您的浏览安全呢！`,
    `无法访问：${hostname} 🎀\n原因说明：${reason}\n\n(´∀｀) 让我们回到安全的页面继续浏览吧~`
  ];

  const buttons = [
    '好的，我知道了 (´▽`)',
    '了解~ (◡ ‿ ◡)',
    '明白啦！(•‿•)',
    '收到~ (＾▽＾)'
  ];

  // 随机选择消息内容
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];
  const randomDetail = details[Math.floor(Math.random() * details.length)];
  const randomButton = buttons[Math.floor(Math.random() * buttons.length)];

  dialog.showMessageBox(parentWindow, {
    type: 'info',
    title: '访问提醒 (◕‿◕)✨',
    message: randomMessage,
    detail: randomDetail,
    buttons: [randomButton],
    defaultId: 0,
    icon: null
  });
}

module.exports = {
  showBlockedDialog
};
