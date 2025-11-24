# 修复记录 - iframe 未占满 Tab 问题

## 问题描述

在 Tab 模式下打开思维导图编辑器时，iframe 内容特别小，没有占满整个 Tab 区域。

## 问题原因

CSS 样式类名不匹配:
- **HTML 中使用**: `.mindmap-edit-tab`
- **CSS 中定义**: `.drawio-edit-tab`

由于类名不匹配，iframe 没有应用正确的样式，导致无法填充整个容器。

## 解决方案

在 `src/index.scss` 中添加 mindmap 相关的样式类:

### 修改前
```scss
.drawio-edit-dialog,
.drawio-lightbox-dialog {
    // ... 样式
}

.drawio-edit-tab {
    // ... 样式
}
```

### 修改后
```scss
.drawio-edit-dialog,
.drawio-lightbox-dialog,
.mindmap-edit-dialog,        // 新增
.mindmap-lightbox-dialog {    // 新增
    // ... 样式
}

.drawio-edit-tab,
.mindmap-edit-tab {           // 新增
    // ... 样式
}
```

## 关键样式说明

### Tab 容器样式
```scss
.mindmap-edit-tab {
    height: 100%;              // 占满父容器高度
    padding: 0;                // 移除内边距
    display: flex;             // 使用 flexbox 布局
    flex-direction: column;    // 垂直方向
    flex: 1;                   // 占据剩余空间
    min-height: 0;             // 允许容器收缩
    overflow: hidden;          // 防止内容溢出

    iframe {
        width: 100%;           // 宽度 100%
        height: 100%;          // 高度 100%
        border: none;          // 移除边框
    }
}
```

### Dialog 容器样式
```scss
.mindmap-edit-dialog {
    flex: 1;                   // 占据剩余空间
    display: flex;             // 使用 flexbox 布局
    flex-direction: column;    // 垂直方向
    height: 100%;              // 占满父容器高度

    .edit-dialog-container {
        padding: 0 16px;       // 左右内边距
        display: flex;
        flex-direction: column;
        flex: 1;               // 占据剩余空间
        min-height: 0;         // 允许容器收缩
        overflow: hidden;      // 防止内容溢出

        iframe {
            width: 100%;       // 宽度 100%
            height: 100%;      // 高度 100%
            border: none;      // 移除边框
        }
    }

    .edit-dialog-editor {
        border: 1px solid var(--b3-border-color);
        border-radius: var(--b3-border-radius);
        flex: 1;               // 占据剩余空间
        overflow: hidden;      // 防止编辑器内容溢出
    }
}
```

## 构建结果

```bash
npm run build
```

- ✅ `index.css`: 1.16 kB → 1.62 kB (增加了 mindmap 样式)
- ✅ `index.js`: 58.89 kB (未变化)
- ✅ 复制了 293 个文件
- ✅ 生成了 `package.zip`

## 测试建议

1. **Tab 模式测试**:
   - 创建新思维导图
   - 在设置中选择 "Tab" 编辑窗口
   - 编辑思维导图，检查 iframe 是否占满整个 Tab

2. **Dialog 模式测试**:
   - 创建新思维导图
   - 在设置中选择 "Dialog" 编辑窗口
   - 编辑思维导图，检查 iframe 是否占满整个对话框

3. **响应式测试**:
   - 调整窗口大小
   - 检查 iframe 是否随窗口大小自适应

## 相关文件

- `src/index.scss` - 样式文件 (已修改)
- `src/index.ts` - 插件主文件 (HTML 使用 `.mindmap-edit-tab`)
- `dist/index.css` - 构建后的样式文件

## 修复时间

2025-11-24 08:36

## 状态

✅ 已修复并重新构建
