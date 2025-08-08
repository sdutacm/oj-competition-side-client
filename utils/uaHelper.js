const fs = require('fs');
const path = require('path');

/**
 * 获取自定义 User-Agent 字符串，自动拼接版本号
 * @param {string} defaultUserAgent
 * @returns {string}
 */
function getCustomUserAgent(defaultUserAgent) {
  const { getAppVersion } = require('./versionHelper');
  let pkgVersion = getAppVersion();
  return `${defaultUserAgent} SDUTOJCompetitionSideClient/${pkgVersion}`;
}

module.exports = { getCustomUserAgent };
