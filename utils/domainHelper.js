const { getHostname } = require('./urlHelper');
const { showBlockedDialog } = require('./dialogHelper');

/**
 * 统一判断域名是否允许访问
 * @param {string} domain - 目标域名
 * @param {object} config - 配置对象，需包含 MAIN_DOMAIN/POPUP_WHITELIST/BLOCKED_DOMAINS
 * @param {boolean} isMainWindow - 是否主窗口
 * @returns {object} { allowed: boolean, reason: string|null }
 */
function checkDomainAllowed(domain, config, isMainWindow = false) {
  if (!domain) {
    return { allowed: false, reason: '无效域名' };
  }
  // 黑名单优先，拦截黑名单及其所有子域名
  if (config.BLOCKED_DOMAINS && config.BLOCKED_DOMAINS.size > 0) {
    for (const blockedDomain of config.BLOCKED_DOMAINS) {
      if (domain === blockedDomain || domain.endsWith('.' + blockedDomain)) {
        return { allowed: false, reason: '该域名已被明确禁止访问' };
      }
    }
  }
  // 主窗口允许主域名及其子域名、白名单及其子域名
  if (isMainWindow) {
    const mainDomain = config.MAIN_DOMAIN;
    if (domain === mainDomain || domain.endsWith('.' + mainDomain)) {
      return { allowed: true, reason: null };
    }
    if (config.POPUP_WHITELIST && config.POPUP_WHITELIST.size > 0) {
      for (const allowedDomain of config.POPUP_WHITELIST) {
        if (domain === allowedDomain || domain.endsWith('.' + allowedDomain)) {
          return { allowed: true, reason: null };
        }
      }
    }
    // 其它域名不允许
    return { allowed: false, reason: '该域名不在主窗口允许访问范围' };
  }
  // 弹窗严格校验白名单
  if (config.POPUP_WHITELIST && config.POPUP_WHITELIST.size > 0) {
    let allowed = false;
    for (const allowedDomain of config.POPUP_WHITELIST) {
      if (domain === allowedDomain || domain.endsWith('.' + allowedDomain)) {
        allowed = true;
        break;
      }
    }
    if (!allowed) {
      return { allowed: false, reason: '该域名不在允许访问的白名单中' };
    }
  }
  return { allowed: true, reason: null };
}

/**
 * 统一拦截并弹窗提示（如不允许则自动关闭弹窗窗口）
 * @param {BrowserWindow} win
 * @param {string} url
 * @param {object} config
 * @param {boolean} isMainWindow
 * @returns {boolean} 是否允许访问
 */
function interceptDomain(win, url, config, isMainWindow = false) {
  const domain = getHostname(url);
  const { allowed, reason } = checkDomainAllowed(domain, config, isMainWindow);
  if (!allowed) {
    showBlockedDialog(win, domain, reason);
    if (!isMainWindow) {
      win.hide();
      win.close();
    }
    return false;
  }
  return true;
}

module.exports = {
  checkDomainAllowed,
  interceptDomain
};
