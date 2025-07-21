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
    // 检测系统语言
    this.detectSystemLanguage();
    
    // 加载所有语言文件
    this.loadAllLanguages();
    
    // 配置 i18n-js
    this.configureI18n();
    
    // 设置应用名称
    this.setAppName();
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
    const localesDir = path.join(__dirname, '../locales');
    const translations = {};
    
    try {
      for (const lang of this.availableLanguages) {
        const filePath = path.join(localesDir, `${lang}.json`);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          const langTranslations = JSON.parse(content);
          translations[lang] = langTranslations;
          console.log(`已加载语言文件: ${lang}`);
        } else {
          console.warn(`语言文件不存在: ${filePath}`);
        }
      }
      
      // 将翻译设置到 i18n-js
      this.i18n.store(translations);
      
    } catch (error) {
      console.error('加载语言文件失败:', error);
    }
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
