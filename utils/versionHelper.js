const fs = require('fs');
const path = require('path');

/**
 * 获取应用版本号
 * 从 package.json 文件中读取版本号，如果读取失败则返回默认版本号
 * @param {string} defaultVersion - 默认版本号，默认为 package.json 版本
 * @returns {string} 版本号
 */
function getAppVersion(defaultVersion) {
  try {
    // 从当前文件向上查找 package.json
    const packageJsonPath = path.join(__dirname, '../package.json');
    
    // 检查文件是否存在
    if (!fs.existsSync(packageJsonPath)) {
      const fallback = defaultVersion || '1.0.0';
      console.warn('package.json 文件不存在，使用默认版本号:', fallback);
      return fallback;
    }
    
    // 读取并解析 package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // 获取版本号，如果不存在则使用默认值
    const version = packageJson.version;
    if (!version) {
      const fallback = defaultVersion || '0.0.0';
      console.warn('package.json 中未找到版本号，使用默认版本号:', fallback);
      return fallback;
    }
    
    console.log('成功读取应用版本号:', version);
    return version;
  } catch (error) {
    console.warn('读取 package.json 版本号失败，使用默认版本号:', error.message);
  return defaultVersion || '0.0.0';
  }
}


/**
 * 获取格式化的版本字符串
 * @param {string} prefix - 版本号前缀，默认为 'version '
 * @param {string} defaultVersion - 默认版本号
 * @returns {string} 格式化的版本字符串，如 'version 1.4.10'
 */
function getFormattedVersion(prefix = 'version ', defaultVersion) {
  return prefix + getAppVersion(defaultVersion);
}

/**
 * 获取中文格式化的版本字符串
 * @param {string} defaultVersion - 默认版本号
 * @returns {string} 中文格式化的版本字符串，如 '版本 1.4.10'
 */
function getChineseFormattedVersion(defaultVersion) {
  return '版本 ' + getAppVersion(defaultVersion);
}

module.exports = {
  getAppVersion,
  getFormattedVersion,
  getChineseFormattedVersion
};
