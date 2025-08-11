const { net, BrowserWindow, dialog, shell } = require('electron');
const { getAppVersion } = require('./versionHelper');

class UpdateManager {
  constructor() {
    this.currentVersion = getAppVersion();
    this.updateCheckUrl = 'https://api.github.com/repos/sdutacm/oj-competition-side-client/releases/latest';
    this.downloadPageUrl = 'https://oj.sdutacm.cn/oj-competition-side-client/';
    this.isChecking = false;
    this.lastCheckTime = 0;
    this.checkInterval = 4 * 60 * 60 * 1000; // 4小时检查一次
  }

  /**
   * 检查更新
   * @param {boolean} showNoUpdateDialog - 是否在没有更新时显示对话框
   * @returns {Promise<boolean>} 是否有更新
   */
  async checkForUpdates(showNoUpdateDialog = false) {
    const now = Date.now();
    
    // 防止短时间内重复检查，增加最小间隔
    if (this.isChecking || (now - this.lastCheckTime < 120000)) {
      console.log('更新检查正在进行中或刚刚检查过，跳过 (最小间隔2分钟)');
      return false;
    }

    this.isChecking = true;
    this.lastCheckTime = now;
    
    try {
      console.log('开始检查更新，当前版本:', this.currentVersion);
      
      // 使用更短的超时时间，避免长时间阻塞
      const latestVersion = await this.fetchLatestVersion();
      const hasUpdate = this.compareVersions(latestVersion, this.currentVersion) > 0;
      
      console.log('最新版本:', latestVersion, '有更新:', hasUpdate);
      
      if (hasUpdate) {
        // 检查这个版本是否被用户跳过（异步）
        const isSkipped = await this.isVersionSkipped(latestVersion);
        if (isSkipped && !showNoUpdateDialog) {
          console.log('版本', latestVersion, '已被用户跳过，不显示更新提示');
          return false;
        }
        await this.showUpdateDialog(latestVersion);
      } else if (showNoUpdateDialog) {
        await this.showNoUpdateDialog();
      }
      
      return hasUpdate;
    } catch (error) {
      console.error('检查更新失败:', error);
      if (showNoUpdateDialog) {
        await this.showErrorDialog(error.message);
      }
      return false;
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * 从GitHub API获取最新版本
   * @returns {Promise<string>} 最新版本号
   */
  async fetchLatestVersion() {
    return new Promise((resolve, reject) => {
      const request = net.request({
        method: 'GET',
        url: this.updateCheckUrl,
        timeout: 5000 // 减少超时时间到5秒，避免长时间阻塞
      });

      let responseData = '';

      request.on('response', (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        response.on('data', (chunk) => {
          responseData += chunk.toString();
        });

        response.on('end', () => {
          try {
            const data = JSON.parse(responseData);
            const latestVersion = data.tag_name || data.name;
            
            if (!latestVersion) {
              reject(new Error('无法从响应中获取版本信息'));
              return;
            }
            
            // 移除版本号前的v前缀（如果有）
            const cleanVersion = latestVersion.replace(/^v/, '');
            resolve(cleanVersion);
          } catch (parseError) {
            reject(new Error('解析更新信息失败: ' + parseError.message));
          }
        });
      });

      request.on('error', (error) => {
        reject(new Error('网络请求失败: ' + error.message));
      });

      request.on('timeout', () => {
        reject(new Error('请求超时（5秒），请检查网络连接'));
      });

      request.end();
    });
  }

  /**
   * 比较版本号
   * @param {string} version1 
   * @param {string} version2 
   * @returns {number} 1表示version1较新，-1表示version2较新，0表示相同
   */
  compareVersions(version1, version2) {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    const maxLength = Math.max(v1Parts.length, v2Parts.length);
    
    for (let i = 0; i < maxLength; i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }
    
    return 0;
  }

  /**
   * 显示更新可用对话框
   * @param {string} latestVersion 
   */
  async showUpdateDialog(latestVersion) {
    const options = {
      type: 'info',
      title: '发现新版本',
      message: `发现新版本 ${latestVersion}`,
      detail: `当前版本: ${this.currentVersion}\n最新版本: ${latestVersion}\n\n建议更新到最新版本以获得更好的体验和最新功能。`,
      buttons: ['稍后提醒', '立即下载', '跳过此版本'],
      defaultId: 1,
      cancelId: 0,
      noLink: true,
      icon: null
    };

    const result = await dialog.showMessageBox(null, options);
    
    switch (result.response) {
      case 1: // 立即下载
        this.openDownloadPage();
        break;
      case 2: // 跳过此版本
        await this.skipVersion(latestVersion);
        break;
      // case 0: 稍后提醒 - 不做任何操作
    }
  }

  /**
   * 显示无更新对话框
   */
  async showNoUpdateDialog() {
    await dialog.showMessageBox(null, {
      type: 'info',
      title: '已是最新版本',
      message: '当前已是最新版本',
      detail: `当前版本: ${this.currentVersion}\n\n您使用的已经是最新版本，无需更新。`,
      buttons: ['确定'],
      defaultId: 0,
      noLink: true
    });
  }

  /**
   * 显示错误对话框
   * @param {string} errorMessage 
   */
  async showErrorDialog(errorMessage) {
    await dialog.showMessageBox(null, {
      type: 'warning',
      title: '检查更新失败',
      message: '无法检查更新',
      detail: `错误信息: ${errorMessage}\n\n请检查网络连接或稍后重试。`,
      buttons: ['确定'],
      defaultId: 0,
      noLink: true
    });
  }

  /**
   * 打开下载页面
   */
  openDownloadPage() {
    shell.openExternal(this.downloadPageUrl);
  }

  /**
   * 跳过指定版本（异步版本）
   * @param {string} version 
   */
  async skipVersion(version) {
    const { app } = require('electron');
    const path = require('path');
    const fs = require('fs').promises;
    
    try {
      // 将跳过的版本保存到应用数据目录
      const userDataPath = app.getPath('userData');
      const configPath = path.join(userDataPath, 'update-config.json');
      
      let config = {};
      try {
        const existingConfigData = await fs.readFile(configPath, 'utf8');
        config = JSON.parse(existingConfigData);
      } catch (fileError) {
        // 文件不存在，使用空配置
        if (fileError.code !== 'ENOENT') {
          throw fileError;
        }
      }
      
      config.skippedVersion = version;
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      
      console.log('用户选择跳过版本:', version);
    } catch (error) {
      console.error('保存跳过版本设置失败:', error);
    }
  }

  /**
   * 检查版本是否被跳过（异步版本）
   * @param {string} version 
   * @returns {Promise<boolean>}
   */
  async isVersionSkipped(version) {
    const { app } = require('electron');
    const path = require('path');
    const fs = require('fs').promises;
    
    try {
      const userDataPath = app.getPath('userData');
      const configPath = path.join(userDataPath, 'update-config.json');
      
      try {
        const configData = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(configData);
        return config.skippedVersion === version;
      } catch (fileError) {
        // 文件不存在或读取失败，认为没有跳过版本
        if (fileError.code === 'ENOENT') {
          return false;
        }
        throw fileError;
      }
    } catch (error) {
      console.error('检查跳过版本设置失败:', error);
      return false;
    }
  }

  /**
   * 启动定时检查
   */
  startPeriodicCheck() {
    // 延迟更久才进行首次检查，避免影响启动性能
    setTimeout(() => {
      console.log('执行首次更新检查');
      this.checkForUpdates(false);
    }, 5000); // 启动5秒后才检查，避免影响主窗口加载

    // 定期检查
    setInterval(() => {
      this.checkForUpdates(false);
    }, this.checkInterval);
    
    console.log('已启动定期更新检查，首次检查延迟5秒，间隔:', this.checkInterval / 1000 / 60, '分钟');
  }

  /**
   * 手动检查更新（显示所有对话框）
   */
  async manualCheck() {
    return await this.checkForUpdates(true);
  }

  /**
   * 检查更新（静默版本，用于工具栏窗口）
   * @returns {Promise<{hasUpdate: boolean, latestVersion?: string, error?: string}>}
   */
  async checkForUpdatesQuiet() {
    if (this.isChecking) {
      return { hasUpdate: false, error: '更新检查正在进行中' };
    }

    this.isChecking = true;
    
    try {
      console.log('开始静默检查更新，当前版本:', this.currentVersion);
      
      const latestVersion = await this.fetchLatestVersion();
      const hasUpdate = this.compareVersions(latestVersion, this.currentVersion) > 0;
      
      console.log('最新版本:', latestVersion, '有更新:', hasUpdate);
      
      if (hasUpdate) {
        const isSkipped = await this.isVersionSkipped(latestVersion);
        if (isSkipped) {
          console.log('版本', latestVersion, '已被用户跳过');
          return { 
            hasUpdate: false, 
            latestVersion, 
            currentVersion: this.currentVersion, // 添加缺失的 currentVersion
            skipped: true 
          };
        }
      }
      
      return { 
        hasUpdate, 
        latestVersion,
        currentVersion: this.currentVersion
      };
    } catch (error) {
      console.error('检查更新失败:', error);
      return { 
        hasUpdate: false, 
        error: error.message,
        currentVersion: this.currentVersion
      };
    } finally {
      this.isChecking = false;
    }
  }
}

module.exports = UpdateManager;
