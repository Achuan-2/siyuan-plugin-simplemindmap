插件地址：[Achuan-2/siyuan-plugin-simplemindmap](https://github.com/Achuan-2/siyuan-plugin-simplemindmap)

插件简介：这是一款思源笔记的思维导图插件，特点是支持自动保存思维导图为图片并支持图片二次编辑。此外，还支持导图与块绑定获取笔记内容，支持文档大纲、文档内容、文档树转导图

## 1 📖 基本使用

输入 `/mindmap`或 `/脑图`或 `/思绪思维导图`，选择「思绪思维导图」，会自动创建图片并打开思维导图编辑器，编辑完成后点击保存即可。保存的图片之后右键还能继续编辑。

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/20251207122605-2025-12-07.png)

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/20251207122625-2025-12-07.png)


> ❓**为什么不直接保存思维导图文件而选择每次编辑自动保存为图片呢？**
>
> 1. 永久保留。即使你卸载了插件，或者以后不用思源笔记，不用思绪思维导图，画的图也不用怕丢失，不用怕打开的笔记显示不出思维导图。
> 2. 便于分享。画了思维导图想要分享，我就可以直接复制图片分享出去了，在写博客文章的时候如果想要添加一个思维导图，可以便捷添加思维导图图片，一键上传图床然后粘贴分享到各个平台，如果内容要修改就可以直接编辑，图片会自动更新，就不用折腾重复导出了。

## 2 ✨插件功能介绍

### 2.1 支持 Markdown 粘贴导入为思维导图

本插件对Markdown粘贴做了很多优化

- 顶栏添加了粘贴Markdown按钮，迅速把Markdown转为思维导图，也可以选择某个节点粘贴Markdown为子节点
- 解析层级优化：
  - 支持标题和列表混排解析
  - 段落后的列表识别为段落的子节点
- 解析支持富文本：
  - 加粗
  - 斜体
  - 超链接
  - 下划线
  - 删除线
  - 数学公式
- 解析支持思源图片和块引用、块链接：
  - 粘贴markdown支持解析思源图片，这样思源笔记的图文笔记可以迅速转为思维导图
  - 支持解析思源笔记的块引用和块链接，迅速添加带跳转链接的节点

下图为思源文档内容一键转导图的解析效果

思源笔记文档内容：

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/1765078238061-2025-12-07.png)

一键渲染为导图

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/20251207112953-2025-12-07.png)

### 2.2 支持复制为Markdown

节点右键支持复制为Markdown

复制Markdown会把节点转列表，支持保留如下样式

* 加粗
* 下划线
* 斜体
* 删除线
* 行内链接和节点链接（节点链接是末尾添加🔗）
* 数学公式

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/20251207102316-2025-12-07.png)

### 2.3 笔记转导图

可把文档大纲、文档内容或者文档树转为导图

- 输入id：旁边有一个按钮点击可快速设置为导图块所在文档，支持笔记本id、文档块ID和普通块ID
- 导入类型：
  - 对于文档块可以选择是获取标题大纲列表、文档内容还是子文档树
  - 对于笔记本，导入子文档树
  - 对于普通块，导入块内容
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
- 导入文档树

  ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/20251207113959-2025-12-07.png)

  ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/20251207114039-2025-12-07.png)

### 2.4 块链接悬浮预览

节点链接如果是思源块链接，支持悬浮预览显示笔记内容

<img alt="思维导图悬浮预览" src="https://fastly.jsdelivr.net/gh/Achuan-2/PicBed@pic/assets/%E6%80%9D%E7%BB%B4%E5%AF%BC%E5%9B%BE%E6%82%AC%E6%B5%AE%E9%A2%84%E8%A7%88-20251205103903-64rv9e5.gif" />

### 2.5 快速查看文档树、文档大纲、块结构

文档树有菜单可以直接显示文档树结构和文档大纲

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/20251207114229-2025-12-07.png)

文档块右键菜单可以选择文档大纲和文档内容转导图

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/20251208095812-2025-12-08.png)

块菜单右键菜单也可以单选或者多选块转导图
![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/20251208095725-2025-12-08.png)

### 2.6 导出的图片可再导入

- 思维导图导出为png、svg图片时，思维导图数据会自动写入图片的元数据中，之后可以直接把图片再导入为思维导图进行编辑，或者直接粘贴进思源进行编辑
- 思维导图节点右键「复制该节点为思源图片（可编辑）」，图片也会保留思维导图数据，这样你可以快速复制某个节点为图片，进行再编辑
   
  ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/思维导图支持二次编辑-2025-12-08.gif)

**插件如何识别图片是思维导图图片**：

- 把图片粘贴进思源笔记，打开图片右键菜单，就会自动判断图片是否为思维导图图片，如果是的话，会出现「编辑思维导图」按钮

## 3 ⚙️ 插件设置概览

可配置

- 渲染思维导图窗口是弹窗还是标签页
- 设置思维导图默认主题，设置主题自定义配置
- 设置思维导图是否开启彩虹线条
- 全局思维导图设置：开启水印、性能模式等设置

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/20251207101930-2025-12-07.png)


## 4 📝 插件会创建的自定义属性

插件创建的导图块会添加自定义属性
- `custom-mindmap-image`: bool, 标记该块是思维导图图片块
- `custom-mindmap-setting`: json，存储思维导图的设置数据
- `custom-mindmap-rainbowlinesconfig`: json，存储彩虹线条的配置数据

## 5 📦 开发

如何打包插件：

```bash
git clone --recursive https://github.com/Achuan-2/siyuan-plugin-simplemindmap.git
cd mind-map/web && npm install && npm run build
cd ../.. && npm install && npm run build
```



## 6 ❤️ 致谢

- 思维导图功能使用开源的[思绪思维导图组件](https://github.com/wanglin2/mind-map)，并进行了魔改，魔改repo见[Achuan-2/mind-map](https://github.com/Achuan-2/mind-map)

  - 节点也可以直接选中粘贴markdown批量粘贴出多个节点
  - 支持大纲复制为Markdown多级列表
  - 导入markdown支持解析思源图片、思源块链接和块引用
  - 优化保存图片：节点高亮和折叠按钮隐藏
  - 图片拖拽和节点宽度拖拽支持吸附
  - 支持行内超链接
  - 支持化学公式渲染
- 参考了[YuxinZhaozyx](https://github.com/YuxinZhaozyx/siyuan-embed-excalidraw)嵌入式系列插件的设计

## 7 ❤️ 用爱发电

如果喜欢我的插件，欢迎给GitHub仓库点star和微信赞赏，这会激励我继续完善此插件和开发新插件。

维护插件费时费力，个人时间和精力有限，开源只是分享，不等于我要浪费我的时间免费帮用户实现ta需要的功能，

我需要的功能我会慢慢改进（打赏可以催更），有些我觉得可以改进、但是现阶段不必要的功能需要打赏才改进（会标注打赏标签和需要打赏金额），而不需要的功能、实现很麻烦的功能会直接关闭issue不考虑实现，我没实现的功能欢迎有大佬来pr

累积赞赏50元的朋友如果想加我微信，可以在赞赏的时候备注微信号，或者发邮件到achuan-2@outlook.com来进行好友申请

<img alt="image" src="https://fastly.jsdelivr.net/gh/Achuan-2/PicBed@pic/assets/network-asset-network-asset-image-20250614123558-fuhir5v.png" />
