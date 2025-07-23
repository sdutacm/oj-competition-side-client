const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { I18n } = require('i18n-js');

/**
 * 国际化管理器
 * 基于 i18n-js 提供多语言支持功能
 */
class I18nManager {
  constructor() {
    this.i18n = new I18n();
    this.currentLanguage = 'zh-CN'; // 默认语言
    this.fallbackLanguage = 'zh-CN';
    this.availableLanguages = ['zh-CN', 'en-US'];
    this._events = {};
    
    // 初始化语言设置
    this.init();
  }

  /**
   * 初始化国际化管理器
   */
  init() {
    console.log('初始化国际化管理器...');
    console.log('环境信息:');
    console.log('- __dirname:', __dirname);
    console.log('- process.cwd():', process.cwd());
    console.log('- app.getAppPath():', app.getAppPath());
    console.log('- process.resourcesPath:', process.resourcesPath || '未定义');
    
    // 检测系统语言
    this.detectSystemLanguage();
    
    // 加载所有语言文件
    this.loadAllLanguages();
    
    // 配置 i18n-js
    this.configureI18n();
    
    // 设置应用名称
    this.setAppName();
    
    console.log('国际化管理器初始化完成');
  }

  /**
   * 检测系统语言
   */
  detectSystemLanguage() {
    try {
      const systemLocale = app.getLocale();
      console.log('系统语言:', systemLocale);
      
      // 映射系统语言到支持的语言
      const languageMapping = {
        'zh': 'zh-CN',
        'zh-CN': 'zh-CN',
        'zh-TW': 'zh-CN',
        'zh-HK': 'zh-CN',
        'en': 'en-US',
        'en-US': 'en-US',
        'en-GB': 'en-US'
      };
      
      // 尝试完全匹配
      if (languageMapping[systemLocale]) {
        this.currentLanguage = languageMapping[systemLocale];
        return;
      }
      
      // 尝试语言代码匹配（如 en-AU -> en）
      const languageCode = systemLocale.split('-')[0];
      if (languageMapping[languageCode]) {
        this.currentLanguage = languageMapping[languageCode];
        return;
      }
      
      // 默认使用中文
      this.currentLanguage = 'zh-CN';
      
    } catch (error) {
      console.error('检测系统语言失败:', error);
      this.currentLanguage = 'zh-CN';
    }
  }

