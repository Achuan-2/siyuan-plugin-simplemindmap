## 📖 Usage

Type `/mindmap` or `/simple-mindmap` to create an image and open the mind map editor. Press Ctrl+S to automatically save the image in SVG/PNG format, supporting re-editing.

<img alt="image" src="https://fastly.jsdelivr.net/gh/Achuan-2/PicBed@pic/assets/network-asset-b6f2eee6-7954-4ecf-a53a-b19174ce0d30-20251204205852-56pdg0z.png" style="width: 1906px;" />

<img alt="image" src="https://fastly.jsdelivr.net/gh/Achuan-2/PicBed@pic/assets/network-asset-4bd6dc62-5425-4f5d-92da-f250d4b2acd8-20251204205949-w7j1nie.png" />


> ⚠️ Important Note: Currently, the ability to re-edit images is implemented by storing mind map data in custom block attributes. If the custom block attributes are deleted or modified, the mind map data may be lost and re-editing will not be possible.

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
    - Support for copying outlines as Markdown multi-level lists and pasting multi-level lists
    - Nodes can be directly selected and pasted with markdown to batch paste multiple nodes
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
