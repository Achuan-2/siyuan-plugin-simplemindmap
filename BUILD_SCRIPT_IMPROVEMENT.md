# 打包脚本改进 - 确保使用自定义 index.html

## 问题描述

之前的打包配置使用 `./mindmap-web/**` 复制整个目录，导致：
- 复制了 `mindmap-web/dist/index.html`（原始版本）
- 也复制了 `mindmap-web/index.html`（自定义版本）
- 可能导致使用了错误的版本

## 解决方案

修改 `vite.config.ts` 的静态文件复制配置，分别指定要复制的文件：

### 修改前
```typescript
{
  src: "./mindmap-web/**",
  dest: "./mind/",
}
```

### 修改后
```typescript
{
  src: "./mindmap-web/index.html",
  dest: "./mind/",
},
{
  src: "./mindmap-web/dist/**",
  dest: "./mind/dist/",
}
```

## 改进说明

### 1. 明确文件来源

**自定义 index.html**:
- 源文件: `mindmap-web/index.html`
- 目标: `dist/mind/index.html`
- 包含: Ctrl+S 保存、自动保存、详细日志等自定义功能

**simple-mind-map 资源**:
- 源文件: `mindmap-web/dist/**`
- 目标: `dist/mind/dist/**`
- 包含: CSS、JS、图片、字体等资源文件

### 2. 避免文件冲突

分开复制确保：
- ✅ 不会复制 `mindmap-web/dist/index.html`（原始版本）
- ✅ 只使用 `mindmap-web/index.html`（自定义版本）
- ✅ 保留所有必要的资源文件

### 3. 文件结构

**源文件结构**:
```
mindmap-web/
├── index.html          # 自定义版本（带保存功能）
└── dist/
    ├── index.html      # 原始版本（不使用）
    ├── css/
    ├── js/
    ├── fonts/
    └── img/
```

**打包后结构**:
```
dist/mind/
├── index.html          # 来自 mindmap-web/index.html（自定义版本）✅
└── dist/
    ├── css/
    ├── js/
    ├── fonts/
    └── img/
    # 注意：这里没有 index.html，避免了冲突
```

## 验证结果

### 构建输出
```bash
npm run build
✅ Copied 292 items (之前是 293，减少了重复文件)
```

### 文件验证
```bash
# 文件大小
ls -la dist/mind/index.html
-rw-r--r-- 1 user group 12206 Nov 24 08:45 dist/mind/index.html

# 行数
wc -l dist/mind/index.html
288 dist/mind/index.html

# 确认包含自定义功能
grep -c "Manual save triggered" dist/mind/index.html
1  # ✅ 包含手动保存功能

grep -c "Auto save triggered" dist/mind/index.html
1  # ✅ 包含自动保存功能
```

## 自定义功能确认

打包后的 `dist/mind/index.html` 包含以下自定义功能：

### 1. Ctrl+S 快捷键保存
```javascript
document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        console.log('Ctrl+S pressed');
        manualSave();
    }
});
```

### 2. 每分钟自动保存
```javascript
const autoSaveInterval = setInterval(autoSave, 60000);
window.autoSaveInterval = autoSaveInterval;
console.log('Auto-save enabled: every 60 seconds');
```

### 3. 详细的调试日志
```javascript
console.log('Manual save triggered, data:', mindMapData);
console.log('Auto save triggered, data:', mindMapData);
console.log('Export image request received, type:', message.type);
console.log('Export successful, data length:', exportData ? exportData.length : 0);
```

### 4. 改进的错误处理
```javascript
try {
    const exportData = await window.mindMapInstance.export(type, false, 'mindmap');
    console.log('Export successful');
} catch (e) {
    console.error('Export failed:', e);
    window.parent.postMessage(JSON.stringify({
        event: 'export_error',
        error: e.message
    }), '*');
}
```

## 对比

| 特性 | 原始版本 | 自定义版本 |
|------|---------|-----------|
| 文件大小 | ~2KB | 12KB |
| 行数 | ~50 | 288 |
| Ctrl+S 保存 | ❌ | ✅ |
| 自动保存 | ❌ | ✅ |
| 调试日志 | ❌ | ✅ |
| 错误处理 | 基础 | 增强 |
| 数据验证 | ❌ | ✅ |

## 构建流程

```bash
# 1. 修改 vite.config.ts
# 2. 运行构建
npm run build

# 3. 验证文件
ls -la dist/mind/index.html
grep "Manual save" dist/mind/index.html

# 4. 测试插件
# 重新加载插件，测试保存功能
```

## 注意事项

### 1. 不要修改 mindmap-web/dist/

`mindmap-web/dist/` 目录是 simple-mind-map 的构建产物，包含：
- 原始的 `index.html`（不使用）
- CSS、JS、字体、图片等资源（需要）

我们只使用其中的资源文件，不使用其 `index.html`。

### 2. 自定义功能在 mindmap-web/index.html

所有自定义功能都在 `mindmap-web/index.html` 中：
- ✅ 修改这个文件来添加新功能
- ❌ 不要修改 `mindmap-web/dist/index.html`

### 3. 构建后验证

每次构建后验证：
```bash
# 确认文件大小正确（应该是 ~12KB）
ls -lh dist/mind/index.html

# 确认包含自定义代码
grep "Auto save" dist/mind/index.html
```

## 相关文件

- `vite.config.ts` - 打包配置（已修改）
- `mindmap-web/index.html` - 自定义版本（源文件）
- `dist/mind/index.html` - 打包后的文件（自定义版本）
- `mindmap-web/dist/index.html` - 原始版本（不使用）

## 版本信息

- 修改时间: 2025-11-24 08:54
- 构建结果: ✅ 成功
- 复制文件数: 292 items
- 自定义功能: ✅ 已确认

## 总结

✅ **问题已解决**: 打包脚本现在正确使用自定义的 `index.html`  
✅ **功能完整**: 包含 Ctrl+S 保存、自动保存、调试日志等功能  
✅ **避免冲突**: 不再复制原始的 `dist/index.html`  
✅ **构建优化**: 减少了重复文件的复制  

现在插件打包后会使用正确的自定义版本！🎉
