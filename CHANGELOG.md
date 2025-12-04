## v1.2.0 / 20241204

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