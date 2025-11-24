# 调试指南 - 保存和导出问题排查

## 问题描述

用户反馈保存图片和块属性 JSON 没有成功。

## 已添加的调试日志

为了排查问题，我在 `mindmap-web/index.html` 中添加了详细的控制台日志：

### 1. 保存相关日志

```javascript
// 手动保存 (Ctrl+S)
console.log('Ctrl+S pressed');
console.log('Manual save triggered, data:', mindMapData);

// 自动保存 (每分钟)
console.log('Auto save triggered, data:', mindMapData);

// 编辑保存 (防抖)
console.log('Saving mind map data (debounced):', mindMapData);
```

### 2. 导出相关日志

```javascript
console.log('Received message from parent:', message);
console.log('Export image request received, type:', message.type);
console.log('Starting export, type:', type);
console.log('Export successful, data length:', exportData ? exportData.length : 0);
console.log('Export success message sent to parent');
```

### 3. 错误日志

```javascript
console.error('Manual save error:', err);
console.error('Auto save error:', err);
console.error('Export failed:', e);
console.error('mindMapInstance not available');
```

## 调试步骤

### 步骤 1: 检查思维导图初始化

1. 打开浏览器开发者工具 (F12)
2. 打开思维导图编辑器
3. 查看控制台是否显示:
   ```
   Mind map initialized: [MindMap Instance]
   Auto-save enabled: every 60 seconds
   ```

**如果没有显示**:
- 检查 `simple-mind-map` 是否正确加载
- 检查 `window.$bus` 是否可用
- 检查 `app_inited` 事件是否触发

### 步骤 2: 测试手动保存 (Ctrl+S)

1. 编辑思维导图 (添加/修改节点)
2. 按下 Ctrl+S (或 Cmd+S)
3. 查看控制台日志:
   ```
   Ctrl+S pressed
   Manual save triggered, data: { layout, root, theme, view }
   ```

**检查数据结构**:
- `data.root`: 节点树数据
- `data.layout`: 布局类型
- `data.theme`: 主题配置
- `data.view`: 视图数据

### 步骤 3: 检查保存事件传递

保存数据后，应该看到:
```
Received message from parent: { action: 'export_image', type: 'png' }
Export image request received, type: png
Starting export, type: png
```

**如果没有收到 export_image 请求**:
- 检查父窗口是否正确处理 `save` 事件
- 检查 `index.ts` 中的 `onSave` 函数
- 检查块属性保存是否成功

### 步骤 4: 检查图片导出

导出成功后应该看到:
```
Export successful, data length: 12345
Export success message sent to parent
```

**如果导出失败**:
- 检查错误日志: `Export failed: [error message]`
- 检查 `mindMapInstance.export()` 方法是否可用
- 检查导出类型 (png/svg) 是否支持

### 步骤 5: 检查父窗口接收

在父窗口 (index.ts) 中应该:
1. 接收 `export_success` 事件
2. 更新图片文件
3. 刷新文档中的图片显示

## 常见问题排查

### 问题 1: mindMapInstance 未定义

**症状**: 控制台显示 `mindMapInstance not available`

**原因**: 思维导图实例未正确初始化

**解决方案**:
1. 检查 `app_inited` 事件是否触发
2. 检查 `window.mindMapInstance` 是否被正确赋值
3. 确保在实例初始化后再调用保存/导出

### 问题 2: getData() 返回空数据

**症状**: 保存的数据为空或不完整

**原因**: `getData(true)` 参数错误或实例状态异常

**解决方案**:
1. 确认使用 `getData(true)` 获取完整数据
2. 检查思维导图是否有内容
3. 尝试手动调用 `window.mindMapInstance.getData(true)` 查看返回值

### 问题 3: 导出失败

**症状**: 控制台显示 `Export failed: [error]`

**原因**: 导出方法调用错误或格式不支持

**解决方案**:
1. 检查导出类型是否正确 ('png' 或 'svg')
2. 确认 `export()` 方法签名: `export(type, isDownload, fileName)`
3. 检查是否有节点内容可导出

### 问题 4: 块属性保存失败

**症状**: 数据保存到块属性失败

**原因**: API 调用错误或权限问题

**解决方案**:
1. 检查 `fetchPost('/api/attr/setBlockAttrs', ...)` 调用
2. 确认 blockID 正确
3. 检查属性名是否以 `custom-` 开头
4. 查看网络请求是否成功

### 问题 5: 图片未更新

**症状**: 保存成功但图片没有更新

**原因**: 图片缓存或更新逻辑问题

**解决方案**:
1. 检查 `updateDrawioImage()` 是否被调用
2. 确认图片文件是否真的更新了
3. 尝试强制刷新: `fetch(imageURL, { cache: 'reload' })`
4. 检查图片 URL 是否正确

## 数据流程图

```
用户操作 (Ctrl+S / 自动保存)
    ↓
mindmap-web/index.html
    ↓
getData(true) 获取完整数据
    ↓
postMessage({ event: 'save', data: mindMapData })
    ↓
src/index.ts (onSave)
    ↓
setBlockAttrs({ custom-mindmap: JSON.stringify(data) })
    ↓
postMessage({ action: 'export_image', type: 'png/svg' })
    ↓
mindmap-web/index.html
    ↓
mindMapInstance.export(type, false, 'mindmap')
    ↓
postMessage({ event: 'export_success', data: imageData })
    ↓
src/index.ts (onExportSuccess)
    ↓
updateDrawioImage(imageInfo)
    ↓
刷新文档中的图片显示
```

## 手动测试命令

在浏览器控制台中可以手动测试:

```javascript
// 1. 检查实例
console.log('Instance:', window.mindMapInstance);

// 2. 获取数据
const data = window.mindMapInstance.getData(true);
console.log('Data:', data);

// 3. 导出图片
window.mindMapInstance.export('png', false, 'test').then(data => {
    console.log('Export result:', data);
});

// 4. 手动触发保存
window.parent.postMessage(JSON.stringify({
    event: 'save',
    data: window.mindMapInstance.getData(true)
}), '*');
```

## 预期的控制台输出

### 正常流程

```
Mind map initialized: MindMap {...}
Auto-save enabled: every 60 seconds
Ctrl+S pressed
Manual save triggered, data: { layout: "logicalStructure", root: {...}, theme: {...}, view: {...} }
Received message from parent: { action: "export_image", type: "png" }
Export image request received, type: png
Starting export, type: png
Export successful, data length: 45678
Export success message sent to parent
```

### 错误流程示例

```
Mind map initialized: MindMap {...}
Auto-save enabled: every 60 seconds
Ctrl+S pressed
Manual save error: TypeError: Cannot read property 'getData' of undefined
```

## 下一步行动

1. **重新加载插件**: 确保使用最新构建的版本
2. **打开控制台**: F12 打开开发者工具
3. **测试保存**: 按 Ctrl+S 并观察日志
4. **检查网络**: 查看 Network 标签中的 API 请求
5. **报告问题**: 如果仍有问题，提供完整的控制台日志

## 相关文件

- `mindmap-web/index.html` - 添加了详细日志
- `src/index.ts` - 处理保存和导出事件
- `dist/mind/index.html` - 构建后的文件

## 构建版本

- 构建时间: 2025-11-24 08:44
- index.js: 57.51 kB
- 已添加详细日志用于调试
