## 1 📖 使用

输入 `/mindmap`或 `/脑图`或 `/思绪思维导图`,创建图片并打开思维导图编辑器，编辑完成后点击保存即可。

<img alt="image" src="https://fastly.jsdelivr.net/gh/Achuan-2/PicBed@pic/assets/network-asset-b6f2eee6-7954-4ecf-a53a-b19174ce0d30-20251204205852-56pdg0z.png" style="width: 1906px;" />

<img alt="image" src="https://fastly.jsdelivr.net/gh/Achuan-2/PicBed@pic/assets/network-asset-4bd6dc62-5425-4f5d-92da-f250d4b2acd8-20251204205949-w7j1nie.png" />

> ⚠️ 使用注意：目前图片支持二次编辑是通过自定义块属性写入思维导图数据实现的，如果自定义块属性被删除或者修改，可能会导致思维导图数据丢失，无法二次编辑。

> ❓为什么不直接保存思维导图文件而选择每次编辑自动保存为图片呢？
>
> 因为画了思维导图想要分享，我就可以直接复制图片分享出去了，在写博客文章的时候如果想要添加一个思维导图，也可以便捷添加思维导图图片，一键上传图床然后粘贴分享到各个平台，如果内容要修改就可以修改，图片会自动更新，就不用折腾重复导出了。另外，这样即使你卸载了插件，或者以后不用思源笔记，不用思绪思维导图，画的图也不用怕丢失，不用怕打开的笔记显示不出思维导图。

## 2 ✨插件功能介绍

### 2.1 支持 Markdown 粘贴导入为思维导图

本插件对Markdown粘贴做了很多优化

- 顶栏添加了粘贴Markdown按钮，迅速把Markdown转为思维导图，也可以选择某个节点粘贴Markdown为子节点，支持标题和列表混排解析，支持导入加粗、斜体等markdown富文本样式
- 粘贴markdown支持解析思源图片、这样思源笔记的图文笔记可以迅速转为思维导图。支持解析思源笔记的块引用和块链接，迅速添加带跳转链接的节点
- 支持脑图大纲复制为Markdown多级列表

### 2.2 笔记转导图

输入思源笔记文档id或者块id，直接读取文档大纲或者块内容，自动转为思维导图。文档大纲的每个节点都会添加块链接绑定，块内容则是给根节点添加链接，悬浮即可预览笔记内容

- 有个输入框可以直接输入块 id，旁边还有一个按钮点击快速设置为导图块所在文档
- 导入类型：对于文档块可以选择是获取标题大纲列表为思维导图，还是全部内容转思维导图
- 自动编号：可以选择导入时候是否自动编号（1，1.1，1.1.1）。
- 导入层级：限制导入的层级深度，默认全部导入
- 自动设置块链接：对于文档大纲，每个节点都设置对应标题链接，对于块内容，对根节点设置块链接
- 自动更新内容：如果勾选「自动获取块内容」，每次打开都先自动获取块内容，更新思维导图

<img alt="image" src="https://fastly.jsdelivr.net/gh/Achuan-2/PicBed@pic/assets/image-20251205103428-9xjoht6.png" />

**效果展示**

- 导入文档大纲

  <img alt="导入文档大纲.gif" src="https://fastly.jsdelivr.net/gh/Achuan-2/PicBed@pic/assets/%E5%AF%BC%E5%85%A5%E6%96%87%E6%A1%A3%E5%A4%A7%E7%BA%B2-TOpBvCj-20251205103744-l9p522r.gif" />
- 导入标题块

  图片也是可以直接自动导入的哦

  <img alt="导入标题.gif" src="https://fastly.jsdelivr.net/gh/Achuan-2/PicBed@pic/assets/%E5%AF%BC%E5%85%A5%E6%A0%87%E9%A2%98-eQXPTKm-20251205103754-e605v4h.gif" />

### 2.3 块链接悬浮预览

节点链接如果是思源块链接，支持悬浮预览显示笔记内容

<img alt="思维导图悬浮预览" src="https://fastly.jsdelivr.net/gh/Achuan-2/PicBed@pic/assets/%E6%80%9D%E7%BB%B4%E5%AF%BC%E5%9B%BE%E6%82%AC%E6%B5%AE%E9%A2%84%E8%A7%88-20251205103903-64rv9e5.gif" />

## 3 ⚙️ 插件设置概览

<img alt="image" src="https://fastly.jsdelivr.net/gh/Achuan-2/PicBed@pic/assets/network-asset-c2be3dfa-54aa-48e2-bf28-ae6e7df1bef3-20251204205959-gwpbfmn.png" style="width: 1121px;" />

## 4 📦 开发

如何打包插件：

```bash
cd mind-map/web && npm run build
cd ../.. && npm run build
```

## 5 ❤️致谢

- 思维导图功能使用[mindmap](https://github.com/wanglin2/mind-map)，并进行了魔改，魔改repo见[https://github.com/Achuan-2/mind-map]

  - 节点也可以直接选中粘贴markdown批量粘贴出多个节点
  - 支持大纲复制为Markdown多级列表
  - 导入markdown支持解析思源图片、思源块链接和块引用
  - 优化保存图片：节点高亮和折叠按钮隐藏
  - 图片拖拽和节点宽度拖拽支持吸附
- 参考了[YuxinZhaozyx](https://github.com/YuxinZhaozyx/siyuan-embed-excalidraw)嵌入式系列插件的设计

## 6 ❤️用爱发电

如果喜欢我的插件，欢迎给GitHub仓库点star和微信赞赏，这会激励我继续完善此插件和开发新插件。

维护插件费时费力，个人时间和精力有限，开源只是分享，不等于我要浪费我的时间免费帮用户实现ta需要的功能，

我需要的功能我会慢慢改进（打赏可以催更），有些我觉得可以改进、但是现阶段不必要的功能需要打赏才改进（会标注打赏标签和需要打赏金额），而不需要的功能、实现很麻烦的功能会直接关闭issue不考虑实现，我没实现的功能欢迎有大佬来pr

累积赞赏50元的朋友如果想加我微信，可以在赞赏的时候备注微信号，或者发邮件到achuan-2@outlook.com来进行好友申请

<img alt="image" src="https://fastly.jsdelivr.net/gh/Achuan-2/PicBed@pic/assets/network-asset-network-asset-image-20250614123558-fuhir5v.png" />
