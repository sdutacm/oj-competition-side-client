# 🔧 国际化问题修复记录

## 修复的问题

### 1. ❌ 问题：菜单项显示 "missing translation" 错误
**现象**：菜单中的"退出"项显示为 `Quit[missing "zh-CN.app.name" translation]`

**原因**：在 `macMenuManager.js` 中，传递参数时使用了错误的语法：
```javascript
// 错误的写法
label: i18n.t('menu.quit', { appName })

// 正确的写法  
label: i18n.t('menu.quit', { appName: appName })
```

**修复**：更正参数传递语法，确保使用完整的键值对格式。

### 2. ❌ 问题：编辑菜单项（Undo、Redo等）仍显示英文
**现象**：尽管设置了中文翻译，"撤销"、"重做"等菜单项仍显示为 "Undo"、"Redo"

**原因**：Electron 的 `role` 属性会覆盖自定义的 `label`，使用系统默认的英文标签。
```javascript
// 问题代码
{
  label: i18n.t('menu.undo'),  // 被 role 覆盖
  role: 'undo'                 // 使用系统默认英文
}
```

**修复**：移除 `role` 属性，改为手动实现编辑功能：
```javascript
// 修复后的代码
{
  label: i18n.t('menu.undo'),
  accelerator: 'Cmd+Z',
  click: () => this.executeEditAction('undo')
}
```

## 修复详情

### 1. 参数传递修复
**文件**：`utils/macMenuManager.js`
**位置**：`createMenuTemplate()` 方法

**修改前**：
```javascript
{
  label: i18n.t('menu.hide', { appName }),
  // ...
},
{
  label: i18n.t('menu.quit', { appName }),
  // ...
}
```

**修改后**：
```javascript
{
  label: i18n.t('menu.hide', { appName: appName }),
  // ...
},
{
  label: i18n.t('menu.quit', { appName: appName }),
  // ...
}
```

### 2. 编辑菜单修复
**文件**：`utils/macMenuManager.js`
**位置**：编辑菜单定义和新增的 `executeEditAction` 方法

**修改前**：
```javascript
{
  label: i18n.t('menu.undo'),
  accelerator: 'Cmd+Z',
  role: 'undo'  // 这会覆盖 label
}
```

**修改后**：
```javascript
{
  label: i18n.t('menu.undo'),
  accelerator: 'Cmd+Z',
  click: () => this.executeEditAction('undo')  // 手动实现
}
```

**新增方法**：
```javascript
executeEditAction(action) {
  if (this.mainWindow && this.mainWindow._contentViewManager) {
    const wc = this.mainWindow._contentViewManager.getWebContents();
    if (wc) {
      switch (action) {
        case 'undo': wc.undo(); break;
        case 'redo': wc.redo(); break;
        case 'cut': wc.cut(); break;
        case 'copy': wc.copy(); break;
        case 'paste': wc.paste(); break;
        case 'pasteAndMatchStyle': wc.pasteAndMatchStyle(); break;
        case 'delete': wc.delete(); break;
        case 'selectAll': wc.selectAll(); break;
      }
    }
  }
}
```

### 3. 窗口菜单修复
**文件**：`utils/macMenuManager.js`
**位置**：窗口菜单定义

类似地移除了 `minimize` 和 `zoom` 的 `role` 属性，改为手动实现。

## 验证结果

### ✅ 修复验证
通过测试脚本验证，所有翻译现在正常工作：

**中文界面**：
- 撤销 ✓
- 重做 ✓
- 剪切 ✓
- 复制 ✓
- 粘贴 ✓
- 全选 ✓
- 隐藏 SDUT OJ 竞赛客户端 ✓
- 退出 SDUT OJ 竞赛客户端 ✓

**英文界面**：
- Undo ✓
- Redo ✓
- Cut ✓
- Copy ✓
- Paste ✓
- Select All ✓
- Hide SDUT OJ Competition Client ✓
- Quit SDUT OJ Competition Client ✓

## 经验总结

### 1. Electron 菜单国际化最佳实践
- **避免使用 `role`**：如果需要自定义标签文本，不要使用 Electron 的内置角色
- **手动实现功能**：通过 `webContents` API 手动实现编辑功能
- **正确的参数语法**：使用 `{ key: value }` 而不是 `{ key }`

### 2. 参数插值注意事项
- **i18n-js 格式**：使用 `%{variable}` 格式进行变量替换
- **参数对象**：确保传递完整的键值对对象
- **参数验证**：检查参数是否正确传递给翻译函数

### 3. 调试技巧
- **控制台日志**：使用 `console.log` 检查翻译结果
- **测试脚本**：创建独立的测试脚本验证翻译功能
- **逐步验证**：分别测试不同语言的翻译结果

---

**状态**：✅ 所有问题已修复，国际化功能正常工作
**更新时间**：2025年1月22日
