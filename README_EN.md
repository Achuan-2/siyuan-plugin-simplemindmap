This is a mind map plugin for SiYuan Note, featuring automatic saving of mind maps as images and support for secondary editing of images. Additionally, it supports binding mind maps to blocks to retrieve note content, and converting document outlines, document content, and document trees into mind maps.

## 1 📖 Basic Usage

Enter `/mindmap` or `/脑图` or `/思绪思维导图` to create an image and open the mind map editor. After editing, click save.

<img alt="image" src="https://fastly.jsdelivr.net/gh/Achuan-2/PicBed@pic/assets/network-asset-b6f2eee6-7954-4ecf-a53a-b19174ce0d30-20251204205852-56pdg0z.png" style="width: 1906px;" />

<img alt="image" src="https://fastly.jsdelivr.net/gh/Achuan-2/PicBed@pic/assets/network-asset-4bd6dc62-5425-4f5d-92da-f250d4b2acd8-20251204205949-w7j1nie.png" />

> ⚠️ **Usage Notes**
> Currently, secondary editing of images is achieved by writing mind map data into custom block attributes. If custom block attributes are deleted or modified, mind map data may be lost, making secondary editing impossible.

> ❓**Why save as image each time instead of directly saving the mind map file?**
>
> 1. Permanent preservation. Even if you uninstall the plugin or stop using SiYuan Note or Mind Map, the drawings won't be lost, and notes won't fail to display the mind map.
> 2. Easy sharing. If you want to share a mind map, you can directly copy the image. When writing blog posts, you can conveniently add mind map images, upload to image hosting and paste to share on various platforms. If content needs modification, you can edit directly, and the image will update automatically, no need for repeated exports.

## 2 ✨ Plugin Features Introduction

### 2.1 Support for Pasting Markdown to Import as Mind Map

This plugin has optimized Markdown pasting a lot.

- Added a paste Markdown button in the top bar to quickly convert Markdown to mind map, or choose a node to paste Markdown as child nodes.
- Parsing level optimization:
  - Support mixed parsing of headings and lists.
  - Lists after paragraphs are recognized as child nodes of the paragraph.
- Parsing supports rich text:
  - Bold
  - Italic
  - Hyperlinks
  - Underline
  - Strikethrough
  - Math formulas
- Parsing supports SiYuan images and block references/links:
  - Pasting Markdown supports parsing SiYuan images, so graphic notes in SiYuan can be quickly converted to mind maps.
  - Supports parsing SiYuan's block references and links, quickly adding nodes with jump links.

The following is the parsing effect of one-click converting SiYuan document content to mind map.

SiYuan document content:

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/1765078238061-2025-12-07.png)

One-click render to mind map

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/20251207112953-2025-12-07.png)

### 2.2 Support Copy as Markdown

Right-click on nodes to support copying as Markdown.

Copying as Markdown converts nodes to lists, supporting preservation of the following styles:

* Bold
* Underline
* Italic
* Strikethrough
* Inline links and node links (node links add 🔗 at the end)
* Math formulas

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/20251207102316-2025-12-07.png)

### 2.3 Note to Mind Map

Can convert document outline, document content, or document tree to mind map.

- Input id: There is a button next to it to quickly set to the document where the mind map block is located, supports notebook id, document block ID, and ordinary block ID.
- Import type:
  - For document blocks, you can choose to get title outline list, document content, or sub-document tree.
  - For notebooks, import sub-document tree.
  - For ordinary blocks, import block content.
- Auto numbering: You can choose whether to auto-number when importing (1, 1.1, 1.1.1).
- Import level: Limit the import level depth, default all import.
- Auto set block links: For document outlines, each node sets the corresponding title link; for block content, set block link on root node.
- Auto update content: If "Auto get block content" is checked, each time opened, auto get block content first, update mind map.

<img alt="image" src="https://fastly.jsdelivr.net/gh/Achuan-2/PicBed@pic/assets/image-20251205103428-9xjoht6.png" />

**Effect Display**

- Import document outline

  <img alt="Import document outline.gif" src="https://fastly.jsdelivr.net/gh/Achuan-2/PicBed@pic/assets/%E5%AF%BC%E5%85%A5%E6%96%87%E6%A1%A3%E5%A4%A7%E7%BA%B2-TOpBvCj-20251205103744-l9p522r.gif" />
- Import title block

  Images can also be directly auto-imported.

  <img alt="Import title.gif" src="https://fastly.jsdelivr.net/gh/Achuan-2/PicBed@pic/assets/%E5%AF%BC%E5%85%A5%E6%A0%87%E9%A2%98-eQXPTKm-20251205103754-e605v4h.gif" />
- Import document tree

  ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/20251207113959-2025-12-07.png)

  ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/20251207114039-2025-12-07.png)

### 2.4 Block Link Hover Preview

If node links are SiYuan block links, support hover preview to display note content.

<img alt="Mind map hover preview" src="https://fastly.jsdelivr.net/gh/Achuan-2/PicBed@pic/assets/%E6%80%9D%E7%BB%B4%E5%AF%BC%E5%9B%BE%E6%82%AC%E6%B5%AE%E9%A2%84%E8%A7%88-20251205103903-64rv9e5.gif" />

### 2.5 Quick View Document Tree and Document Outline Structure

Document tree has menu to directly display document tree structure and document outline.

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/20251207114229-2025-12-07.png)

## 3 ⚙️ Plugin Settings Overview

Configurable:

- Whether to render mind map window as popup or tab.
- Set mind map default theme, set theme custom config.
- Set whether mind map enables rainbow lines.
- Global mind map settings: enable watermark, performance mode, etc.

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/20251207101930-2025-12-07.png)

## 4 📦 Development

How to package the plugin:

```bash
cd mind-map/web && npm run build
cd ../.. && npm run build
```

## 5 ❤️ Thanks

- Mind map functionality uses the open-source [Mind Map Component](https://github.com/wanglin2/mind-map), and has been modified, modified repo see [Achuan-2/mind-map](https://github.com/Achuan-2/mind-map)

  - Nodes can also directly select and paste Markdown to batch paste multiple nodes.
  - Support outline copy as Markdown multi-level list.
  - Import Markdown supports parsing SiYuan images, SiYuan block links and references.
  - Optimize save image: node highlight and collapse button hide.
  - Image drag and node width drag support snapping.
  - Support inline hyperlinks.
  - Support chemical formula rendering.
- Referenced [YuxinZhaozyx](https://github.com/YuxinZhaozyx/siyuan-embed-excalidraw) embedded series plugin design.

## 6 ❤️ Powered by Love

If you like my plugin, welcome to star the GitHub repo and WeChat appreciation, this will motivate me to continue improving this plugin and develop new plugins.

Maintaining plugins takes time and effort, personal time and energy are limited, open source is just sharing, not that I have to waste my time to help users implement features they need for free.

Features I need I will slowly improve (donations can urge updates), some features I think can be improved but not necessary at this stage need donations to improve (will mark donation label and required amount), and unnecessary features, troublesome to implement features will directly close issue without consideration, features I haven't implemented welcome big shots to PR.

Friends who have accumulated 50 yuan in donations, if you want to add my WeChat, you can note WeChat number when donating, or email achuan-2@outlook.com to apply for friend.

<img alt="image" src="https://fastly.jsdelivr.net/gh/Achuan-2/PicBed@pic/assets/network-asset-network-asset-image-20250614123558-fuhir5v.png" />