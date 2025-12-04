## 📖 使用

输入 `/mindmap`​或`/脑图`​或`/思绪思维导图`,创建图片并打开思维导图编辑器，编辑完成后点击保存即可。

<img alt="image" src="https://fastly.jsdelivr.net/gh/Achuan-2/PicBed@pic/assets/network-asset-b6f2eee6-7954-4ecf-a53a-b19174ce0d30-20251204205852-56pdg0z.png" style="width: 1906px;" />

<img alt="image" src="https://fastly.jsdelivr.net/gh/Achuan-2/PicBed@pic/assets/network-asset-4bd6dc62-5425-4f5d-92da-f250d4b2acd8-20251204205949-w7j1nie.png" />


> ⚠️ 使用注意：目前图片支持二次编辑是通过自定义块属性写入思维导图数据实现的，如果自定义块属性被删除或者修改，可能会导致思维导图数据丢失，无法二次编辑。

## ⚙️ 插件设置概览

<img alt="image" src="https://fastly.jsdelivr.net/gh/Achuan-2/PicBed@pic/assets/network-asset-c2be3dfa-54aa-48e2-bf28-ae6e7df1bef3-20251204205959-gwpbfmn.png" style="width: 1121px;" />

## 📦 开发

如何打包插件：

```bash
cd mind-map/web && npm run build
cd ../.. && npm run build
```

## ❤️致谢

- 思维导图功能使用[mindmap](https://github.com/wanglin2/mind-map)，并进行了魔改，魔改repo见[https://github.com/Achuan-2/mind-map]

  - 支持大纲复制为Markdown多级列表和粘贴多级列表
  - 节点也可以直接选中粘贴markdown批量粘贴出多个节点
  - 导入markdown支持解析思源图片、思源块链接和块引用
  - 优化保存图片：节点高亮和折叠按钮隐藏
  - 图片拖拽和节点宽度拖拽支持吸附
- 参考了[YuxinZhaozyx](https://github.com/YuxinZhaozyx/siyuan-embed-excalidraw)嵌入式系列插件的设计

## ❤️用爱发电

如果喜欢我的插件，欢迎给GitHub仓库点star和微信赞赏，这会激励我继续完善此插件和开发新插件。

维护插件费时费力，个人时间和精力有限，开源只是分享，不等于我要浪费我的时间免费帮用户实现ta需要的功能，

我需要的功能我会慢慢改进（打赏可以催更），有些我觉得可以改进、但是现阶段不必要的功能需要打赏才改进（会标注打赏标签和需要打赏金额），而不需要的功能、实现很麻烦的功能会直接关闭issue不考虑实现，我没实现的功能欢迎有大佬来pr

累积赞赏50元的朋友如果想加我微信，可以在赞赏的时候备注微信号，或者发邮件到achuan-2@outlook.com来进行好友申请

<img alt="image" src="https://fastly.jsdelivr.net/gh/Achuan-2/PicBed@pic/assets/network-asset-network-asset-image-20250614123558-fuhir5v.png" />
