# 思源笔记思维导图插件实现总结

## 完成的工作

### 1. 完善 `index.ts` 文件

#### 核心功能实现

**a. 思维导图创建和初始化**
- 修改了 `newMindmapImage` 方法,在创建新思维导图时初始化空的思维导图数据到块属性
- 初始数据结构包含根节点、主题、布局等配置

**b. 编辑器集成 (Tab 模式)**
- 更新了 `setupEditTab` 方法,实现与 simple-mind-map web 应用的集成
- iframe URL 指向 `/plugins/siyuan-embed-mindmap2/mind/index.html`
- 实现了完整的消息通信机制:
  - `request_data`: 从块属性加载思维导图数据
  - `save`: 保存思维导图数据到块属性
  - `export_image`: 导出思维导图为图片 (PNG/SVG)
  - `export_success`: 更新图片文件

**c. 编辑器集成 (Dialog 模式)**
- 更新了 `openEditDialog` 方法,实现与 Tab 模式相同的功能
- 移除了 draw.io 特有的全屏功能代码
- 统一了消息处理逻辑

**d. 数据持久化**
- 思维导图数据保存在块属性 `custom-mindmap` 中
- 数据格式为 JSON 字符串
- 编辑时从块属性读取数据,保存时更新块属性

**e. 图片导出和更新**
- 保存思维导图数据后自动导出为图片
- 支持 PNG 和 SVG 两种格式
- 导出后自动更新文档中的图片显示

#### 类型定义更新

- 在 `src/types/index.d.ts` 中为 `DrawioImageInfo` 接口添加了 `blockID` 属性
- 用于跟踪思维导图所属的块 ID

### 2. 完善打包脚本

#### vite.config.ts 更新

- 修改了静态资源复制配置
- 将 `./draw/` 目录改为 `./mindmap-web/` 目录
- 目标路径设置为 `./mind/`,与 iframe 中的 URL 路径一致

#### 打包流程

```bash
npm run build
```

打包后的文件结构:
```
dist/
├── index.js          # 插件主文件
├── index.css         # 样式文件
├── plugin.json       # 插件配置
├── icon.png          # 插件图标
├── preview.png       # 预览图
├── README*.md        # 说明文档
├── i18n/             # 国际化文件
└── mind/             # simple-mind-map web 应用
    ├── index.html
    └── dist/
        ├── css/
        ├── js/
        └── ...
```

## 工作流程

### 创建新思维导图

1. 用户通过斜杠命令 `/mindmap` 创建思维导图
2. 插件创建占位图片并上传到 assets
3. 初始化空的思维导图数据到块属性
4. 打开编辑器 (Tab 或 Dialog)

### 编辑思维导图

1. 用户点击图片右键菜单 "Edit Mind Map"
2. 插件从块属性读取思维导图数据
3. 通过 postMessage 将数据传递给 iframe 中的 simple-mind-map
4. simple-mind-map 渲染思维导图

### 保存思维导图

1. 用户在 simple-mind-map 中编辑思维导图
2. simple-mind-map 通过 postMessage 发送 `save` 事件
3. 插件将数据保存到块属性
4. 插件请求导出图片
5. simple-mind-map 导出图片并发送 `export_success` 事件
6. 插件更新图片文件
7. 刷新文档中的图片显示

## 消息通信协议

### 插件 → simple-mind-map

```javascript
// 初始化数据
{
  event: 'init_data',
  mindMapData: { /* 思维导图数据 */ },
  mindMapConfig: {},
  lang: 'zh',
  localConfig: null
}

// 请求导出图片
{
  action: 'export_image',
  type: 'png' | 'svg'
}
```

### simple-mind-map → 插件

```javascript
// 请求数据
{
  event: 'request_data'
}

// 应用初始化完成
{
  event: 'app_inited'
}

// 保存数据
{
  event: 'save',
  data: { /* 思维导图数据 */ }
}

// 导出成功
{
  event: 'export_success',
  data: 'data:image/png;base64,...'
}
```

## 技术要点

### 1. 跨 iframe 通信

使用 `window.postMessage` 实现插件与 simple-mind-map web 应用之间的通信

### 2. 数据持久化

- 思维导图数据: 保存在块属性 `custom-mindmap`
- 图片文件: 保存在 `data/assets/` 目录

### 3. 图片格式处理

- 支持 PNG 和 SVG 两种格式
- 使用 `fixImageContent` 方法处理图片内容
- 处理 SVG 的 light-dark CSS 兼容性问题

### 4. 错误处理

- 所有异步操作都有 try-catch 保护
- 消息解析失败时静默处理
- 数据加载失败时使用默认值

## 配置选项

插件支持以下配置选项 (在设置中):

- **labelDisplay**: 标签显示方式 (不显示/始终显示/悬停显示)
- **embedImageFormat**: 嵌入图片格式 (svg/png)
- **fullscreenEdit**: 全屏编辑 (已移除,不适用于 simple-mind-map)
- **editWindow**: 编辑窗口类型 (dialog/tab)
- **themeMode**: 主题模式 (浅色/深色/跟随系统)

## 测试建议

1. **创建测试**: 使用 `/mindmap` 命令创建新思维导图
2. **编辑测试**: 编辑思维导图,添加节点、修改文本
3. **保存测试**: 保存后刷新页面,检查数据是否持久化
4. **图片测试**: 检查导出的图片是否正确显示
5. **格式测试**: 测试 PNG 和 SVG 两种格式
6. **窗口测试**: 测试 Tab 和 Dialog 两种编辑模式

## 已知问题和改进建议

### 当前实现

✅ 思维导图数据保存到块属性  
✅ 图片导出和更新  
✅ Tab 和 Dialog 两种编辑模式  
✅ PNG 和 SVG 格式支持  
✅ 消息通信机制  

### 可能的改进

1. **性能优化**: 大型思维导图的加载和保存性能
2. **错误提示**: 添加用户友好的错误提示
3. **撤销/重做**: 考虑添加撤销重做功能
4. **导出选项**: 添加更多导出选项 (PDF, Markdown 等)
5. **主题同步**: 同步思源笔记的主题到思维导图

## 文件清单

### 修改的文件

- `src/index.ts` - 主要插件逻辑
- `src/types/index.d.ts` - 类型定义
- `vite.config.ts` - 构建配置

### 依赖的文件

- `mindmap-web/index.html` - simple-mind-map web 应用入口
- `mindmap-web/dist/` - simple-mind-map 构建产物

## 部署步骤

1. 确保 `mindmap-web` 目录包含完整的 simple-mind-map web 应用
2. 运行 `npm run build` 构建插件
3. 将 `dist` 目录复制到思源笔记的插件目录
4. 重启思源笔记或重新加载插件

## 总结

本次实现完成了思源笔记思维导图插件的核心功能:

1. ✅ 集成 simple-mind-map web 应用
2. ✅ 实现思维导图数据的保存和加载
3. ✅ 实现图片导出和更新
4. ✅ 支持 Tab 和 Dialog 两种编辑模式
5. ✅ 完善打包脚本

插件现在可以正常使用,用户可以在思源笔记中创建、编辑和保存思维导图。
