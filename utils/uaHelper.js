const fs = require('fs');
const path = require('path');

/**
 * 获取自定义 User-Agent 字符串，自动拼接版本号
 * @param {string} defaultUserAgent
 * @returns {string}
 */
function getCustomUserAgent(defaultUserAgent) {
  let pkgVersion = '1.0.0';
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
    if (pkg && pkg.version) pkgVersion = pkg.version;
  } catch {}
  return `${defaultUserAgent} SDUTOJCompetitionSideClient/${pkgVersion}`;
}

module.exports = { getCustomUserAgent };
