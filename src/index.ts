import {
  Dialog,
  Plugin,
  getFrontend,
  fetchSyncPost,
  IWebSocketData,
  getAllEditor,
  openTab,
  getAllModels,
  Custom,
} from "siyuan";
import "@/index.scss";
import PluginInfoString from '@/../plugin.json';
import {
  getImageSizeFromBase64,
  locatePNGtEXt,
  insertPNGpHYs,
  replaceSubArray,
  arrayToBase64,
  base64ToArray,
  base64ToUnicode,
  unicodeToBase64,
  blobToDataURL,
  dataURLToBlob,
  HTMLToElement,
} from "./utils";
import { matchHotKey } from "./utils/hotkey";
import defaultImageContent from "@/default.json";

let PluginInfo = {
  version: '',
}
try {
  PluginInfo = PluginInfoString
} catch (err) {
  console.log('Plugin info parse error: ', err)
}
const {
  version,
} = PluginInfo

const STORAGE_NAME = "config.json";

export default class MindmapPlugin extends Plugin {
  // Run as mobile
  public isMobile: boolean
  // Run in browser
  public isBrowser: boolean
  // Run as local
  public isLocal: boolean
  // Run in Electron
  public isElectron: boolean
  // Run in window
  public isInWindow: boolean
  public platform: SyFrontendTypes
  public readonly version = version

  private _mutationObserver;
  private _openMenuImageHandler;
  private _globalKeyDownHandler;
  private _mouseoverHandler;

  private settingItems: SettingItem[];
  public EDIT_TAB_TYPE = "mindmap-edit-tab";

