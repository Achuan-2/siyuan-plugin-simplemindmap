## v2.4.0 / 20260927

- 🎨思源导图设置-外观样式优化

  - 支持自定义思维导图字体
  - 支持主题字号与连线粗细设置并调整默认值
- 🎨 性能优化

## v2.3.6 / 20251212

- 🎨笔记转导图支持是否添加思源超链接
- 🐛修复笔记转导图右键菜单失效问题

## v2.3.5 / 20251211

- 🎨 支持设置跟随思源主题

## v2.3.4 / 20251211

- 🐛 优化新建导图，有块属性的块新建导图，不应该报错，还会导致主题设置失败

## v2.3.3 / 20251211

- 🎨 思维导图连线风格支持括号连线

## v2.3.2/20251211

- 🎨 思维导图连线风格连线添加圆弧样式
- 🐛 优化空内容新输入文字，预览文字变形

## v2.3.1/20251210

- 🎨 默认主题配置修改，连线用曲线
- 🐛 修复右键菜单转导图没有初始化主题配置
- 💻 把可用主题、结构、彩虹条放在defaultSettings.ts里

## v2.3.0 /20251210

- ✨ 插件设置支持设置导图默认结构 [#58](https://github.com/Achuan-2/siyuan-plugin-simplemindmap/issues/58)
- 🎨插件设置改为svelte，添加用爱发电Tab [#50](https://github.com/Achuan-2/siyuan-plugin-simplemindmap/issues/50)
- 🐛默认主题设置失效 [#55](https://github.com/Achuan-2/siyuan-plugin-simplemindmap/issues/55)
- 🎨块菜单、文档树菜单、文档菜单的笔记转导图弹窗标题优化
- 🐛 深色导图在深色模式下会被反相 [#56](https://github.com/Achuan-2/siyuan-plugin-simplemindmap/issues/56)
- 🎨笔记转导图：优化多块输入，支持多id输入，并支持刷新

## v2.2.0 / 20251208

- ✨添加 「复制该节点为思源图片（可编辑）」，图片会保留思维导图数据，支持在思源再编辑 [#54](https://github.com/Achuan-2/siyuan-plugin-simplemindmap/issues/54)

## v2.1.0 / 20251208

- ✨块菜单添加内容转导图功能，支持单个块和批量块转导图

## v2.0.0 / 20251207

- ✨ 支持导出的png/svg依然可再导入编辑 [#47](https://github.com/Achuan-2/siyuan-embed-mindmap/issues/47)
- 🎨 新建子节点不填充文字 [#49](https://github.com/Achuan-2/siyuan-embed-mindmap/issues/49)

## v1.9.2 / 20251207

- 🎨 斜杆菜单插入的按钮id改为simplemindmap

## v1.9.0 / 20251207

- 🎨 文档树和文档块标支持文档大纲转导图
- 🎨 将【设置】里的参数值存储为全局设置，打开导图/创建导图自动生效 [#46](https://github.com/Achuan-2/siyuan-embed-mindmap/issues/46)
- 🎨Markdown粘贴：数学公式和化学公式支持直接渲染和二次编辑
- 🎨Markdown粘贴：kbd键盘样式转纯文本
- 🎨节点复制为Markdown：支持数学公式
- 📝完善README
- 🐛打开临时Tab设置的Tab title需要是纯文本

## v1.8.0 / 20251206

- ✨笔记转导图刷新不重置位置
- ✨复制Markdown支持复制行内超链接和节点超链接，节点链接格式为在最后添加🔗
- 🎨改进Markdown粘贴识别，目前不会自动添加节点链接，链接只会识别为行内链接（这样可以导出markdown可以保留行内链接，也方便直接悬浮预览查看内容）
- 🎨文档树转思维导图使用行内链接不用节点链接
- 🎨改进节点自动编号，节点自动编号应该写在`<p>`标签里，目前是写在外面
- 🎨支持Markdown下划线解析
- 🐛绑定了块不显示刷新按钮问题

## v1.7.0 / 20251206

- 🎨笔记转导图支持子文档转思维导图  [#42](https://github.com/Achuan-2/siyuan-embed-mindmap/issues/42)

## v1.6.1 / 20251206

- 🎨Markdown解析优化 [#40](https://github.com/Achuan-2/siyuan-embed-mindmap/issues/40)
  - 列表的段落层级优化
  - 段落跟列表，列表识别为段落的子节点
  - 段落里出现多个块引优化

## v1.6.0 /20251206

- ✨行内样式支持超链接 [#20](https://github.com/Achuan-2/siyuan-plugin-simplemindmap/issues/20)
- 🎨Markdown粘贴：支持解析思源块引为超链接
- 🎨Markdown粘贴：选中节点粘贴思源块链接会自动给节点添加节点链接
- 🎨笔记转思维导图优化：忽略当前导图的图片 [#41](https://github.com/Achuan-2/siyuan-embed-mindmap/issues/41)
- 🎨节点链接弹窗链接优化：不要预设链接类型 [#35](https://github.com/Achuan-2/siyuan-embed-mindmap/issues/35)
- 🎨节点链接弹窗往输入框粘贴思源块引用，自动处理为块链接
- 🎨优化图片右上角编辑按钮对其他插件的兼容性 [#39](https://github.com/Achuan-2/siyuan-embed-mindmap/issues/39)

## v1.5.0 / 20251205

- 🎨 支持设置是否启用彩虹线条 [#38](https://github.com/Achuan-2/siyuan-embed-mindmap/issues/38)
- 🎨彩虹线条和导图设置保存在块属性里[#36](https://github.com/Achuan-2/siyuan-embed-mindmap/issues/36) [#28](https://github.com/Achuan-2/siyuan-embed-mindmap/issues/28)
- 🎨 dialog模式支持在新标签打开

## v1.4.0 / 20251205

- 🎨节点块链接如果是思源块链接支持悬浮预览思源内容 [#30](https://github.com/Achuan-2/siyuan-embed-mindmap/issues/30)

## v1.3.0 / 20251205

- ✨笔记转导图功能 [#29](https://github.com/Achuan-2/siyuan-embed-mindmap/issues/29)

## v1.2.0 / 20251204

- 🎨插件改名siyuan-plugin-simplemindmap
- 🎨改进svg导出，dom隐藏也能正确导出，参考了drawnix
- 🎨支持设置默认主题和主题自定义 [#26](https://github.com/Achuan-2/siyuan-embed-mindmap/issues/26)
- 🎨支持复制节点为图片 [#14](https://github.com/Achuan-2/siyuan-embed-mindmap/issues/14)
- 🎨导入的图片添加复制按钮 [#15](https://github.com/Achuan-2/siyuan-embed-mindmap/issues/15)
- 🎨 如果粘贴的是链接或者列表链接格式，需要识别为节点链接 [#19](https://github.com/Achuan-2/siyuan-embed-mindmap/issues/19)
- 🎨dialog模式关闭窗口时需要调用保存，避免没有保存成功
- 🐛根节点点击右键菜单的所有按钮没反应
- 🐛加了空格+左键拖动画布功能后，节点目前想输入空格无法输入

## v1.1.3 / 20251128

- 🎨支持删除线，优化段落粘贴的markdown解析
- 🎨 大纲复制Markdown功能，需要支持加粗、斜体等复制 [#13](https://github.com/Achuan-2/siyuan-plugin-simplemindmap/issues/13)
- 🐛 第一次拖动图片突然变大问题，优化第一次粘贴图片的默认大小

  粘贴图片后，第一次拖动图片大小会变得非常大，原因是节点没有根据存储的imageSize渲染，拖动的时候添加custom参数后才突然按照imageSize渲染
- 🎨主题修改：根节点取消圆角矩形
- 🎨 修复png导出问题，完善设置、斜杆菜单

## v1.1.1 / 20251126

- 🎨 支持按住空格+左键拖动画布、默认左键框选右键拖动画布
