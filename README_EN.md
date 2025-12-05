## 📖 Usage

Type `/mindmap`, `/脑图`, or `/思绪思维导图` to create an image and open the mind map editor. After editing, click save.

<img alt="image" src="https://fastly.jsdelivr.net/gh/Achuan-2/PicBed@pic/assets/network-asset-b6f2eee6-7954-4ecf-a53a-b19174ce0d30-20251204205852-56pdg0z.png" style="width: 1906px;" />

<img alt="image" src="https://fastly.jsdelivr.net/gh/Achuan-2/PicBed@pic/assets/network-asset-4bd6dc62-5425-4f5d-92da-f250d4b2acd8-20251204205949-w7j1nie.png" />

> ⚠️ Usage Note: Currently, the ability to re-edit images is implemented by storing mind map data in custom block attributes. If the custom block attributes are deleted or modified, the mind map data may be lost, and re-editing will not be possible.

> ❓ Why not directly save the mind map file but choose to automatically save as an image each time?
>
> Because if I draw a mind map and want to share it, I can directly copy the image and share it. When writing blog posts, if I want to add a mind map, I can conveniently add the mind map image, upload it to the image bed with one click, and paste it to various platforms without messing with exports. Additionally, even if you uninstall the plugin or stop using SiYuan notes or Mind Map in the future, the drawn maps won't be lost, and you don't have to worry about the notes not displaying the mind map when opened.

## ✨ Plugin Feature Introduction

### 2.1 Support for Markdown Paste Import as Mind Map

This plugin has made many optimizations for Markdown pasting

- Added a paste Markdown button in the top bar to quickly convert Markdown to mind map, or select a node to paste Markdown as child nodes, supporting mixed parsing of headings and lists, supporting import of rich text styles like bold, italic, etc.
- Pasting markdown supports parsing SiYuan images, so SiYuan notes' graphic notes can be quickly converted to mind maps. Supports parsing SiYuan notes' block references and block links, quickly adding nodes with jump links.
- Supports copying mind map outline as Markdown multi-level lists.

### 2.2 Note to Mind Map

Enter SiYuan note document ID or block ID, directly read the document outline or block content, automatically convert to mind map. Each node in the document outline will have a block link bound, and block content will add a link to the root node, hover to preview note content.

- There is an input box to directly enter block ID, and a button next to it to quickly set it to the document where the mind map block is located.
- Import type: For document blocks, you can choose to get the title outline list as mind map, or convert all content to mind map.
- Auto numbering: You can choose whether to auto number during import (1, 1.1, 1.1.1).
- Import level: Limit the import level depth, default all import.
- Auto set block links: For document outline, each node sets the corresponding title link, for block content, set block link for root node.
- Auto update content: If "Auto get block content" is checked, each time opened, it will first auto get block content, update mind map.

<img alt="image" src="https://assets.b3logfile.com/siyuan/1610205759005/assets/image-20251205103428-9xjoht6.png" />

**Effect Display**

- Import document outline

  <img alt="Import document outline.gif" src="https://assets.b3logfile.com/siyuan/1610205759005/assets/导入文档大纲-TOpBvCj-20251205103744-l9p522r.gif" />
- Import heading block

  Images can also be directly auto imported.

  <img alt="Import heading.gif" src="https://assets.b3logfile.com/siyuan/1610205759005/assets/导入标题-eQXPTKm-20251205103754-e605v4h.gif" />

### 2.3 Block Link Hover Preview

If the node link is a SiYuan block link, supports hover preview to display note content.

<img alt="Mind map hover preview" src="https://assets.b3logfile.com/siyuan/1610205759005/assets/思维导图悬浮预览-20251205103903-64rv9e5.gif" />

## ⚙️ Plugin Settings Overview

<img alt="image" src="https://fastly.jsdelivr.net/gh/Achuan-2/PicBed@pic/assets/network-asset-c2be3dfa-54aa-48e2-bf28-ae6e7df1bef3-20251204205959-gwpbfmn.png" style="width: 1121px;" />

## 📦 Development

How to Build
```bash
cd mind-map/web && npm run build
cd ../.. && npm run build
```

## ❤️ Acknowledgments

- The mind map functionality uses [mindmap](https://github.com/wanglin2/mind-map) with custom modifications. The modified repo can be found at [https://github.com/Achuan-2/mind-map]
    - Nodes can be directly selected and pasted with markdown to batch paste multiple nodes
    - Support for copying outlines as Markdown multi-level lists
    - Import markdown with support for parsing SiYuan images, SiYuan block links and block references
    - Optimized image saving: node highlighting and collapse buttons are hidden
    - Image dragging and node width dragging support snapping
- Referenced the design of [YuxinZhaozyx](https://github.com/YuxinZhaozyx/siyuan-embed-excalidraw)'s embedded plugin series

## ❤️ Support

If you like my plugin, please star the GitHub repository and consider sponsoring on WeChat. This will motivate me to continue improving this plugin and developing new ones.

Maintaining plugins is time-consuming and labor-intensive. My personal time and energy are limited. Open source is about sharing, but it doesn't mean I should waste my time implementing features for free that users need.

I will gradually improve the features I need (donations can expedite updates). Some features that I think can be improved but are not necessary at this stage will only be improved with donations (will be marked with a donation tag and required amount). Features I don't need or are very troublesome to implement will be directly closed without consideration. For features I haven't implemented, PRs from skilled developers are welcome.

If you've donated a total of 50 yuan and want to add me on WeChat, you can note your WeChat ID when donating, or send an email to achuan-2@outlook.com to apply for friendship.

<img alt="image" src="https://fastly.jsdelivr.net/gh/Achuan-2/PicBed@pic/assets/network-asset-network-asset-image-20250614123558-fuhir5v.png" />