  async onload() {
    this.initMetaInfo();
    this.initSetting();

    this._mutationObserver = this.setAddImageBlockMuatationObserver(document.body, (blockElement: HTMLElement) => {
      if (this.data[STORAGE_NAME].labelDisplay === "noLabel") return;

      const imageElement = blockElement.querySelector("img") as HTMLImageElement;
      if (imageElement) {
        if (blockElement.getAttribute("custom-mindmap")) {
          const imageURL = imageElement.getAttribute("data-src");
          this.getMindmapImageInfo(imageURL, false).then((imageInfo) => {
            this.updateAttrLabel(imageInfo, blockElement);
          });
        }
      }
    });

    // Add edit button on hover for mindmap images
    let isProcessing = false;
    this._mouseoverHandler = (e) => {
      const imgContainer = (e.target as HTMLElement).closest('[data-type="img"]') as HTMLElement;
      if (!imgContainer || isProcessing) return;

      // Check if this image has custom-mindmap attribute
      const blockElement = imgContainer.closest("div[data-type='NodeParagraph']") as HTMLElement;
      if (!blockElement || !blockElement.getAttribute("custom-mindmap")) return;

      isProcessing = true;
      setTimeout(() => isProcessing = false, 100);

      if (imgContainer.querySelector('.cst-edit-mindmap')) return;

      const action = imgContainer.querySelector('.protyle-action');
      if (!action) return;

      // Adjust original icon style
      const actionIcon = action.querySelector('.protyle-icon');
      if (actionIcon) {
        (actionIcon as HTMLElement).style.borderTopLeftRadius = '0';
        (actionIcon as HTMLElement).style.borderBottomLeftRadius = '0';
      }

      // Insert "Edit Mind Map" button
      const editBtnHtml = `
        <span class="protyle-icon protyle-icon--only protyle-custom cst-edit-mindmap" 
              aria-label="编辑思维导图"
              style="border-top-right-radius:0;border-bottom-right-radius:0;cursor:pointer;">
          <svg class="svg"><use xlink:href="#iconEdit"></use></svg>
        </span>`;
      action.insertAdjacentHTML('afterbegin', editBtnHtml);

      // Bind click event
      const editBtn = imgContainer.querySelector('.cst-edit-mindmap');
      editBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const imgElement = imgContainer.querySelector('img');
        const imgSrc = imgElement?.getAttribute("data-src");
        const blockID = blockElement.getAttribute("data-node-id");
        
        if (imgSrc && blockID) {
          const originalOpacity = (editBtn as HTMLElement).style.opacity;
          (editBtn as HTMLElement).style.opacity = "0.5"; // Visual feedback
          
          this.getMindmapImageInfo(imgSrc, true).then((imageInfo: MindmapImageInfo) => {
            if (imageInfo) {
              if (!this.isMobile && this.data[STORAGE_NAME].editWindow === 'tab') {
                this.openEditTab(imageInfo, blockID);
              } else {
                this.openEditDialog(imageInfo, blockID);
              }
            }
            (editBtn as HTMLElement).style.opacity = originalOpacity;
          });
        }
      });
    };
    document.addEventListener('mouseover', this._mouseoverHandler);

    this.setupEditTab();

    this.protyleSlash = [{
      filter: ["mindmap", "simple-mind-map", "simple-mindmap","思绪思维导图","脑图","naotu","siweidaotu"],
      id: "mindmap",
      html: `<div class="b3-list-item__first"><svg class="b3-list-item__graphic"><use xlink:href="#iconImage"></use></svg><span class="b3-list-item__text">思绪思维导图</span></div>`,
      callback: (protyle, nodeElement) => {
        this.newMindmapImage(protyle, nodeElement.dataset.nodeId, (imageInfo) => {
          if (!this.isMobile && this.data[STORAGE_NAME].editWindow === 'tab') {
            this.openEditTab(imageInfo, nodeElement.dataset.nodeId);
          } else {
            this.openEditDialog(imageInfo, nodeElement.dataset.nodeId);
          }
        });
      },
    }];

    this._openMenuImageHandler = this.openMenuImageHandler.bind(this);
    this.eventBus.on("open-menu-image", this._openMenuImageHandler);

    this._globalKeyDownHandler = this.globalKeyDownHandler.bind(this);
    document.documentElement.addEventListener("keydown", this._globalKeyDownHandler);

    this.reloadAllEditor();
  }

  onunload() {
    if (this._mutationObserver) this._mutationObserver.disconnect();
    if (this._openMenuImageHandler) this.eventBus.off("open-menu-image", this._openMenuImageHandler);
    if (this._globalKeyDownHandler) document.documentElement.removeEventListener("keydown", this._globalKeyDownHandler);
    if (this._mouseoverHandler) document.removeEventListener('mouseover', this._mouseoverHandler);
    this.reloadAllEditor();
    this.removeAllMindmapTab();
  }

  uninstall() {
    this.removeData(STORAGE_NAME);
  }

  openSetting() {
    const dialogHTML = `
<div class="b3-dialog__content"></div>
<div class="b3-dialog__action">
  <button class="b3-button b3-button--cancel" data-type="cancel">${window.siyuan.languages.cancel}</button>
  <div class="fn__space"></div>
  <button class="b3-button b3-button--text" data-type="confirm">${window.siyuan.languages.save}</button>
</div>
    `;

    const dialog = new Dialog({
      title: this.displayName,
      content: dialogHTML,
      width: this.isMobile ? "92vw" : "768px",
      height: "80vh",
      hideCloseIcon: this.isMobile,
    });

    // 配置的处理拷贝自思源源码
    const contentElement = dialog.element.querySelector(".b3-dialog__content");
    this.settingItems.forEach((item) => {
      let html = "";
      let actionElement = item.actionElement;
      if (!item.actionElement && item.createActionElement) {
        actionElement = item.createActionElement();
      }
      const tagName = actionElement?.classList.contains("b3-switch") ? "label" : "div";
      if (typeof item.direction === "undefined") {
        item.direction = (!actionElement || "TEXTAREA" === actionElement.tagName) ? "row" : "column";
      }
      if (item.direction === "row") {
        html = `<${tagName} class="b3-label">
    <div class="fn__block">
        ${item.title}
        ${item.description ? `<div class="b3-label__text">${item.description}</div>` : ""}
        <div class="fn__hr"></div>
    </div>
</${tagName}>`;
      } else {
        html = `<${tagName} class="fn__flex b3-label config__item">
    <div class="fn__flex-1">
        ${item.title}
        ${item.description ? `<div class="b3-label__text">${item.description}</div>` : ""}
    </div>
    <span class="fn__space${actionElement ? "" : " fn__none"}"></span>
</${tagName}>`;
      }
      contentElement.insertAdjacentHTML("beforeend", html);
      if (actionElement) {
        if (["INPUT", "TEXTAREA"].includes(actionElement.tagName)) {
          dialog.bindInput(actionElement as HTMLInputElement, () => {
            (dialog.element.querySelector(".b3-dialog__action [data-type='confirm']") as HTMLElement).dispatchEvent(new CustomEvent("click"));
          });
        }
        if (item.direction === "row") {
          contentElement.lastElementChild.lastElementChild.insertAdjacentElement("beforeend", actionElement);
          actionElement.classList.add("fn__block");
        } else {
          actionElement.classList.remove("fn__block");
          actionElement.classList.add("fn__flex-center", "fn__size200");
          contentElement.lastElementChild.insertAdjacentElement("beforeend", actionElement);
        }
      }
    });

    (dialog.element.querySelector(".b3-dialog__action [data-type='cancel']") as HTMLElement).addEventListener("click", () => {
      dialog.destroy();
    });
    (dialog.element.querySelector(".b3-dialog__action [data-type='confirm']") as HTMLElement).addEventListener("click", () => {
      this.data[STORAGE_NAME].labelDisplay = (dialog.element.querySelector("[data-type='labelDisplay']") as HTMLSelectElement).value;
      this.data[STORAGE_NAME].embedImageFormat = (dialog.element.querySelector("[data-type='embedImageFormat']") as HTMLSelectElement).value;
      this.data[STORAGE_NAME].editWindow = (dialog.element.querySelector("[data-type='editWindow']") as HTMLSelectElement).value;
      this.data[STORAGE_NAME].defaultTheme = (dialog.element.querySelector("[data-type='defaultTheme']") as HTMLSelectElement).value;
      
      // 验证并保存主题配置
      const themeConfigValue = (dialog.element.querySelector("[data-type='themeConfig']") as HTMLTextAreaElement).value;
      try {
        JSON.parse(themeConfigValue); // 验证JSON格式
        this.data[STORAGE_NAME].themeConfig = themeConfigValue;
      } catch (e) {
        // JSON格式错误时使用默认配置
        console.warn('Theme config JSON parse error, using default config');
        this.data[STORAGE_NAME].themeConfig = JSON.stringify(this.DEFAULT_THEME_CONFIG, null, 2);
      }
      
      this.saveData(STORAGE_NAME, this.data[STORAGE_NAME]);
      this.reloadAllEditor();
      this.removeAllMindmapTab();
      dialog.destroy();
    });
  }

  // 可用的思维导图主题列表
  private readonly THEME_LIST = [
    { value: 'default', name: '默认主题' },
    { value: 'skyGreen', name: '天清绿' },
    { value: 'classicGreen', name: '经典绿' },
    { value: 'classicBlue', name: '经典蓝' },
    { value: 'blueSky', name: '天空蓝' },
    { value: 'brainImpairedPink', name: '脑残粉' },
    { value: 'earthYellow', name: '泥土黄' },
    { value: 'freshGreen', name: '清新绿' },
    { value: 'freshRed', name: '清新红' },
    { value: 'romanticPurple', name: '浪漫紫' },
    { value: 'pinkGrape', name: '粉红葡萄' },
    { value: 'mint', name: '薄荷' },
    { value: 'gold', name: '金色vip' },
    { value: 'vitalityOrange', name: '活力橙' },
    { value: 'greenLeaf', name: '绿叶' },
    { value: 'minions', name: '小黄人' },
    { value: 'simpleBlack', name: '简约黑' },
    { value: 'courseGreen', name: '课程绿' },
    { value: 'coffee', name: '咖啡' },
    { value: 'redSpirit', name: '红色精神' },
    { value: 'avocado', name: '牛油果' },
    { value: 'autumn', name: '秋天' },
    { value: 'oreo', name: '奥利奥' },
    { value: 'shallowSea', name: '浅海' },
    { value: 'lemonBubbles', name: '柠檬气泡' },
    { value: 'rose', name: '玫瑰' },
    { value: 'seaBlueLine', name: '海蓝线' },
    { value: 'morandi', name: '莫兰迪' },
    { value: 'cactus', name: '仙人掌' },
    { value: 'classic2', name: '脑图经典2' },
    { value: 'classic3', name: '脑图经典3' },
    { value: 'classic4', name: '脑图经典4' },
    { value: 'classic5', name: '脑图经典5' },
    { value: 'classic6', name: '脑图经典6' },
    { value: 'classic7', name: '脑图经典7' },
    { value: 'classic8', name: '脑图经典8' },
    { value: 'classic9', name: '脑图经典9' },
    { value: 'classic10', name: '脑图经典10' },
    { value: 'classic11', name: '脑图经典11' },
    { value: 'classic12', name: '脑图经典12' },
    { value: 'classic13', name: '脑图经典13' },
    { value: 'classic14', name: '脑图经典14' },
    { value: 'classic15', name: '脑图经典15' },
    // 深色主题
    { value: 'dark', name: '暗色' },
    { value: 'dark2', name: '暗色2' },
    { value: 'dark3', name: '暗色3' },
    { value: 'dark4', name: '暗色4' },
    { value: 'node', name: 'node' },
    { value: 'blackHumour', name: '黑色幽默' },
    { value: 'lateNightOffice', name: '深夜办公室' },
    { value: 'blackGold', name: '黑金' }
  ];

  // 默认主题配置
  private readonly DEFAULT_THEME_CONFIG = {
    imgMaxWidth: 350,
    imgMaxHeight: 200,
    root: {
      shape: "rectangle"
    },
    second: {
      fontSize: 24,
      shape: "rectangle"
    },
    node: {
      fontSize: 24,
      borderColor: "#4D4D4D",
      borderWidth: 2
    }
  };

  private async initSetting() {
    await this.loadData(STORAGE_NAME);
    if (!this.data[STORAGE_NAME]) this.data[STORAGE_NAME] = {};
    if (typeof this.data[STORAGE_NAME].labelDisplay === 'undefined') this.data[STORAGE_NAME].labelDisplay = "showLabelAlways";
    if (typeof this.data[STORAGE_NAME].embedImageFormat === 'undefined') this.data[STORAGE_NAME].embedImageFormat = "png";
    if (typeof this.data[STORAGE_NAME].editWindow === 'undefined') this.data[STORAGE_NAME].editWindow = 'dialog';
    if (typeof this.data[STORAGE_NAME].defaultTheme === 'undefined') this.data[STORAGE_NAME].defaultTheme = 'lemonBubbles';
    if (typeof this.data[STORAGE_NAME].themeConfig === 'undefined') this.data[STORAGE_NAME].themeConfig = JSON.stringify(this.DEFAULT_THEME_CONFIG, null, 2);

    this.settingItems = [
      {
        title: this.i18n.labelDisplay,
        direction: "column",
        description: this.i18n.labelDisplayDescription,
        createActionElement: () => {
          const options = ["noLabel", "showLabelAlways", "showLabelOnHover"];
          const optionsHTML = options.map(option => {
            const isSelected = String(option) === String(this.data[STORAGE_NAME].labelDisplay);
            return `<option value="${option}"${isSelected ? " selected" : ""}>${this.i18n[option]}</option>`;
          }).join("");
          return HTMLToElement(`<select class="b3-select fn__flex-center" data-type="labelDisplay">${optionsHTML}</select>`);
        },
      },
      {
        title: this.i18n.embedImageFormat,
        direction: "column",
        description: this.i18n.embedImageFormatDescription,
        createActionElement: () => {
          const options = ["svg", "png"];
          const optionsHTML = options.map(option => {
            const isSelected = String(option) === String(this.data[STORAGE_NAME].embedImageFormat);
            return `<option value="${option}"${isSelected ? " selected" : ""}>${option}</option>`;
          }).join("");
          return HTMLToElement(`<select class="b3-select fn__flex-center" data-type="embedImageFormat">${optionsHTML}</select>`);
        },
      },
      {
        title: this.i18n.editWindow,
        direction: "column",
        description: this.i18n.editWindowDescription,
        createActionElement: () => {
          const options = ["dialog", "tab"];
          const optionsHTML = options.map(option => {
            const isSelected = String(option) === String(this.data[STORAGE_NAME].editWindow);
            return `<option value="${option}"${isSelected ? " selected" : ""}>${option}</option>`;
          }).join("");
          return HTMLToElement(`<select class="b3-select fn__flex-center" data-type="editWindow">${optionsHTML}</select>`);
        },
      },
      {
        title: this.i18n.defaultTheme,
        direction: "column",
        description: this.i18n.defaultThemeDescription,
        createActionElement: () => {
          const optionsHTML = this.THEME_LIST.map(theme => {
            const isSelected = theme.value === this.data[STORAGE_NAME].defaultTheme;
            return `<option value="${theme.value}"${isSelected ? " selected" : ""}>${theme.name}</option>`;
          }).join("");
          return HTMLToElement(`<select class="b3-select fn__flex-center" data-type="defaultTheme">${optionsHTML}</select>`);
        },
      },
      {
        title: this.i18n.themeConfig,
        direction: "row",
        description: this.i18n.themeConfigDescription,
        createActionElement: () => {
          const textarea = document.createElement("textarea");
          textarea.className = "b3-text-field fn__block";
          textarea.setAttribute("data-type", "themeConfig");
          textarea.style.height = "200px";
          textarea.style.fontFamily = "monospace";
          textarea.style.resize = "vertical";
          textarea.value = this.data[STORAGE_NAME].themeConfig || JSON.stringify(this.DEFAULT_THEME_CONFIG, null, 2);
          return textarea;
        },
      }
    ];
  }

  private initMetaInfo() {
    const frontEnd = getFrontend();
    this.platform = frontEnd as SyFrontendTypes
    this.isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";
    this.isBrowser = frontEnd.includes('browser');
    this.isLocal = location.href.includes('127.0.0.1') || location.href.includes('localhost');
    this.isInWindow = location.href.includes('window.html');

    try {
      require("@electron/remote")
        .require("@electron/remote/main");
      this.isElectron = true;
    } catch (err) {
      this.isElectron = false;
    }
  }

  public setAddImageBlockMuatationObserver(element: HTMLElement, callback: (blockElement: HTMLElement) => void): MutationObserver {
    const mutationObserver = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const addedElement = node as HTMLElement;
              if (addedElement.matches("div[data-type='NodeParagraph']")) {
                if (addedElement.querySelector(".img[data-type='img'] img")) {
                  callback(addedElement as HTMLElement);
                }
              } else {
                addedElement.querySelectorAll("div[data-type='NodeParagraph']").forEach((blockElement: HTMLElement) => {
                  if (blockElement.querySelector(".img[data-type='img'] img")) {
                    callback(blockElement);
                  }
                })
              }
            }
          });
        }
      }
    });

    mutationObserver.observe(element, {
      childList: true,
      subtree: true
    });

    return mutationObserver;
  }

  public async getMindmapImageInfo(imageURL: string, reload: boolean): Promise<MindmapImageInfo | null> {
    const imageURLRegex = /^assets\/.+\.(?:svg|png)$/;
    if (!imageURLRegex.test(imageURL)) return null;

    const imageContent = await this.getMindmapImage(imageURL, reload);
    if (!imageContent) return null;
    // 对 simple-mind-map 的图片，我们不依赖 mxfile 标记，直接返回图片信息
    const imageInfo: MindmapImageInfo = {
      imageURL: imageURL,
      data: imageContent,
      format: imageURL.endsWith(".svg") ? "svg" : "png",
    }
    return imageInfo;
  }

  public getPlaceholderImageContent(format: 'svg' | 'png'): string {
    if (format === 'png') {
      // 创建一个简单的透明PNG图片
      const canvas = document.createElement('canvas');
      canvas.width = 270;
      canvas.height = 183;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(255, 255, 255, 0)'; // 透明背景
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/png');
    } else {
      // 创建一个简单的SVG图片
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="270" height="183"><rect width="100%" height="100%" fill="transparent"/></svg>`;
      const base64 = btoa(unescape(encodeURIComponent(svg)));
      return `data:image/svg+xml;base64,${base64}`;
    }
  }



  public async newMindmapImage(protyle, blockID: string, callback?: (imageInfo: MindmapImageInfo) => void) {
    const format = this.data[STORAGE_NAME].embedImageFormat;
    const defaultTheme = this.data[STORAGE_NAME].defaultTheme || 'lemonBubbles';
    
    // 获取主题自定义配置
    let themeConfig = this.DEFAULT_THEME_CONFIG;
    try {
      const configStr = this.data[STORAGE_NAME].themeConfig;
      if (configStr) {
        themeConfig = JSON.parse(configStr);
      }
    } catch (e) {
      console.warn('Failed to parse theme config, using default');
    }
    
    const imageName = `mindmap-image-${window.Lute.NewNodeID()}.${format}`;
    const placeholderImageContent = this.getPlaceholderImageContent(format);
    const blob = dataURLToBlob(placeholderImageContent);
    const file = new File([blob], imageName, { type: blob.type });
    const formData = new FormData();
    formData.append('path', `data/assets/${imageName}`);
    formData.append('file', file);
    formData.append('isDir', 'false');
    await fetchSyncPost('/api/file/putFile', formData);
    const imageURL = `assets/${imageName}`;
    protyle.insert(`![](${imageURL})`);
      // 初始化空思维导图到块属性
      const initial = {
        root: {
          data: {
            text: '根节点'
          },
          children: []
        },
        theme: {
          template: defaultTheme,
          config: themeConfig
        },
        layout: 'logicalStructure',
        config: {},
        view: null
      };
      try {
        await fetchSyncPost('/api/attr/setBlockAttrs', { id: blockID, attrs: { 'custom-mindmap': JSON.stringify(initial) } });
      } catch (err) { }

      const imageInfo: MindmapImageInfo = {
        imageURL: imageURL,
        data: placeholderImageContent,
        format: format,
      };
    if (callback) {
      callback(imageInfo);
    }
  }

  public async getMindmapImage(imageURL: string, reload: boolean): Promise<string> {
    const response = await fetch(imageURL, { cache: reload ? 'reload' : 'default' });
    if (!response.ok) return "";
    const blob = await response.blob();
    return await blobToDataURL(blob);
  }

  public async updateMindmapImage(imageInfo: MindmapImageInfo, callback?: (response: IWebSocketData) => void) {
    if (!imageInfo.data) {
      imageInfo.data = this.getPlaceholderImageContent(imageInfo.format);
    }
    const blob = dataURLToBlob(imageInfo.data);
    const file = new File([blob], imageInfo.imageURL.split('/').pop(), { type: blob.type });
    const formData = new FormData();
    formData.append("path", 'data/' + imageInfo.imageURL);
    formData.append("file", file);
    formData.append("isDir", "false");
    const resp = await fetchSyncPost("/api/file/putFile", formData);
    if (callback) callback(resp);
  }

  public updateAttrLabel(imageInfo: MindmapImageInfo, blockElement: HTMLElement) {
    if (!imageInfo) return;

    if (this.data[STORAGE_NAME].labelDisplay === "noLabel") return;

    const attrElement = blockElement.querySelector(".protyle-attr") as HTMLDivElement;
    if (attrElement) {
      const pageCount = (base64ToUnicode(imageInfo.data.split(',').pop()).match(/name(?:=&quot;|%3D%22)/g) || []).length;
      const labelHTML = `<span>Mind Map${pageCount > 1 ? `:${pageCount}` : ''}</span>`;
      let labelElement = attrElement.querySelector(".label--embed-mindmap") as HTMLDivElement;
      if (labelElement) {
        labelElement.innerHTML = labelHTML;
      } else {
        labelElement = document.createElement("div");
        labelElement.classList.add("label--embed-mindmap");
        if (this.data[STORAGE_NAME].labelDisplay === "showLabelAlways") {
          labelElement.classList.add("label--embed-mindmap--always");
        }
        labelElement.innerHTML = labelHTML;
        attrElement.prepend(labelElement);
      }
    }
  }

  private openMenuImageHandler({ detail }) {
    const selectedElement = detail.element;
    const imageElement = selectedElement.querySelector("img") as HTMLImageElement;
    if (!imageElement) return;
    const imageURL = imageElement.dataset.src;
    const blockElement = selectedElement.closest("div[data-type='NodeParagraph']") as HTMLElement;
    if (!blockElement) return;

    if (blockElement.getAttribute("custom-mindmap")) {
      const blockID = blockElement.getAttribute("data-node-id");
      this.getMindmapImageInfo(imageURL, true).then((imageInfo: MindmapImageInfo) => {
        if (imageInfo) {
          window.siyuan.menus.menu.addItem({
            id: "edit-mindmap",
            icon: 'iconEdit',
            label: `思维导图编辑`,
            index: 1,
            click: () => {
              if (!this.isMobile && this.data[STORAGE_NAME].editWindow === 'tab') {
                this.openEditTab(imageInfo, blockID);
              } else {
                this.openEditDialog(imageInfo, blockID);
              }
            }
          });
        }
      })
    }
  }

  private getActiveCustomTab(type: string): Custom {
    const allCustoms = getAllModels().custom;
    const activeTabElement = document.querySelector(".layout__wnd--active .item--focus");
    if (activeTabElement) {
      const tabId = activeTabElement.getAttribute("data-id");
      for (const custom of allCustoms as any[]) {
        if (custom.type == this.name + type && custom.tab.headElement?.getAttribute('data-id') == tabId) {
          return custom;
        };
      }
    }
    return null;
  }

  private tabHotKeyEventHandler = (event: KeyboardEvent, custom?: Custom) => {
    // 自定义处理方式的快捷键
    const isFullscreenHotKey = matchHotKey(window.siyuan.config.keymap.editor.general.fullscreen.custom, event);
    const isCloseTabHotKey = matchHotKey(window.siyuan.config.keymap.general.closeTab.custom, event);
    if (isFullscreenHotKey || isCloseTabHotKey) {
      if (!custom) custom = this.getActiveCustomTab(this.EDIT_TAB_TYPE);
      if (custom) {
        event.preventDefault();
        event.stopPropagation();

        if (isFullscreenHotKey) {
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            custom.element.requestFullscreen();
          }
        }
        if (isCloseTabHotKey) {
          custom.tab.close();
        }
      }
    }
  };

  private globalKeyDownHandler = (event: KeyboardEvent) => {
    // 如果是在代码编辑器里使用快捷键，则阻止冒泡 https://github.com/YuxinZhaozyx/siyuan-embed-tikz/issues/1
    if (document.activeElement.closest(".b3-dialog--open .mindmap-edit-dialog")) {
      event.stopPropagation();
    }

    // 快捷键
    this.tabHotKeyEventHandler(event);
  };

  public setupEditTab() {
    const that = this;
    this.addTab({
      type: this.EDIT_TAB_TYPE,
      init() {
        const imageInfo: MindmapImageInfo = this.data;
        const iframeID = unicodeToBase64(`mindmap-edit-tab-${imageInfo.imageURL}`);
        const editTabHTML = `
    <div class="mindmap-edit-tab">
      <iframe src="/plugins/siyuan-plugin-simplemindmap/mind/index.html?iframeID=${iframeID}"></iframe>
    </div>`;
        this.element.innerHTML = editTabHTML;

        const iframe = this.element.querySelector("iframe");
        iframe.focus();

        const postMessage = (message: any) => {
          if (!iframe.contentWindow) return;
          iframe.contentWindow.postMessage(JSON.stringify(message), '*');
        };

        const onInit = async (_message: any) => {
          // Load mind map data from block attributes
          if (imageInfo.blockID) {
              try {
              const resp = await fetchSyncPost('/api/attr/getBlockAttrs', { id: imageInfo.blockID });
              let mindMapData = null;
              if (resp && resp.data && resp.data['custom-mindmap']) {
                try {
                  mindMapData = JSON.parse(resp.data['custom-mindmap']);
                } catch (e) { mindMapData = null; }
              }
              postMessage({
                event: 'init_data',
                mindMapData: mindMapData,
                mindMapConfig: {},
                lang: window.siyuan.config.lang.split('_')[0] || 'zh',
                localConfig: null
              });
            } catch (err) {
              postMessage({
                event: 'init_data',
                mindMapData: null,
                mindMapConfig: {},
                lang: window.siyuan.config.lang.split('_')[0] || 'zh',
                localConfig: null
              });
            }
          } else {
            postMessage({
              event: 'init_data',
              mindMapData: null,
              mindMapConfig: {},
              lang: window.siyuan.config.lang.split('_')[0] || 'zh',
              localConfig: null
            });
          }
        }




        const onSave = async (message: any) => {
          // Save mind map data to block attributes
          try {
            const payload = message.data || null;
            if (imageInfo.blockID && payload) {
              // Disable tab switching during save to prevent SVG dimension errors
              
              try {
                await fetchSyncPost('/api/attr/setBlockAttrs', { 
                  id: imageInfo.blockID, 
                  attrs: { 'custom-mindmap': typeof payload === 'string' ? payload : JSON.stringify(payload) } 
                });
                // After saving data, export image
                postMessage({ action: 'export_image', type: imageInfo.format });
                // Notify iframe that save succeeded, so it can trigger save_success event
                postMessage({ event: 'save_confirmed' });
                // Push a notification to inform user that save succeeded only when it's a manual save (Ctrl+S)
                try {
                  if (message && message.via === 'manual') {
                    await fetchSyncPost('/api/notification/pushMsg', { msg: '保存成功', timeout: 7000 });
                  }
                } catch (e) {
                  console.error('Push notification error:', e);
                }
              } catch (err) {
                console.error('SetBlockAttrs error:', err);
              }
            }
          } catch (err) {
            console.error('Save error:', err);
            // Re-enable tab switching even if save fails
          }
        }

        const onExportSuccess = async (message: any) => {
          // Update image with exported data
          if (!message.data) {
            return;
          }
          imageInfo.data = message.data;
          imageInfo.data = that.fixImageContent(imageInfo.data);
          try {
            await that.updateMindmapImage(imageInfo);
            await fetch(imageInfo.imageURL, { cache: 'reload' });
            document.querySelectorAll(`img[data-src='${imageInfo.imageURL}']`).forEach(imageElement => {
              (imageElement as HTMLImageElement).src = imageInfo.imageURL;
              const blockElement = imageElement.closest("div[data-type='NodeParagraph']") as HTMLElement;
              if (blockElement) {
                that.updateAttrLabel(imageInfo, blockElement);
              }
            });
          } catch (err) {
            console.error('Failed to reload image:', err);
          } finally {
          }
        }

        const onExit = (_message: any) => {
          this.tab.close();
        }

        // 处理块链接悬浮预览
        const onHoverBlockLink = (message: any) => {
          const blockId = message.blockId;
          const x = message.x;
          const y = message.y;
          if (blockId) {
            that.addFloatLayer({
              refDefs: [{ refID: blockId, defIDs: [] }],
              x: x,
              y: y - 70,
              isBacklink: false
            });
          }
        }

        const messageEventHandler = (event) => {
          if (!((event.source.location.href as string).includes(`iframeID=${iframeID}`))) return;
          if (event.data) {
            try {
              const message = JSON.parse(event.data);
              if (!message) return;
              if (message.event == 'request_data') {
                onInit(message);
              }
              else if (message.event == 'app_inited') {
                // Mind map initialized
                console.log('Mind map initialized in tab');
              }
              else if (message.event == 'save') {
                onSave(message);
              }
              else if (message.event == 'export_success') {
                onExportSuccess(message);
              }
              else if (message.event == 'exit') {
                onExit(message);
              }
              else if (message.event == 'hover_block_link') {
                onHoverBlockLink(message);
              }
            }
            catch (err) {
              console.error(err);
            }
          }
        };

        const keydownEventHandleer = (event: KeyboardEvent) => {
          that.tabHotKeyEventHandler(event, this);
        };

        window.addEventListener("message", messageEventHandler);
        iframe.contentWindow.addEventListener("keydown", keydownEventHandleer);
        this.beforeDestroy = () => {
          window.removeEventListener("message", messageEventHandler);
          iframe.contentWindow.removeEventListener("keydown", keydownEventHandleer);
        };
      }
    });
  }

  public openEditTab(imageInfo: MindmapImageInfo, blockID?: string) {
    if (blockID) imageInfo.blockID = blockID;
    openTab({
      app: this.app,
      custom: {
        id: this.name + this.EDIT_TAB_TYPE,
        icon: "iconEdit",
        title: `${imageInfo.imageURL.split('/').pop()}`,
        data: imageInfo,
      }
    })
  }

  public openEditDialog(imageInfo: MindmapImageInfo, blockID?: string) {
    const iframeID = unicodeToBase64(`mindmap-edit-dialog-${imageInfo.imageURL}`);
    if (blockID) imageInfo.blockID = blockID;
    const editDialogHTML = `
  <div class="mindmap-edit-dialog">
    <div class="edit-dialog-header resize__move"></div>
    <div class="edit-dialog-container">
      <div class="edit-dialog-editor">
        <iframe src="/plugins/siyuan-plugin-simplemindmap/mind/index.html?iframeID=${iframeID}"></iframe>
      </div>
      <div class="fn__hr--b"></div>
    </div>
  </div>
    `;

    const dialogDestroyCallbacks = [];

    // 用于在关闭窗口时触发保存
    let triggerSaveOnClose = () => {};

    const dialog = new Dialog({
      content: editDialogHTML,
      width: this.isMobile ? "92vw" : "90vw",
      height: "80vh",
      hideCloseIcon: this.isMobile,
      destroyCallback: () => {
        // 关闭窗口时先触发保存
        triggerSaveOnClose();
        dialogDestroyCallbacks.forEach(callback => callback());
      },
    });

    const iframe = dialog.element.querySelector("iframe");
    iframe.focus();

    const postMessage = (message: any) => {
      if (!iframe.contentWindow) return;
      iframe.contentWindow.postMessage(JSON.stringify(message), '*');
    };

    // 设置关闭时触发保存的回调
    triggerSaveOnClose = () => {
      postMessage({ action: 'save', via: 'close' });
    };

    // 在 simple-mind-map 中，我们通过块属性保存/读取思维导图 JSON
    const onInit = async (_message: any) => {
      // Load mind map data from block attributes
      if (imageInfo.blockID) {
        try {
          const resp = await fetchSyncPost('/api/attr/getBlockAttrs', { id: imageInfo.blockID });
          let mindMapData = null;
          if (resp && resp.data && resp.data['custom-mindmap']) {
            try {
              mindMapData = JSON.parse(resp.data['custom-mindmap']);
            } catch (e) { mindMapData = null; }
          }
          postMessage({
            event: 'init_data',
            mindMapData: mindMapData,
            mindMapConfig: {},
            lang: window.siyuan.config.lang.split('_')[0] || 'zh',
            localConfig: null
          });
        } catch (err) {
          postMessage({
            event: 'init_data',
            mindMapData: null,
            mindMapConfig: {},
            lang: window.siyuan.config.lang.split('_')[0] || 'zh',
            localConfig: null
          });
        }
      } else {
        postMessage({
          event: 'init_data',
          mindMapData: null,
          mindMapConfig: {},
          lang: window.siyuan.config.lang.split('_')[0] || 'zh',
          localConfig: null
        });
      }
    }





    const onSave = async (message: any) => {
      // Save mind map data to block attributes
      try {
        const payload = message.data || null;
        if (imageInfo.blockID && payload) {
          // Disable tab switching during save to prevent SVG dimension errors
          
          try {
            await fetchSyncPost('/api/attr/setBlockAttrs', { 
              id: imageInfo.blockID, 
              attrs: { 'custom-mindmap': typeof payload === 'string' ? payload : JSON.stringify(payload) } 
            });
            // After saving data, export image
            postMessage({ action: 'export_image', type: imageInfo.format });
            // Notify iframe that save succeeded, so it can trigger save_success event
            postMessage({ event: 'save_confirmed' });
            // Push a notification to inform user that save succeeded only when it's a manual save (Ctrl+S)
            try {
              if (message && message.via === 'manual') {
                await fetchSyncPost('/api/notification/pushMsg', { msg: '保存成功', timeout: 7000 });
              }
            } catch (e) {
              console.error('Push notification error:', e);
            }
          } catch (err) {
            console.error('SetBlockAttrs error:', err);
          }
        }
      } catch (err) {
        console.error('Save error:', err);
        // Re-enable tab switching even if save fails
      }
    }

    const onExportSuccess = async (message: any) => {
      // Update image with exported data
      if (!message.data) {
        return;
      }
      imageInfo.data = message.data;
      imageInfo.data = this.fixImageContent(imageInfo.data);
      try {
        await this.updateMindmapImage(imageInfo);
        await fetch(imageInfo.imageURL, { cache: 'reload' });
        document.querySelectorAll(`img[data-src='${imageInfo.imageURL}']`).forEach(imageElement => {
          (imageElement as HTMLImageElement).src = imageInfo.imageURL;
          const blockElement = imageElement.closest("div[data-type='NodeParagraph']") as HTMLElement;
          if (blockElement) {
            this.updateAttrLabel(imageInfo, blockElement);
          }
        });
      } catch (err) {
        console.error('Failed to reload image:', err);
      } finally {
      }
    }

    const onExit = (_message: any) => {
      dialog.destroy();
    }

    // 处理块链接悬浮预览
    const onHoverBlockLink = (message: any) => {
      const blockId = message.blockId;
      const x = message.x;
      const y = message.y;
      if (blockId) {
        this.addFloatLayer({
          refDefs: [{ refID: blockId, defIDs: [] }],
          x: x,
          y: y - 70,
          isBacklink: false
        });
      }
    }

    const messageEventHandler = (event) => {
      if (!((event.source.location.href as string).includes(`iframeID=${iframeID}`))) return;
      if (event.data) {
        try {
          const message = JSON.parse(event.data);
          if (!message) return;
          if (message.event == 'request_data') {
            onInit(message);
          }
          else if (message.event == 'app_inited') {
            // Mind map initialized
            console.log('Mind map initialized in dialog');
          }
          else if (message.event == 'save') {
            onSave(message);
          }
          else if (message.event == 'export_success') {
            onExportSuccess(message);
          }
          else if (message.event == 'exit') {
            onExit(message);
          }
          else if (message.event == 'get_block_setting') {
            // 获取块设置
            this.getBlockSetting(imageInfo.blockID, postMessage);
          }
          else if (message.event == 'save_block_setting') {
            // 保存块设置
            this.saveBlockSetting(imageInfo.blockID, message.settings);
          }
          else if (message.event == 'get_current_doc_id') {
            // 获取当前文档ID
            this.getCurrentDocId(imageInfo.blockID, postMessage);
          }
          else if (message.event == 'hover_block_link') {
            onHoverBlockLink(message);
          }
        }
        catch (err) {
          console.error(err);
        }
      }
    };

    window.addEventListener("message", messageEventHandler);
    dialogDestroyCallbacks.push(() => {
      window.removeEventListener("message", messageEventHandler);
    });
  }


  public reloadAllEditor() {
    getAllEditor().forEach((protyle) => { protyle.reload(false); });
  }

  public removeAllMindmapTab() {
    getAllModels().custom.forEach((custom: any) => {
      if (custom.type == this.name + this.EDIT_TAB_TYPE) {
        custom.tab?.close();
      }
    })
  }


  public fixImageContent(imageDataURL: string) {
    // 解决SVG CSS5的light-dark样式在部分浏览器上无效的问题
    if (imageDataURL.startsWith('data:image/svg+xml')) {
      let base64String = imageDataURL.split(',').pop();
      let svgContent = base64ToUnicode(base64String);
      const regex = /light-dark\s*\(\s*((?:[^(),]|\w+\([^)]*\))+)\s*,\s*(?:[^(),]|\w+\([^)]*\))+\s*\)/gi;
      svgContent = svgContent.replace(regex, '$1');
      base64String = unicodeToBase64(svgContent);
      imageDataURL = `data:image/svg+xml;base64,${base64String}`;
    }
    // 设置PNG DPI
    // if (imageDataURL.startsWith('data:image/png')) {
    //   let binaryArray = base64ToArray(imageDataURL.split(',').pop());
    //   binaryArray = insertPNGpHYs(binaryArray, 96 * 2);
    //   const base64String = arrayToBase64(binaryArray);
    //   imageDataURL = `data:image/png;base64,${base64String}`;
    // }
    // 当图像为空时，使用默认的占位图
    const imageSize = getImageSizeFromBase64(imageDataURL);
    if (imageSize && imageSize.width <= 1 && imageSize.height <= 1) {
      if (imageDataURL.startsWith('data:image/svg+xml;base64,')) {
        let base64String = imageDataURL.split(',').pop();
        let svgContent = base64ToUnicode(base64String);
        const svgElement = HTMLToElement(svgContent);
        if (svgElement) {
          const defaultSvgElement = HTMLToElement(base64ToUnicode(this.getPlaceholderImageContent('svg').split(',').pop()));
          defaultSvgElement.setAttribute('content', svgElement.getAttribute('content'));
          svgContent = defaultSvgElement.outerHTML;
          base64String = unicodeToBase64(svgContent);
          imageDataURL = `data:image/svg+xml;base64,${base64String}`;
        }
      }
      if (imageDataURL.startsWith('data:image/png;base64,')) {
        let binaryArray = base64ToArray(imageDataURL.split(',').pop());
        let defaultBinaryArray = base64ToArray(this.getPlaceholderImageContent('png').split(',').pop());
        const srcLocation = locatePNGtEXt(binaryArray);
        const destLocation = locatePNGtEXt(defaultBinaryArray);
        if (srcLocation && destLocation) {
          binaryArray = replaceSubArray(binaryArray, srcLocation, defaultBinaryArray, destLocation);
          const base64String = arrayToBase64(binaryArray);
          imageDataURL = `data:image/png;base64,${base64String}`;
        }
      }
    }
    return imageDataURL;
  }

  // 获取块设置（笔记转导图功能）
  private async getBlockSetting(blockID: string, postMessage: (message: any) => void) {
    if (!blockID) {
      postMessage({ event: 'block_setting_response', settings: null });
      return;
    }
    try {
      const resp = await fetchSyncPost('/api/attr/getBlockAttrs', { id: blockID });
      let settings = null;
      if (resp && resp.data && resp.data['custom-mindmap-blocksetting']) {
        try {
          settings = JSON.parse(resp.data['custom-mindmap-blocksetting']);
        } catch (e) { settings = null; }
      }
      postMessage({ event: 'block_setting_response', settings: settings });
    } catch (err) {
      console.error('Get block setting error:', err);
      postMessage({ event: 'block_setting_response', settings: null });
    }
  }

  // 保存块设置（笔记转导图功能）
  private async saveBlockSetting(blockID: string, settings: any) {
    if (!blockID || !settings) return;
    try {
      await fetchSyncPost('/api/attr/setBlockAttrs', {
        id: blockID,
        attrs: { 'custom-mindmap-blocksetting': JSON.stringify(settings) }
      });
    } catch (err) {
      console.error('Save block setting error:', err);
    }
  }

  // 获取当前文档ID（笔记转导图功能）
  private async getCurrentDocId(blockID: string, postMessage: (message: any) => void) {
    if (!blockID) {
      postMessage({ event: 'current_doc_id_response', docId: null });
      return;
    }
    try {
      // 通过SQL查询获取块所在的文档ID
      const resp = await fetchSyncPost('/api/query/sql', {
        stmt: `SELECT root_id FROM blocks WHERE id = '${blockID}'`
      });
      if (resp && resp.code === 0 && resp.data && resp.data.length > 0) {
        postMessage({ event: 'current_doc_id_response', docId: resp.data[0].root_id });
      } else {
        postMessage({ event: 'current_doc_id_response', docId: null });
      }
    } catch (err) {
      console.error('Get current doc id error:', err);
      postMessage({ event: 'current_doc_id_response', docId: null });
    }
  }
}
