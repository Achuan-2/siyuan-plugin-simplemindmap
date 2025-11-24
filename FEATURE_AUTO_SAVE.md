# 新功能 - Ctrl+S 保存和自动保存

## 功能概述

为 `mindmap-web/index.html` 添加了两个重要的保存功能:

1. **Ctrl+S 手动保存**: 按下 Ctrl+S (Windows/Linux) 或 Cmd+S (Mac) 快捷键立即保存
2. **自动保存**: 每隔 1 分钟自动保存思维导图

## 实现细节

### 1. Ctrl+S 快捷键保存

```javascript
// 监听 Ctrl+S 快捷键
document.addEventListener('keydown', (event) => {
    // Ctrl+S 或 Cmd+S (Mac)
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault(); // 阻止浏览器默认保存行为
        manualSave();
    }
});
```

**特点:**
- ✅ 支持 Windows/Linux 的 Ctrl+S
- ✅ 支持 Mac 的 Cmd+S
- ✅ 阻止浏览器默认的保存对话框
- ✅ 立即保存,不使用防抖

### 2. 自动保存定时器

```javascript
// 思维导图实例创建完成事件
window.$bus.$on('app_inited', mindMap => {
    console.log('Mind map initialized:', mindMap);
    window.mindMapInstance = mindMap;
    
    // 设置自动保存定时器（每 60 秒保存一次）
    const autoSaveInterval = setInterval(autoSave, 60000);
    
    // 保存定时器引用，以便需要时清除
    window.autoSaveInterval = autoSaveInterval;
    
    console.log('Auto-save enabled: every 60 seconds');
});
```

**特点:**
- ✅ 每 60 秒 (1 分钟) 自动保存一次
- ✅ 在思维导图初始化后启动
- ✅ 页面卸载时自动清除定时器
- ✅ 控制台输出保存日志

### 3. 保存函数实现

#### 手动保存 (立即执行)
```javascript
const manualSave = () => {
    if (window.mindMapInstance) {
        try {
            const mindMapData = window.mindMapInstance.getData(true);
            console.log('Manual save triggered');
            window.parent.postMessage(JSON.stringify({
                event: 'save',
                data: mindMapData
            }), '*');
        } catch (err) {
            console.error('Manual save error:', err);
        }
    }
};
```

#### 自动保存 (定时执行)
```javascript
const autoSave = () => {
    if (window.mindMapInstance) {
        try {
            const mindMapData = window.mindMapInstance.getData(true);
            console.log('Auto save triggered');
            window.parent.postMessage(JSON.stringify({
                event: 'save',
                data: mindMapData
            }), '*');
        } catch (err) {
            console.error('Auto save error:', err);
        }
    }
};
```

### 4. 清理机制

```javascript
// 页面卸载时清除定时器
window.addEventListener('beforeunload', () => {
    if (window.autoSaveInterval) {
        clearInterval(window.autoSaveInterval);
    }
});
```

## 保存流程

### 手动保存流程 (Ctrl+S)
1. 用户按下 Ctrl+S
2. 阻止浏览器默认行为
3. 调用 `manualSave()` 函数
4. 获取当前思维导图数据 `mindMapInstance.getData(true)`
5. 发送 `save` 事件到父窗口
6. 父窗口接收事件:
   - 保存数据到块属性 `custom-mindmap`
   - 请求导出图片
7. 导出图片成功后:
   - 更新图片文件
   - 刷新文档中的图片显示

### 自动保存流程 (每分钟)
1. 思维导图初始化完成
2. 启动定时器 `setInterval(autoSave, 60000)`
3. 每 60 秒执行一次 `autoSave()` 函数
4. 后续流程与手动保存相同 (步骤 4-7)

## 控制台日志

保存时会在控制台输出日志,方便调试:

```
Mind map initialized: [MindMap Instance]
Auto-save enabled: every 60 seconds
Manual save triggered  // Ctrl+S 保存
Auto save triggered    // 自动保存
```

## 与原有保存机制的关系

### 原有保存机制 (保留)
- `saveMindMapData()` - 带 500ms 防抖的保存函数
- 用于编辑过程中的自动保存 (由 simple-mind-map 内部触发)

### 新增保存机制
- `manualSave()` - 立即保存,无防抖 (Ctrl+S)
- `autoSave()` - 定时保存,无防抖 (每分钟)

**三种保存机制互不冲突,共同确保数据安全:**
1. **编辑保存**: 编辑时自动保存 (防抖 500ms)
2. **手动保存**: Ctrl+S 立即保存
3. **定时保存**: 每分钟自动保存

## 用户体验

### 优点
✅ **数据安全**: 多重保存机制,防止数据丢失
✅ **快捷操作**: Ctrl+S 符合用户习惯
✅ **自动备份**: 每分钟自动保存,无需手动操作
✅ **即时反馈**: 控制台日志显示保存状态

### 注意事项
⚠️ **保存频率**: 自动保存每分钟一次,不会过于频繁
⚠️ **性能影响**: 保存操作包含图片导出,可能需要几秒钟
⚠️ **网络依赖**: 保存需要与思源笔记 API 通信

## 测试建议

### 1. 测试 Ctrl+S 保存
1. 打开思维导图编辑器
2. 编辑思维导图 (添加/修改节点)
3. 按下 Ctrl+S (或 Cmd+S)
4. 检查控制台是否显示 "Manual save triggered"
5. 等待几秒,检查图片是否更新
6. 刷新页面,检查数据是否保存

### 2. 测试自动保存
1. 打开思维导图编辑器
2. 检查控制台是否显示 "Auto-save enabled: every 60 seconds"
3. 编辑思维导图
4. 等待 60 秒
5. 检查控制台是否显示 "Auto save triggered"
6. 检查图片是否更新

### 3. 测试保存内容
1. 编辑思维导图
2. 保存 (Ctrl+S 或等待自动保存)
3. 关闭编辑器
4. 重新打开编辑器
5. 检查数据是否正确加载

## 相关文件

- `mindmap-web/index.html` - 添加了保存功能的文件
- `src/index.ts` - 处理保存事件的插件代码
- `dist/mind/index.html` - 构建后的文件

## 构建

```bash
npm run build
```

构建成功后,新功能会自动包含在插件包中。

## 版本

- 添加时间: 2025-11-24 08:39
- 版本: 0.5.5
- 状态: ✅ 已实现并测试

## 未来改进

可能的改进方向:
- [ ] 可配置的自动保存间隔
- [ ] 保存成功/失败的视觉提示
- [ ] 保存历史记录
- [ ] 离线保存支持
