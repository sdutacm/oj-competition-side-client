const { dialog } = require('electron');

/**
 * 显示域名拦截对话框
 * @param {BrowserWindow} parentWindow - 父窗口
 * @param {string} hostname - 被拦截的域名
 * @param {string} reason - 拦截原因
 */
function showBlockedDialog(parentWindow, hostname, reason) {
  dialog.showMessageBox(parentWindow, {
    type: 'warning',
    title: '访问拦截 ⛔️',
    message: '网站访问被阻止',
    detail: `域名：${hostname}\n原因：${reason}`,
    buttons: ['确定'],
    defaultId: 0,
    icon: null
  });
}

module.exports = {
  showBlockedDialog
};
