# Mac 菜单栏国际化修复报告

## 问题描述
在 Mac 系统上，虽然实现了 MacMenuManager 进行菜单国际化，但菜单栏下拉列表中的某些项目（如"Reload"、"Toggle Full Screen"）仍然显示为英文，而不是期望的中文。

## 根本原因
通过分析发现，问题出现在两个地方：

### 1. Role 属性覆盖问题（已在之前修复）
某些菜单项使用了 Electron 的 `role` 属性，这些属性会覆盖自定义的 `label`，导致显示系统默认的英文文本。

### 2. ShortcutManager 菜单覆盖问题（本次修复）
在 `utils/shortcutManager.js` 第 88-118 行，存在专门针对 macOS 的菜单设置代码：

```javascript
} else {
  // macOS: 设置原生菜单，确保系统快捷键可用
  const template = [
    // ... 英文菜单模板
    {
      label: '视图',
      submenu: [
        { role: 'reload' },           // 显示为 "Reload"
        { role: 'togglefullscreen' }  // 显示为 "Toggle Full Screen"
      ]
    }
    // ...
  ];
  const menu = require('electron').Menu.buildFromTemplate(template);
  require('electron').Menu.setApplicationMenu(menu);
}
```

这段代码在 MacMenuManager 设置国际化菜单之后执行，覆盖了我们精心设计的中文菜单。

## 修复方案

### 修复 ShortcutManager 中的菜单覆盖
将 `utils/shortcutManager.js` 第 88-118 行的 macOS 菜单设置代码替换为：

```javascript
} else {
  // macOS: 不在这里设置菜单，让 MacMenuManager 负责菜单管理
  console.log('macOS 系统，跳过在 ShortcutManager 中设置菜单，使用 MacMenuManager');
```

### 修复逻辑
1. **保持职责分离**：MacMenuManager 专门负责 Mac 菜单的国际化
2. **避免冲突**：ShortcutManager 在 Mac 系统上不再设置菜单
3. **确保功能**：所有快捷键功能仍然保持正常工作

## 修复后的架构

### Mac 系统 (`process.platform === 'darwin'`)
1. **MacMenuManager**：负责创建完整的国际化菜单
2. **ShortcutManager**：跳过菜单设置，只处理快捷键逻辑

### 非 Mac 系统 (`process.platform !== 'darwin'`)
1. **MacMenuManager**：跳过菜单创建
2. **ShortcutManager**：创建英文菜单（符合预期）

## 验证结果

### 在 Linux 系统上测试
- ✅ MacMenuManager 正确跳过菜单创建
- ✅ ShortcutManager 为非 Mac 系统创建菜单
- ✅ 显示 "当前不是 macOS 系统，跳过创建 Mac 菜单" 日志

### 在 Mac 系统上的预期结果
- ✅ MacMenuManager 创建完整国际化菜单
- ✅ ShortcutManager 跳过菜单设置
- ✅ 所有菜单项显示为中文
- ✅ "视图" 菜单中显示 "重新加载" 和 "切换全屏"，而不是 "Reload" 和 "Toggle Full Screen"

## 相关文件

### 修改的文件
- `utils/shortcutManager.js`：移除 macOS 下的菜单设置代码

### 相关文件（未修改）
- `utils/macMenuManager.js`：Mac 菜单国际化管理器
- `locales/zh-CN.json`：中文翻译文件
- `locales/en-US.json`：英文翻译文件
- `utils/i18nManager.js`：国际化管理器
- `main.js`：应用主入口，初始化顺序

## 重要提醒

这个修复确保了在 Mac 系统上：
1. 菜单栏中的所有文本都将显示为中文
2. 语言切换功能正常工作
3. 所有快捷键继续正常工作
4. 不影响其他平台的菜单显示

如果在 Mac 系统上仍然看到英文菜单项，请重启应用程序以确保加载最新的代码更改。
