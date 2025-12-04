
## 使用

输入 `/mindmap`或`脑图`或`思绪思维导图`,创建图片并打开思维导图编辑器，编辑完成后点击保存即可。


<img width="1906" height="1248" alt="image" src="https://github.com/user-attachments/assets/b6f2eee6-7954-4ecf-a53a-b19174ce0d30" />


<img width="2240" height="1197" alt="image" src="https://github.com/user-attachments/assets/4bd6dc62-5425-4f5d-92da-f250d4b2acd8" />


## 插件设置概览

<img width="1121" height="1195" alt="image" src="https://github.com/user-attachments/assets/c2be3dfa-54aa-48e2-bf28-ae6e7df1bef3" />


## 如何打包

```bash
cd mind-map/web && npm run build
cd ../.. && npm run build
```

## 致谢

- 思维导图功能使用[mindmap](https://github.com/wanglin2/mind-map)，并进行了魔改，魔改repo见[https://github.com/Achuan-2/mind-map]
    - 支持大纲复制为Markdown多级列表和粘贴多级列表
    - 节点也可以直接选中粘贴markdown批量粘贴出多个节点
    - 导入markdown支持解析思源图片、思源块链接和块引用
    - 优化保存图片：节点高亮和折叠按钮隐藏
    - 图片拖拽和节点宽度拖拽支持吸附
- 参考了[YuxinZhaozyx](https://github.com/YuxinZhaozyx/siyuan-embed-excalidraw)嵌入式系列插件的设计
