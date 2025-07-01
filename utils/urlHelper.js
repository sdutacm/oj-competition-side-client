const urlModule = require('url');

/**
 * 从 URL 中提取主机名
 * @param {string} targetUrl - 目标 URL
 * @returns {string|null} 主机名或 null
 */
function getHostname(targetUrl) {
  try {
    return new urlModule.URL(targetUrl).hostname;
  } catch {
    return null;
  }
}

module.exports = {
  getHostname
};
