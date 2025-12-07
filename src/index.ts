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
import { importOutline } from "../mind-map/web/src/utils/noteImport";

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
  private _openMenuDoctreeHandler;
  private _clickEditorTitleIconHandler;

  private settingItems: SettingItem[];
  public EDIT_TAB_TYPE = "mindmap-edit-tab";
  public TEMP_TAB_TYPE = "mindmap-temp-tab";

  async onload() {
    // 添加自定义思维导图图标
    this.addIcons(`<symbol id="iconSimpleMindmap" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M640 138.666667c-53.717333 0-98.986667 36.096-112.896 85.333333H469.333333A160 160 0 0 0 309.333333 384v10.666667H256a117.333333 117.333333 0 1 0 0 234.666666h53.333333V640A160 160 0 0 0 469.333333 800h57.770667a117.376 117.376 0 0 0 112.896 85.333333h128a117.333333 117.333333 0 1 0 0-234.666666h-128c-53.717333 0-98.986667 36.096-112.896 85.333333H469.333333A96 96 0 0 1 373.333333 640v-10.666667H384a117.333333 117.333333 0 1 0 0-234.666666h-10.666667V384A96 96 0 0 1 469.333333 288h57.770667a117.376 117.376 0 0 0 112.896 85.333333h128a117.333333 117.333333 0 1 0 0-234.666666h-128zM586.666667 256c0-29.44 23.893333-53.333333 53.333333-53.333333h128a53.333333 53.333333 0 1 1 0 106.666666h-128c-29.44 0-53.333333-23.893333-53.333333-53.333333z m-384 256c0-29.44 23.893333-53.333333 53.333333-53.333333h128a53.333333 53.333333 0 1 1 0 106.666666H256c-29.44 0-53.333333-23.893333-53.333333-53.333333z m384 256c0-29.44 23.893333-53.333333 53.333333-53.333333h128a53.333333 53.333333 0 1 1 0 106.666666h-128c-29.44 0-53.333333-23.893333-53.333333-53.333333z" fill="currentColor"></path></symbol>`);
    
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

      const action = imgContainer.querySelector('.protyle-action') as HTMLElement;
      if (!action) return;

      // Check if edit button already exists
      if (action.querySelector('.cst-edit-mindmap')) return;

      const imgElement = imgContainer.querySelector('img');
      const imgSrc = imgElement?.getAttribute("data-src");
      const blockID = blockElement.getAttribute("data-node-id");

      // Create edit button element
      const editBtnElement = HTMLToElement(`<span aria-label="编辑思维导图" data-position="4north" class="ariaLabel protyle-icon cst-edit-mindmap"><svg><use xlink:href="#iconSimpleMindmap"></use></svg></span>`);
      editBtnElement.addEventListener("click", async (event: PointerEvent) => {
        event.preventDefault();
        event.stopPropagation();
        
        if (imgSrc && blockID) {
          this.getMindmapImageInfo(imgSrc, true).then((imageInfo: MindmapImageInfo) => {
            if (imageInfo) {
              if (!this.isMobile && this.data[STORAGE_NAME].editWindow === 'tab') {
                this.openEditTab(imageInfo, blockID);
              } else {
                this.openEditDialog(imageInfo, blockID);
              }
            }
          });
        }
      });

      // Insert button and adjust styles
      action.insertAdjacentElement('afterbegin', editBtnElement);
      
      // Reset all button styles
      for (const child of action.children) {
        child.classList.toggle('protyle-icon--only', false);
        child.classList.toggle('protyle-icon--first', false);
        child.classList.toggle('protyle-icon--last', false);
      }
      
      // Apply appropriate styles based on button count
      if (action.children.length == 1) {
        action.firstElementChild.classList.toggle('protyle-icon--only', true);
      } else if (action.children.length > 1) {
        action.firstElementChild.classList.toggle('protyle-icon--first', true);
        action.lastElementChild.classList.toggle('protyle-icon--last', true);
      }
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

    this._openMenuDoctreeHandler = this.openMenuDoctreeHandler.bind(this);
    this.eventBus.on("open-menu-doctree", this._openMenuDoctreeHandler);

    this._clickEditorTitleIconHandler = this.handleDocumentMenu.bind(this);
    this.eventBus.on('click-editortitleicon', this._clickEditorTitleIconHandler);

    this._globalKeyDownHandler = this.globalKeyDownHandler.bind(this);
    document.documentElement.addEventListener("keydown", this._globalKeyDownHandler);

    this.reloadAllEditor();
  }

  onunload() {
    if (this._mutationObserver) this._mutationObserver.disconnect();
    if (this._openMenuImageHandler) this.eventBus.off("open-menu-image", this._openMenuImageHandler);
    if (this._openMenuDoctreeHandler) this.eventBus.off("open-menu-doctree", this._openMenuDoctreeHandler);
    if (this._clickEditorTitleIconHandler) this.eventBus.off('click-editortitleicon', this._clickEditorTitleIconHandler);
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
      this.data[STORAGE_NAME].defaultRainbowLines = (dialog.element.querySelector("[data-type='defaultRainbowLines']") as HTMLInputElement).value;
      
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

  // 彩虹线条配置列表
  private readonly RAINBOW_LINES_OPTIONS = [
    { value: 'none', name: '无', list: null },
    {
      value: 'colors1',
      name: '彩虹1',
      list: [
        'rgb(255, 213, 73)',
        'rgb(255, 136, 126)',
        'rgb(107, 225, 141)',
        'rgb(151, 171, 255)',
        'rgb(129, 220, 242)',
        'rgb(255, 163, 125)',
        'rgb(152, 132, 234)'
      ]
    },
    {
      value: 'colors2',
      name: '彩虹2',
      list: [
        'rgb(248, 93, 93)',
        'rgb(255, 151, 84)',
        'rgb(255, 214, 69)',
        'rgb(73, 205, 140)',
        'rgb(64, 192, 255)',
        'rgb(84, 110, 214)',
        'rgb(164, 93, 220)'
      ]
    },
    {
      value: 'colors3',
      name: '彩虹3',
      list: [
        'rgb(140, 240, 231)',
        'rgb(74, 210, 255)',
        'rgb(65, 168, 243)',
        'rgb(49, 128, 205)',
        'rgb(188, 226, 132)',
        'rgb(113, 215, 123)',
        'rgb(120, 191, 109)'
      ]
    },
    {
      value: 'colors4',
      name: '彩虹4',
      list: [
        'rgb(169, 98, 99)',
        'rgb(245, 125, 123)',
        'rgb(254, 183, 168)',
        'rgb(251, 218, 171)',
        'rgb(138, 163, 181)',
        'rgb(131, 127, 161)',
        'rgb(84, 83, 140)'
      ]
    },
    {
      value: 'colors5',
      name: '彩虹5',
      list: [
        'rgb(255, 229, 142)',
        'rgb(254, 158, 41)',
        'rgb(248, 119, 44)',
        'rgb(232, 82, 80)',
        'rgb(182, 66, 98)',
        'rgb(99, 54, 99)',
        'rgb(65, 40, 82)'
      ]
    },
    {
      value: 'colors6',
      name: '彩虹6',
      list: [
        'rgb(171, 227, 209)',
        'rgb(107, 201, 196)',
        'rgb(55, 170, 169)',
        'rgb(18, 135, 131)',
        'rgb(74, 139, 166)',
        'rgb(75, 105, 150)',
        'rgb(57, 75, 133)'
      ]
    }
  ];

  private async initSetting() {
    await this.loadData(STORAGE_NAME);
    if (!this.data[STORAGE_NAME]) this.data[STORAGE_NAME] = {};
    if (typeof this.data[STORAGE_NAME].labelDisplay === 'undefined') this.data[STORAGE_NAME].labelDisplay = "showLabelAlways";
    if (typeof this.data[STORAGE_NAME].embedImageFormat === 'undefined') this.data[STORAGE_NAME].embedImageFormat = "png";
    if (typeof this.data[STORAGE_NAME].editWindow === 'undefined') this.data[STORAGE_NAME].editWindow = 'dialog';
    if (typeof this.data[STORAGE_NAME].defaultTheme === 'undefined') this.data[STORAGE_NAME].defaultTheme = 'lemonBubbles';
    if (typeof this.data[STORAGE_NAME].themeConfig === 'undefined') this.data[STORAGE_NAME].themeConfig = JSON.stringify(this.DEFAULT_THEME_CONFIG, null, 2);
    if (typeof this.data[STORAGE_NAME].defaultRainbowLines === 'undefined') this.data[STORAGE_NAME].defaultRainbowLines = 'none';

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
      },
      {
        title: this.i18n.defaultRainbowLines || '默认彩虹线条',
        direction: "row",
        description: this.i18n.defaultRainbowLinesDescription || '新建思维导图时默认使用的彩虹线条样式',
        createActionElement: () => {
          const container = document.createElement('div');
          container.className = 'rainbow-lines-selector';
          container.style.cssText = 'display: flex; flex-direction: column; gap: 8px; width: 100%;';
          
          this.RAINBOW_LINES_OPTIONS.forEach(option => {
            const isSelected = option.value === this.data[STORAGE_NAME].defaultRainbowLines;
            const optionEl = document.createElement('div');
            optionEl.className = 'rainbow-option' + (isSelected ? ' selected' : '');
            optionEl.dataset.value = option.value;
            optionEl.style.cssText = `
              display: flex;
              align-items: center;
              padding: 6px 10px;
              border-radius: 4px;
              cursor: pointer;
              border: 2px solid ${isSelected ? 'var(--b3-theme-primary)' : 'transparent'};
              background: var(--b3-theme-surface);
              transition: all 0.2s;
            `;
            
            if (option.list) {
              // 有颜色列表，显示颜色条
              const colorsBar = document.createElement('div');
              colorsBar.className = 'colors-bar';
              colorsBar.style.cssText = 'display: flex; width: 100%; height: 20px; border-radius: 3px; overflow: hidden;';
              option.list.forEach(color => {
                const colorItem = document.createElement('span');
                colorItem.style.cssText = `flex: 1; background-color: ${color};`;
                colorsBar.appendChild(colorItem);
              });
              optionEl.appendChild(colorsBar);
            } else {
              // 无颜色列表，显示文字
              const textSpan = document.createElement('span');
              textSpan.textContent = option.name;
              textSpan.style.cssText = 'color: var(--b3-theme-on-surface);';
              optionEl.appendChild(textSpan);
            }
            
            optionEl.addEventListener('click', () => {
              // 移除其他选中状态
              container.querySelectorAll('.rainbow-option').forEach(el => {
                (el as HTMLElement).classList.remove('selected');
                (el as HTMLElement).style.borderColor = 'transparent';
              });
              // 设置当前选中
              optionEl.classList.add('selected');
              optionEl.style.borderColor = 'var(--b3-theme-primary)';
              // 更新隐藏的 input 值
              hiddenInput.value = option.value;
            });
            
            optionEl.addEventListener('mouseenter', () => {
              if (!optionEl.classList.contains('selected')) {
                optionEl.style.borderColor = 'var(--b3-theme-primary-light)';
              }
            });
            
            optionEl.addEventListener('mouseleave', () => {
              if (!optionEl.classList.contains('selected')) {
                optionEl.style.borderColor = 'transparent';
              }
            });
            
            container.appendChild(optionEl);
          });
          
          // 隐藏的 input 用于保存值
          const hiddenInput = document.createElement('input');
          hiddenInput.type = 'hidden';
          hiddenInput.setAttribute('data-type', 'defaultRainbowLines');
          hiddenInput.value = this.data[STORAGE_NAME].defaultRainbowLines || 'none';
          container.appendChild(hiddenInput);
          
          return container;
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
    const defaultRainbowLines = this.data[STORAGE_NAME].defaultRainbowLines || 'none';
    
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

    // 获取彩虹线条配置
    let rainbowLinesConfig: { open: boolean; colorsList?: string[] } = { open: false };
    if (defaultRainbowLines !== 'none') {
      const rainbowOption = this.RAINBOW_LINES_OPTIONS.find(opt => opt.value === defaultRainbowLines);
      if (rainbowOption && rainbowOption.list) {
        rainbowLinesConfig = {
          open: true,
          colorsList: rainbowOption.list
        };
      }
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
        smmVersion: "0.14.0-fix.1",
        layout: 'logicalStructure',
        config: {},
        view: null
      };

      // 初始化配置（彩虹线条等）
      const initialConfig = {
        rainbowLinesConfig: rainbowLinesConfig
      };
      console.log('Initial mindmap config:', initialConfig);
      try {
        await fetchSyncPost('/api/attr/setBlockAttrs', { 
          id: blockID, 
          attrs: { 
            'custom-mindmap': JSON.stringify(initial),
            'custom-mindmap-setting': JSON.stringify(initialConfig)
          } 
        });
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
            icon: 'iconSimpleMindmap',
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

  private openMenuDoctreeHandler({ detail }) {
    const elements = detail.elements;
    if (elements.length !== 1) return;

    const element = elements[0];
    const isNotebook = element.getAttribute("data-type") === "navigation-root";
    const countAttr = parseInt(element.getAttribute("data-count") || '0');
    const isParentDoc = !isNotebook && countAttr > 0;
    const isDoc = !isNotebook;

    // 如果既不是笔记本也不是父文档也不是文档，则不显示菜单
    if (!isNotebook  && !isDoc) return;

    // 笔记本或父文档：子文档转导图
    if (isNotebook || isParentDoc) {
      detail.menu.addItem({
        icon: "iconSimpleMindmap",
        label: this.i18n.docTreeToMindmap || "子文档转导图",
        click: () => {
          this.showDocTreeMindmap(element, isNotebook);
        }
      });
    }

    // 任何文档（包含父文档与叶子文档）均支持文档大纲转导图
    if (!isNotebook) {
      detail.menu.addItem({
        icon: "iconSimpleMindmap",
        label: this.i18n.docOutlineToMindmap || "思绪：文档大纲转导图",
        click: () => {
          const docId = element.getAttribute('data-node-id');
          console.log('Show doc outline mindmap for docId:', docId);
          this.showDocOutlineMindmap(docId);
        }
      });
    }
  }

  private async showDocTreeMindmap(element: HTMLElement, isNotebook: boolean) {
    // 显示加载提示
    const loadingDialog = new Dialog({
      title: this.i18n.docTreeToMindmap || "子文档转导图",
      content: `<div class="b3-dialog__content" style="text-align: center; padding: 40px;">
        <div class="fn__loading"><svg class="fn__rotate"><use xlink:href="#iconLoading"></use></svg></div>
        <div style="margin-top: 16px;">正在生成思维导图...</div>
      </div>`,
      width: "400px",
    });

    try {
      let notebookId: string;
      let startPath: string;
      let rootName: string;

      if (isNotebook) {
        notebookId = element.parentElement.getAttribute("data-url");
        startPath = "/";
        rootName = element.querySelector(".b3-list-item__text").textContent;
      } else {
        const docId = element.getAttribute("data-node-id");
        // 获取文档信息
        const blockRes = await fetchSyncPost('/api/query/sql', {
          stmt: `SELECT box, path, content FROM blocks WHERE id = '${docId}'`
        });

        if (!blockRes || blockRes.code !== 0 || !blockRes.data || blockRes.data.length === 0) {
          throw new Error("无法获取文档信息");
        }

        const blockInfo = blockRes.data[0];
        notebookId = blockInfo.box;
        startPath = blockInfo.path.replace(/\.sy$/, '');
        rootName = blockInfo.content;
      }

      // 获取排序模式
      let sortMode = 15;
      try {
        const confRes = await fetchSyncPost('/api/notebook/getNotebookConf', {
          notebook: notebookId
        });
        if (confRes && confRes.code === 0 && confRes.data && confRes.data.conf) {
          sortMode = confRes.data.conf.sortMode;
          if (sortMode === 15) {
            sortMode = (window as any)?.siyuan?.config?.fileTree?.sort || 15;
          }
        }
      } catch (e) {
        console.warn('获取排序模式失败，使用默认值', e);
      }

      // 生成思维导图数据
      const rootDocId = isNotebook ? null : element.getAttribute("data-node-id");
      const mindmapData = await this.generateDocTreeMindmap(notebookId, startPath, 0, sortMode, rootName, rootDocId);

      // 准备块设置信息
      const blockSettings = {
        blockId: isNotebook ? notebookId : element.getAttribute("data-node-id"),
        importType: 'docTree',
        autoNumber: false,
        maxLevel: 0,
        autoRefresh: false,
        // 额外保存用于刷新的信息
        isNotebook: isNotebook,
        notebookId: notebookId,
        startPath: startPath,
        rootName: rootName
      };

      // 关闭加载对话框
      loadingDialog.destroy();

      // 根据设置选择打开方式
      if (!this.isMobile && this.data[STORAGE_NAME].editWindow === 'tab') {
        this.openTempMindmapTab(mindmapData, rootName, blockSettings);
      } else {
        this.openTempMindmapDialog(mindmapData, blockSettings);
      }

    } catch (error) {
      console.error('生成文档树思维导图失败:', error);
      loadingDialog.destroy();
      
      new Dialog({
        title: "错误",
        content: `<div class="b3-dialog__content">${error.message || '生成失败'}</div>`,
        width: "400px",
      });
    }
  }

  // 为文档块标（标题图标）添加菜单项（文档大纲转导图）
  private handleDocumentMenu({ detail }) {
    try {
      const menu = detail?.menu;
      if (!menu) return;

      // 仅使用 detail.protyle.block.rootID 作为文档 ID
      let docId = null;
      try {
        docId = detail.protyle.block.rootID;
      } catch (e) { /* ignore */ }

      // 添加菜单项
      menu.addItem({
        icon: 'iconSimpleMindmap',
        label: this.i18n.docTreeToMindmap || '子文档转导图',
        click: () => {
          const idToUse = docId;
          if (idToUse) {
            this.showDocTreeMindmapByDocId(idToUse);
          } else {
            new Dialog({ title: '错误', content: `<div class="b3-dialog__content">无法获取到文档 ID</div>`, width: '360px' });
          }
        }
      });

      // 文档大纲转导图
      menu.addItem({
        icon: 'iconSimpleMindmap',
        label: this.i18n.docOutlineToMindmap || '思绪：文档大纲转导图',
        click: () => {
          const idToUse = docId;
          if (idToUse) {
            this.showDocOutlineMindmap(idToUse);
          } else {
            new Dialog({ title: '错误', content: `<div class="b3-dialog__content">无法获取到文档 ID</div>`, width: '360px' });
          }
        }
      });
    } catch (err) {
      console.error('handleDocumentMenu error:', err);
    }
  }

  // 通过文档 id 打开文档树转导图（用于文档标题菜单）
  private async showDocTreeMindmapByDocId(docId: string) {
    const loadingDialog = new Dialog({
      title: this.i18n.docTreeToMindmap || "子文档转导图",
      content: `<div class="b3-dialog__content" style="text-align: center; padding: 40px;">
        <div class="fn__loading"><svg class="fn__rotate"><use xlink:href="#iconLoading"></use></svg></div>
        <div style="margin-top: 16px;">正在生成思维导图...</div>
      </div>`,
      width: "400px",
    });

    try {
      if (!docId) throw new Error('无法获取文档 ID');

      // 获取文档信息以确定所在笔记本和路径
      const blockRes = await fetchSyncPost('/api/query/sql', {
        stmt: `SELECT box, path, content FROM blocks WHERE id = '${docId}'`
      });

      if (!blockRes || blockRes.code !== 0 || !blockRes.data || blockRes.data.length === 0) {
        throw new Error('无法获取文档信息');
      }

      const blockInfo = blockRes.data[0];
      const notebookId = blockInfo.box;
      const startPath = (blockInfo.path || '').replace(/\.sy$/, '');
      const rootName = blockInfo.content || '文档';

      // 获取排序模式
      let sortMode = 15;
      try {
        const confRes = await fetchSyncPost('/api/notebook/getNotebookConf', { notebook: notebookId });
        if (confRes && confRes.code === 0 && confRes.data && confRes.data.conf) {
          sortMode = confRes.data.conf.sortMode;
          if (sortMode === 15) {
            sortMode = (window as any)?.siyuan?.config?.fileTree?.sort || 15;
          }
        }
      } catch (e) {
        console.warn('获取排序模式失败，使用默认值', e);
      }

      // 生成思维导图数据
      const mindmapData = await this.generateDocTreeMindmap(notebookId, startPath, 0, sortMode, rootName, docId);

      const blockSettings = {
        blockId: docId,
        importType: 'docTree',
        autoNumber: false,
        maxLevel: 0,
        autoRefresh: false,
        isNotebook: false,
        notebookId: notebookId,
        startPath: startPath,
        rootName: rootName
      };

      loadingDialog.destroy();

      if (!this.isMobile && this.data[STORAGE_NAME].editWindow === 'tab') {
        this.openTempMindmapTab(mindmapData, rootName, blockSettings);
      } else {
        this.openTempMindmapDialog(mindmapData, blockSettings);
      }
    } catch (error) {
      console.error('生成文档树思维导图失败:', error);
      loadingDialog.destroy();
      new Dialog({ title: '错误', content: `<div class="b3-dialog__content">${error.message || '生成失败'}</div>`, width: '400px' });
    }
  }

  // 将文档大纲导入为思维导图并展示（单文档大纲）
  // 参数：docId - 文档的 block id
  private async showDocOutlineMindmap(docId: string) {
    const loadingDialog = new Dialog({
      title: this.i18n.docOutlineToMindmap || "文档大纲转导图",
      content: `<div class="b3-dialog__content" style="text-align: center; padding: 40px;">
        <div class="fn__loading"><svg class="fn__rotate"><use xlink:href="#iconLoading"></use></svg></div>
        <div style="margin-top: 16px;">正在生成文档大纲思维导图...</div>
      </div>`,
      width: "400px",
    });

    try {
      if (!docId) throw new Error('无法获取文档 ID');

      // 获取文档基本信息
      const blockRes = await fetchSyncPost('/api/query/sql', {
        stmt: `SELECT box, path, content, name FROM blocks WHERE id = '${docId}'`
      });

      if (!blockRes || blockRes.code !== 0 || !blockRes.data || blockRes.data.length === 0) {
        throw new Error("无法获取文档信息");
      }

      const blockInfo = blockRes.data[0];

      // 使用 noteImport.importOutline 来构建大纲导图数据
      let root: any = null;
      try {
        root = await importOutline(docId, blockInfo, 0);
      } catch (e) {
        throw new Error("无法获取文档大纲内容");
      }

      const plainTitle = (blockInfo.content || blockInfo.name || '文档').replace(/<[^>]+>/g, '').trim();

      const blockSettings = {
        blockId: docId,
        importType: 'outline',
        autoNumber: false,
        maxLevel: 0,
        autoRefresh: false,
        isNotebook: false
      };

      loadingDialog.destroy();

      if (!this.isMobile && this.data[STORAGE_NAME].editWindow === 'tab') {
        this.openTempMindmapTab(root, plainTitle, blockSettings);
      } else {
        this.openTempMindmapDialog(root, blockSettings);
      }

    } catch (error) {
      console.error('生成文档大纲思维导图失败:', error);
      loadingDialog.destroy();
      new Dialog({
        title: "错误",
        content: `<div class="b3-dialog__content">${error.message || '生成失败'}</div>`,
        width: "400px",
      });
    }
  }

  private async generateDocTreeMindmap(notebookId: string, startPath: string, maxLevel: number, sortMode: number, rootName: string, rootDocId?: string) {
    // 递归获取文档树
    const getDocTree = async (currentPath: string, currentLevel: number = 1): Promise<any[]> => {
      if (maxLevel > 0 && currentLevel > maxLevel) return [];

      try {
        const res = await fetchSyncPost('/api/filetree/listDocsByPath', {
          notebook: notebookId,
          path: currentPath,
          sort: sortMode,
          showHidden: false,
          maxListCount: 1000
        });

        if (!res || res.code !== 0 || !res.data || !res.data.files) {
          return [];
        }

        const docPromises = res.data.files.map(async (file) => {
          const node = {
            name: (file.name || '').replace(/\.sy$/i, ''),
            id: file.id,
            path: (file.path || '').replace(/\.sy$/i, ''),
            children: []
          };

          if (file.subFileCount > 0) {
            const childPath = node.path || currentPath;
            node.children = await getDocTree(childPath, currentLevel + 1);
          }
          return node;
        });

        return await Promise.all(docPromises);
      } catch (error) {
        console.error(`处理路径 [${currentPath}] 时发生错误:`, error);
        return [];
      }
    };

    const tree = await getDocTree(startPath);

    // 转换为思维导图格式
    const convert = (nodes: any[], currentLevel: number = 1) => {
      if (!nodes || nodes.length === 0) return [];
      if (maxLevel > 0 && currentLevel > maxLevel) return [];

      return nodes.map((n) => {
        const text = n.name || '文档';
        const url = n.id ? `siyuan://blocks/${n.id}` : '';
        
        // 使用行内链接格式，而不是节点链接
        const node = {
          data: {
            text: url ? `<p><a href="${url}" rel="noopener noreferrer" target="_blank">${text}</a></p>` : text,
            richText: true

          },
          children: []
        };

        if (n.children && n.children.length > 0) {
          node.children = convert(n.children, currentLevel + 1);
        }

        return node;
      });
    };

    // 根节点：如果是文档，添加行内链接；如果是笔记本，使用纯文本
    const root = {
      data: rootDocId ? {
        richText: true,
        text: `<p><a href="siyuan://blocks/${rootDocId}" rel="noopener noreferrer" target="_blank">${rootName || '文档树'}</a></p>`
      } : {
        text: rootName || '文档树'
      },
      children: convert(tree, 1)
    };

    return root;
  }

  private openTempMindmapDialog(mindmapData: any, blockSettings?: any) {
    const iframeId = `mindmap-temp-${Date.now()}`;
    const mindmapURL = this.isBrowser 
      ? `/plugins/${this.name}/mindmap-embed/index.html`
      : `plugins/${this.name}/mindmap-embed/index.html`;
    
    const dialogHTML = `
<div class="b3-dialog__content" style="padding: 0; height: calc(80vh - 100px);">
  <div style="padding: 8px 16px; background: var(--b3-theme-surface); border-bottom: 1px solid var(--b3-border-color); color: var(--b3-theme-on-surface); display: flex; justify-content: space-between; align-items: center;">
    <div>
      <svg style="width: 14px; height: 14px; vertical-align: middle;"><use xlink:href="#iconInfo"></use></svg>
      <span style="margin-left: 4px; font-size: 12px;">${this.i18n.tempMindmapTip || '临时预览模式：可以编辑但不会自动保存，请使用导出功能保存您的修改'}</span>
    </div>
    <button class="b3-button b3-button--outline" id="openInTab" style="padding: 4px 8px; font-size: 12px;">
      <svg style="width: 12px; height: 12px;"><use xlink:href="#iconLayoutTab"></use></svg>
      <span style="margin-left: 4px;">${this.i18n.openInTab || '在标签页中打开'}</span>
    </button>
  </div>
  <iframe 
    id="${iframeId}" 
    src="${mindmapURL}" 
    style="width: 100%; height: calc(100% - 40px); border: none;"
  ></iframe>
</div>
    `;

    const dialog = new Dialog({
      title: this.i18n.docTreeToMindmap || "子文档转导图",
      content: dialogHTML,
      width: this.isMobile ? "92vw" : "90vw",
      height: "80vh",
    });

    // 等待 iframe 加载完成
    const iframe = dialog.element.querySelector(`#${iframeId}`) as HTMLIFrameElement;
    const openInTabBtn = dialog.element.querySelector('#openInTab') as HTMLElement;
    
    // 处理在标签页打开按钮
    if (openInTabBtn) {
      openInTabBtn.addEventListener('click', () => {
        // 从 mindmapData 中获取标题
        const rootName = mindmapData?.data?.text || '子文档转导图';
        dialog.destroy();
        this.openTempMindmapTab(mindmapData, rootName, blockSettings);
      });
    }

    // 监听 iframe 的消息
    const messageHandler = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.event === 'request_data') {
          // iframe 请求数据 - 可编辑但不自动保存
          let themeConfig: any = {};
          try {
            const raw = this.data[STORAGE_NAME] && this.data[STORAGE_NAME].themeConfig;
            if (raw && typeof raw === 'string' && raw.trim()) {
              themeConfig = JSON.parse(raw);
            } else if (raw && typeof raw === 'object') {
              themeConfig = raw;
            } else {
              themeConfig = this.DEFAULT_THEME_CONFIG || {};
            }
          } catch (e) {
            themeConfig = this.DEFAULT_THEME_CONFIG || {};
          }

          // 获取彩虹线条配置
          let rainbowLinesConfig: { open: boolean; colorsList?: string[] } = { open: false };
          const defaultRainbowLines = this.data[STORAGE_NAME].defaultRainbowLines || 'none';
          if (defaultRainbowLines !== 'none') {
            const rainbowOption = this.RAINBOW_LINES_OPTIONS.find(opt => opt.value === defaultRainbowLines);
            if (rainbowOption && rainbowOption.list) {
              rainbowLinesConfig = {
                open: true,
                colorsList: rainbowOption.list
              };
            }
          }

          iframe.contentWindow.postMessage(JSON.stringify({
            event: 'init_data',
            mindMapData: {
              root: mindmapData,
              theme: {
                template: this.data[STORAGE_NAME].defaultTheme || 'lemonBubbles',
                config: themeConfig
              },
              smmVersion: "0.14.0-fix.1",
              layout: 'logicalStructure',
              config: {},
              view: null
            },
            mindMapConfig: {
              rainbowLinesConfig: rainbowLinesConfig
              // 移除 readonly 限制，允许编辑
            },
            lang: window.siyuan.config.lang === 'zh_CN' ? 'zh' : 'en',
            localConfig: null,
            blockSettings: blockSettings // 传递块设置
          }), '*');
        } else if (message.event === 'save') {
          // 拦截保存事件，不执行实际保存，只在控制台提示
        } else if (message.event === 'hover_block_link') {
          // 处理思源链接悬浮预览
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
      } catch (err) {
        // 忽略非 JSON 消息
      }
    };

    window.addEventListener('message', messageHandler);

    // 对话框销毁时移除监听
    const originalDestroy = dialog.destroy.bind(dialog);
    dialog.destroy = () => {
      window.removeEventListener('message', messageHandler);
      originalDestroy();
    };
  }

  private openTempMindmapTab(mindmapData: any, rootName?: string, blockSettings?: any) {
    const title = (rootName || '').replace(/<[^>]*>/g, '') || this.i18n.docTreeToMindmap || "子文档转导图";
    openTab({
      app: this.app,
      custom: {
        icon: "iconSimpleMindmap",
        title: title,
        data: { 
          mindmapData: mindmapData,
          blockSettings: blockSettings // 传递块设置
        },
        id: this.name + this.TEMP_TAB_TYPE
      }
    });
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
      <iframe src="/plugins/siyuan-plugin-simplemindmap/mindmap-embed/index.html?iframeID=${iframeID}"></iframe>
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
              // 从 custom-mindmap-setting 中读取配置（包含彩虹线条、水印等配置）
              let mindMapConfig = {};
              if (resp && resp.data && resp.data['custom-mindmap-setting']) {
                try {
                  mindMapConfig = JSON.parse(resp.data['custom-mindmap-setting']);
                } catch (e) { mindMapConfig = {}; }
              }
              postMessage({
                event: 'init_data',
                mindMapData: mindMapData,
                mindMapConfig: mindMapConfig,
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

        const onSaveConfig = async (message: any) => {
          // 保存思维导图配置（如彩虹线条、水印等配置）到块属性的 custom-mindmap-setting 中
          try {
            const config = message.config || null;
            if (imageInfo.blockID && config) {
              // 直接保存配置到 custom-mindmap-setting
              await fetchSyncPost('/api/attr/setBlockAttrs', { 
                id: imageInfo.blockID, 
                attrs: { 'custom-mindmap-setting': JSON.stringify(config) } 
              });
            }
          } catch (err) {
            console.error('Save config error:', err);
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
              else if (message.event == 'get_block_setting') {
                // 获取块设置
                that.getBlockSetting(imageInfo.blockID, postMessage);
              }
              else if (message.event == 'save_block_setting') {
                // 保存块设置
                that.saveBlockSetting(imageInfo.blockID, message.settings);
              }
              else if (message.event == 'get_current_doc_id') {
                // 获取当前文档ID
                that.getCurrentDocId(imageInfo.blockID, postMessage);
              }
              else if (message.event == 'get_current_image_url') {
                // 获取当前思维导图的图片URL
                postMessage({ event: 'current_image_url_response', imageUrl: imageInfo.imageURL });
              }
              else if (message.event == 'hover_block_link') {
                onHoverBlockLink(message);
              }
              else if (message.event == 'save_config') {
                // 保存思维导图配置（彩虹线条等）到块属性
                onSaveConfig(message);
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

    // 添加临时思维导图标签页类型
    this.addTab({
      type: this.TEMP_TAB_TYPE,
      init() {
        const { mindmapData, blockSettings } = this.data;
        const iframeID = `mindmap-temp-tab-${Date.now()}`;
        const mindmapURL = that.isBrowser 
          ? `/plugins/${that.name}/mindmap-embed/index.html`
          : `plugins/${that.name}/mindmap-embed/index.html`;
        
        const editTabHTML = `
    <div class="mindmap-edit-tab">
      <div style="padding: 8px 16px; background: var(--b3-theme-surface); border-bottom: 1px solid var(--b3-border-color); color: var(--b3-theme-on-surface);">
        <svg style="width: 14px; height: 14px; vertical-align: middle;"><use xlink:href="#iconInfo"></use></svg>
        <span style="margin-left: 4px; font-size: 12px;">${that.i18n.tempMindmapTip || '临时预览模式：可以编辑但不会自动保存，请使用导出功能保存您的修改'}</span>
      </div>
      <iframe id="${iframeID}" src="${mindmapURL}" style="width: 100%; height: calc(100% - 40px); border: none;"></iframe>
    </div>`;
        this.element.innerHTML = editTabHTML;

        const iframe = this.element.querySelector("iframe") as HTMLIFrameElement;
        iframe.focus();

        const postMessage = (message: any) => {
          if (!iframe.contentWindow) return;
          iframe.contentWindow.postMessage(JSON.stringify(message), '*');
        };

        const messageEventHandler = (event: MessageEvent) => {
          try {
            const message = JSON.parse(event.data);
            if (!message) return;
            
            if (message.event === 'request_data') {
              let themeConfig: any = {};
              try {
                const raw = that.data[STORAGE_NAME] && that.data[STORAGE_NAME].themeConfig;
                if (raw && typeof raw === 'string' && raw.trim()) {
                  themeConfig = JSON.parse(raw);
                } else if (raw && typeof raw === 'object') {
                  themeConfig = raw;
                } else {
                  themeConfig = that.DEFAULT_THEME_CONFIG || {};
                }
              } catch (e) {
                themeConfig = that.DEFAULT_THEME_CONFIG || {};
              }

              // 获取彩虹线条配置
              let rainbowLinesConfig: { open: boolean; colorsList?: string[] } = { open: false };
              const defaultRainbowLines = that.data[STORAGE_NAME].defaultRainbowLines || 'none';
              if (defaultRainbowLines !== 'none') {
                const rainbowOption = that.RAINBOW_LINES_OPTIONS.find(opt => opt.value === defaultRainbowLines);
                if (rainbowOption && rainbowOption.list) {
                  rainbowLinesConfig = {
                    open: true,
                    colorsList: rainbowOption.list
                  };
                }
              }

              postMessage({
                event: 'init_data',
                mindMapData: {
                  root: mindmapData,
                  theme: {
                    template: that.data[STORAGE_NAME].defaultTheme || 'lemonBubbles',
                    config: themeConfig
                  },
                  smmVersion: "0.14.0-fix.1",
                  layout: 'logicalStructure',
                  config: {},
                  view: null
                },
                mindMapConfig: {
                  rainbowLinesConfig: rainbowLinesConfig
                  // 可编辑但不自动保存
                },
                lang: window.siyuan.config.lang === 'zh_CN' ? 'zh' : 'en',
                localConfig: null,
                blockSettings: blockSettings // 传递块设置
              });
            } else if (message.event === 'save') {
              // 拦截保存事件
            } else if (message.event === 'hover_block_link') {
              // 处理思源链接悬浮预览
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
          } catch (err) {
            // 忽略非 JSON 消息
          }
        };

        const keydownEventHandler = (event: KeyboardEvent) => {
          that.tabHotKeyEventHandler(event, this);
        };

        window.addEventListener("message", messageEventHandler);
        iframe.contentWindow.addEventListener("keydown", keydownEventHandler);
        this.beforeDestroy = () => {
          window.removeEventListener("message", messageEventHandler);
          iframe.contentWindow.removeEventListener("keydown", keydownEventHandler);
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
        icon: "iconSimpleMindmap",
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
    <div class="edit-dialog-header resize__move">
      ${!this.isMobile ? `<button class="b3-button b3-button--outline fn__size200 open-in-tab-btn" style="position: absolute; right: 50px; top: 2px; padding: 2px 8px; font-size: 12px;">
        <svg class="b3-button__icon"><use xlink:href="#iconLayoutRight"></use></svg>
        <span>${this.i18n.openInTab || '在标签页中打开'}</span>
      </button>` : ''}
    </div>
    <div class="edit-dialog-container">
      <div class="edit-dialog-editor">
        <iframe src="/plugins/siyuan-plugin-simplemindmap/mindmap-embed/index.html?iframeID=${iframeID}"></iframe>
      </div>
      <div class="fn__hr--b"></div>
    </div>
  </div>
    `;

    const dialogDestroyCallbacks = [];

    // 用于在关闭窗口时触发保存
    let triggerSaveOnClose = () => {};
    // 标记是否通过"在标签页中打开"按钮关闭
    let openingInTab = false;

    const dialog = new Dialog({
      content: editDialogHTML,
      width: this.isMobile ? "92vw" : "90vw",
      height: "80vh",
      hideCloseIcon: this.isMobile,
      destroyCallback: () => {
        // 如果是通过"在标签页中打开"按钮关闭，不触发保存（会在 Tab 中继续编辑）
        if (!openingInTab) {
          triggerSaveOnClose();
        }
        dialogDestroyCallbacks.forEach(callback => callback());
      },
    });

    // 绑定"在标签页中打开"按钮事件
    const openInTabBtn = dialog.element.querySelector(".open-in-tab-btn");
    if (openInTabBtn) {
      openInTabBtn.addEventListener("click", () => {
        openingInTab = true;
        dialog.destroy();
        this.openEditTab(imageInfo, blockID);
      });
    }

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
          // 从 custom-mindmap-setting 中读取配置（包含彩虹线条、水印等配置）
          let mindMapConfig = {};
          if (resp && resp.data && resp.data['custom-mindmap-setting']) {
            try {
              mindMapConfig = JSON.parse(resp.data['custom-mindmap-setting']);
            } catch (e) { mindMapConfig = {}; }
          }
          postMessage({
            event: 'init_data',
            mindMapData: mindMapData,
            mindMapConfig: mindMapConfig,
            lang: window.siyuan.config.lang.split('_')[0] || 'zh',
            localConfig: null,
            imageUrl: imageInfo.imageURL
          });
        } catch (err) {
          postMessage({
            event: 'init_data',
            mindMapData: null,
            mindMapConfig: {},
            lang: window.siyuan.config.lang.split('_')[0] || 'zh',
            localConfig: null,
            imageUrl: imageInfo.imageURL
          });
        }
      } else {
        postMessage({
          event: 'init_data',
          mindMapData: null,
          mindMapConfig: {},
          lang: window.siyuan.config.lang.split('_')[0] || 'zh',
          localConfig: null,
          imageUrl: imageInfo.imageURL
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

    const onSaveConfig = async (message: any) => {
      // 保存思维导图配置（如彩虹线条、水印等配置）到块属性的 custom-mindmap-setting 中
      try {
        const config = message.config || null;
        if (imageInfo.blockID && config) {
          // 直接保存配置到 custom-mindmap-setting
          await fetchSyncPost('/api/attr/setBlockAttrs', { 
            id: imageInfo.blockID, 
            attrs: { 'custom-mindmap-setting': JSON.stringify(config) } 
          });
        }
      } catch (err) {
        console.error('Save config error:', err);
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
          else if (message.event == 'get_current_image_url') {
            // 获取当前思维导图的图片URL
            postMessage({ event: 'current_image_url_response', imageUrl: imageInfo.imageURL });
          }
          else if (message.event == 'hover_block_link') {
            onHoverBlockLink(message);
          }
          else if (message.event == 'save_config') {
            // 保存思维导图配置（彩虹线条等）到块属性
            onSaveConfig(message);
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
