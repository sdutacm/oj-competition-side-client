const fs = require('fs');
const path = require('path');

// 版本号缓存，避免重复读取package.json文件
let versionCache = null;

/**
 * 获取应用版本号
 * 从 package.json 文件中读取版本号，如果读取失败则返回默认版本号
 * @param {string} defaultVersion - 默认版本号，默认为 package.json 版本
 * @returns {string} 版本号
 */
function getAppVersion(defaultVersion) {
  // 如果已有缓存，直接返回，避免重复文件读取
  if (versionCache !== null) {
    return versionCache;
  }

  try {
    // 从当前文件向上查找 package.json
    const packageJsonPath = path.join(__dirname, '../package.json');
    
    // 检查文件是否存在
    if (!fs.existsSync(packageJsonPath)) {
      const fallback = defaultVersion || '1.0.0';
      console.warn('package.json 文件不存在，使用默认版本号:', fallback);
      versionCache = fallback; // 缓存默认版本
      return fallback;
    }
    
    // 读取并解析 package.json（只读取一次）
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // 获取版本号，如果不存在则使用默认值
    const version = packageJson.version;
    if (!version) {
      const fallback = defaultVersion || '0.0.0';
      console.warn('package.json 中未找到版本号，使用默认版本号:', fallback);
      versionCache = fallback; // 缓存默认版本
      return fallback;
    }
    
    // 缓存版本号，避免后续重复读取
    versionCache = version;
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
