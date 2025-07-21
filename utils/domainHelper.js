const { getHostname } = require('./urlHelper');
const { showBlockedDialog } = require('./dialogHelper');

/**
 * 统一判断弹窗只允许白名单，主窗口允许主域名和白名单
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
  if (isMainWindow) {
    // 主窗口允许主域名和白名单
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
 * @param {string} type - 拦截类型（可选：'redirect' | 'default'）
 * @returns {boolean} 是否允许访问
 */
function interceptDomain(win, url, config, isMainWindow = false, type = 'default') {
  const domain = getHostname(url);
  const { allowed, reason } = checkDomainAllowed(domain, config, isMainWindow);
  if (!allowed) {
    showBlockedDialog(win, domain, reason, type);
    if (!isMainWindow) {
      win.hide();
      win.close();
    }
    return false;
  }
  return true;
}

/**
 * 判断 url 是否属于白名单域名
 * @param {string} url
 * @param {object} config
 * @returns {boolean}
 */
function isWhiteDomain(url, config) {
  const domain = getHostname(url);
  if (!domain || !config || !config.POPUP_WHITELIST) return false;
  for (const allowedDomain of config.POPUP_WHITELIST) {
    if (domain === allowedDomain || domain.endsWith('.' + allowedDomain)) {
      return true;
    }
  }
  return false;
}

module.exports = {
  checkDomainAllowed,
  interceptDomain,
  isWhiteDomain
};