  /**
   * 加载所有语言文件
   */
  loadAllLanguages() {
    // 尝试多个可能的路径来适应不同环境（开发环境、构建后的应用）
    const possiblePaths = [
      path.join(__dirname, '../locales'), // 开发环境
      path.join(process.resourcesPath, 'app/locales'), // Mac 构建后的路径
      path.join(process.cwd(), 'locales'), // 当前工作目录
      path.join(app.getAppPath(), 'locales'), // 应用路径
      path.join(path.dirname(app.getAppPath()), 'locales') // 应用目录的上级
    ];
    
    let localesDir = null;
    
    // 尝试找到存在的语言文件目录
    for (const testPath of possiblePaths) {
      try {
        if (fs.existsSync(testPath)) {
          const testFile = path.join(testPath, 'zh-CN.json');
          if (fs.existsSync(testFile)) {
            localesDir = testPath;
            console.log('找到语言文件目录:', localesDir);
            break;
          }
        }
      } catch (error) {
        console.warn('检查路径失败:', testPath, error.message);
      }
    }
    
    if (!localesDir) {
      console.error('无法找到语言文件目录，尝试的路径:', possiblePaths);
      // 使用内嵌的默认翻译作为回退
      this.loadFallbackTranslations();
      return;
    }
    
    const translations = {};
    
    try {
      for (const lang of this.availableLanguages) {
        const filePath = path.join(localesDir, `${lang}.json`);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          const langTranslations = JSON.parse(content);
          translations[lang] = langTranslations;
          console.log(`已加载语言文件: ${lang} from ${filePath}`);
        } else {
          console.warn(`语言文件不存在: ${filePath}`);
        }
      }
      
      // 将翻译设置到 i18n-js
      this.i18n.store(translations);
      
    } catch (error) {
      console.error('加载语言文件失败:', error);
      // 使用内嵌的默认翻译作为回退
      this.loadFallbackTranslations();
    }
  }

  /**
   * 加载内嵌的回退翻译（当无法加载外部文件时使用）
   */
  loadFallbackTranslations() {
    console.log('使用内嵌的回退翻译');
    const fallbackTranslations = {
      'zh-CN': {
        "app": {
          "name": "SDUT OJ 竞赛客户端",
          "about": "关于 %{appName}",
          "version": "版本 %{version}",
          "description": "专业的在线评测系统客户端"
        },
        "menu": {
          "file": "文件",
          "edit": "编辑",
          "view": "视图",
          "window": "窗口",
          "help": "帮助",
          "about": "关于",
          "preferences": "偏好设置",
          "services": "服务",
          "hide": "隐藏 %{appName}",
          "hideOthers": "隐藏其他",
          "showAll": "显示全部",
          "quit": "退出 %{appName}",
          "undo": "撤销",
          "redo": "重做",
          "cut": "剪切",
          "copy": "复制",
          "paste": "粘贴",
          "pasteAndMatchStyle": "粘贴并匹配样式",
          "delete": "删除",
          "selectAll": "全选",
          "speech": "朗读",
          "startSpeaking": "开始朗读",
          "stopSpeaking": "停止朗读",
          "close": "关闭",
          "minimize": "最小化",
          "zoom": "缩放",
          "reload": "重新加载",
          "forceReload": "强制重新加载",
          "toggleDevTools": "切换开发者工具",
          "resetZoom": "实际大小",
          "zoomIn": "放大",
          "zoomOut": "缩小",
          "toggleFullscreen": "切换全屏",
          "front": "前置全部窗口",
          "language": "语言",
          "systemInfo": "系统信息",
          "checkForUpdates": "检查更新",
          "reportIssue": "报告问题",
          "learnMore": "了解更多",
          "navigation": "导航",
          "goBack": "后退",
          "goForward": "前进",
          "goHome": "首页",
          "refresh": "刷新",
          "security": "安全",
          "blockList": "黑名单设置",
          "allowList": "白名单设置",
          "redirectProtection": "重定向保护",
          "chinese": "中文",
          "english": "English"
        },
        "toolbar": {
          "back": "后退",
          "forward": "前进",
          "refresh": "刷新",
          "home": "主页"
        },
        "dialog": {
          "ok": "确定",
          "cancel": "取消",
          "yes": "是",
          "no": "否",
          "save": "保存",
          "dontSave": "不保存",
          "close": "关闭",
          "retry": "重试",
          "ignore": "忽略",
          "abort": "中止",
          "blocked": {
            "title": "访问受限",
            "message": "比赛期间不能访问这个网站",
            "button": "知道了"
          },
          "info": {
            "title": "关于",
            "version": "版本",
            "description": "专业的在线评测系统客户端",
            "links": "相关链接",
            "officialSite": "SDUT OJ 官网",
            "github": "GitHub",
            "copyright": "© 2008-2025 SDUTACM. All Rights Reserved."
          }
        },
        "shortcuts": {
          "cmdOrCtrl": "Cmd",
          "alt": "Option",
          "shift": "Shift"
        },
        "system": {
          "electron": "Electron %{version}",
          "node": "Node.js %{version}",
          "chromium": "Chromium %{version}",
          "v8": "V8 %{version}"
        }
      },
      'en-US': {
        "app": {
          "name": "SDUT OJ Competition Client",
          "about": "About %{appName}",
          "version": "Version %{version}",
          "description": "Professional Online Judge Client"
        },
        "menu": {
          "file": "File",
          "edit": "Edit",
          "view": "View",
          "window": "Window",
          "help": "Help",
          "about": "About",
          "preferences": "Preferences",
          "services": "Services",
          "hide": "Hide %{appName}",
          "hideOthers": "Hide Others",
          "showAll": "Show All",
          "quit": "Quit %{appName}",
          "undo": "Undo",
          "redo": "Redo",
          "cut": "Cut",
          "copy": "Copy",
          "paste": "Paste",
          "pasteAndMatchStyle": "Paste and Match Style",
          "delete": "Delete",
          "selectAll": "Select All",
          "speech": "Speech",
          "startSpeaking": "Start Speaking",
          "stopSpeaking": "Stop Speaking",
          "close": "Close",
          "minimize": "Minimize",
          "zoom": "Zoom",
          "reload": "Reload",
          "forceReload": "Force Reload",
          "toggleDevTools": "Toggle Developer Tools",
          "resetZoom": "Actual Size",
          "zoomIn": "Zoom In",
          "zoomOut": "Zoom Out",
          "toggleFullscreen": "Toggle Fullscreen",
          "front": "Bring All to Front",
          "language": "Language",
          "systemInfo": "System Information",
          "checkForUpdates": "Check for Updates",
          "reportIssue": "Report Issue",
          "learnMore": "Learn More",
          "navigation": "Navigation",
          "goBack": "Go Back",
          "goForward": "Go Forward",
          "goHome": "Home",
          "refresh": "Refresh",
          "security": "Security",
          "blockList": "Block List",
          "allowList": "Allow List",
          "redirectProtection": "Redirect Protection",
          "chinese": "中文",
          "english": "English"
        },
        "toolbar": {
          "back": "Back",
          "forward": "Forward",
          "refresh": "Refresh",
          "home": "Home"
        },
        "dialog": {
          "ok": "OK",
          "cancel": "Cancel",
          "yes": "Yes",
          "no": "No",
          "save": "Save",
          "dontSave": "Don't Save",
          "close": "Close",
          "retry": "Retry",
          "ignore": "Ignore",
          "abort": "Abort",
          "blocked": {
            "title": "Access Restricted",
            "message": "Cannot access this website during competition",
            "button": "Got it"
          },
          "info": {
            "title": "About",
            "version": "Version",
            "description": "Professional Online Judge Client",
            "links": "Related Links",
            "officialSite": "SDUT OJ Official Site",
            "github": "GitHub",
            "copyright": "© 2008-2025 SDUTACM. All Rights Reserved."
          }
        },
        "shortcuts": {
          "cmdOrCtrl": "Cmd",
          "alt": "Alt",
          "shift": "Shift"
        },
        "system": {
          "electron": "Electron %{version}",
          "node": "Node.js %{version}",
          "chromium": "Chromium %{version}",
          "v8": "V8 %{version}"
        }
      }
    };
    
    this.i18n.store(fallbackTranslations);
  }

  /**
   * 配置 i18n-js
   */
  configureI18n() {
    // 设置默认语言和回退语言
    this.i18n.defaultLocale = this.fallbackLanguage;
    this.i18n.locale = this.currentLanguage;
    
    // 启用回退功能
    this.i18n.enableFallback = true;
    
    // 设置缺失翻译时的处理方式
    this.i18n.missingBehavior = 'message';
    
    // 设置插值选项
    this.i18n.interpolation = {
      prefix: '%{',
      suffix: '}'
    };
  }

  /**
   * 设置应用名称
   */
  setAppName() {
    try {
      const appName = this.t('app.name');
      app.setName(appName);
      console.log('应用名称已设置为:', appName);
    } catch (error) {
      console.error('设置应用名称失败:', error);
    }
  }

  /**
   * 获取翻译文本
   * @param {string} key - 翻译键
   * @param {object} params - 参数对象
   * @param {string} language - 指定语言（可选）
   * @returns {string} 翻译后的文本
   */
  t(key, params = {}, language = null) {
    try {
      const lang = language || this.currentLanguage;
      
      // 临时设置语言（如果指定了特定语言）
      if (language && language !== this.i18n.locale) {
        const originalLocale = this.i18n.locale;
        this.i18n.locale = language;
        const result = this.i18n.t(key, params);
        this.i18n.locale = originalLocale;
        return result;
      }
      
      return this.i18n.t(key, params);
      
    } catch (error) {
      console.error(`获取翻译失败 (键: ${key}):`, error);
      return key;
    }
  }

  /**
   * 设置当前语言
   * @param {string} language - 语言代码
   */
  setLanguage(language) {
    if (this.availableLanguages.includes(language)) {
      const oldLanguage = this.currentLanguage;
      this.currentLanguage = language;
      
      // 更新 i18n-js 的语言设置
      this.i18n.locale = language;
      
      // 更新应用名称
      this.setAppName();
      
      console.log(`语言已从 ${oldLanguage} 切换到 ${language}`);
      
      // 触发语言变更事件
      this.emit('languageChanged', language, oldLanguage);
    } else {
      console.warn(`不支持的语言: ${language}`);
    }
  }

  /**
   * 获取当前语言
   * @returns {string} 当前语言代码
   */
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  /**
   * 获取可用语言列表
   * @returns {string[]} 可用语言代码数组
   */
  getAvailableLanguages() {
    return [...this.availableLanguages];
  }

  /**
   * 获取语言显示名称
   * @param {string} language - 语言代码
   * @returns {string} 语言显示名称
   */
  getLanguageDisplayName(language) {
    const displayNames = {
      'zh-CN': '中文',
      'en-US': 'English'
    };
    return displayNames[language] || language;
  }

  /**
   * 检查是否有指定键的翻译
   * @param {string} key - 翻译键
   * @param {string} language - 语言代码（可选）
   * @returns {boolean} 是否存在翻译
   */
  exists(key, language = null) {
    try {
      const lang = language || this.currentLanguage;
      
      if (language && language !== this.i18n.locale) {
        const originalLocale = this.i18n.locale;
        this.i18n.locale = language;
        // 尝试获取翻译，检查是否包含缺失的标识
        const result = this.i18n.t(key);
        const exists = !result.includes('missing') && result !== key;
        this.i18n.locale = originalLocale;
        return exists;
      }
      
      // 尝试获取翻译，检查是否包含缺失的标识
      const result = this.i18n.t(key);
      return !result.includes('missing') && result !== key;
    } catch (error) {
      console.error(`检查翻译键存在性失败 (键: ${key}):`, error);
      return false;
    }
  }

  /**
   * 获取 i18n-js 实例（用于高级操作）
   * @returns {I18n} i18n-js 实例
   */
  getI18nInstance() {
    return this.i18n;
  }

  /**
   * 简单的事件发射器
   */
  emit(event, ...args) {
    if (!this._events) this._events = {};
    if (!this._events[event]) return;
    
    this._events[event].forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error('事件回调执行失败:', error);
      }
    });
  }

  /**
   * 监听事件
   */
  on(event, callback) {
    if (!this._events) this._events = {};
    if (!this._events[event]) this._events[event] = [];
    this._events[event].push(callback);
  }

  /**
   * 移除事件监听
   */
  off(event, callback) {
    if (!this._events || !this._events[event]) return;
    this._events[event] = this._events[event].filter(cb => cb !== callback);
  }
}

// 创建单例实例
const i18nManager = new I18nManager();

module.exports = i18nManager;
