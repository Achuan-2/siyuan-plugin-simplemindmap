import {
  Dialog,
  Plugin,
  getFrontend,
  fetchPost,
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

    this.setupEditTab();

    this.protyleSlash = [{
      filter: ["mindmap", "simple-mind-map", "simple-mindmap"],
      id: "mindmap",
      html: `<div class="b3-list-item__first"><svg class="b3-list-item__graphic"><use xlink:href="#iconImage"></use></svg><span class="b3-list-item__text">Mind Map</span></div>`,
      callback: (protyle, nodeElement) => {
        this.newMindmapImage(nodeElement.dataset.nodeId, (imageInfo) => {
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
      this.data[STORAGE_NAME].fullscreenEdit = (dialog.element.querySelector("[data-type='fullscreenEdit']") as HTMLInputElement).checked;
      this.data[STORAGE_NAME].editWindow = (dialog.element.querySelector("[data-type='editWindow']") as HTMLSelectElement).value;
      this.data[STORAGE_NAME].themeMode = (dialog.element.querySelector("[data-type='themeMode']") as HTMLSelectElement).value;
      this.saveData(STORAGE_NAME, this.data[STORAGE_NAME]);
      this.reloadAllEditor();
      this.removeAllMindmapTab();
      dialog.destroy();
    });
  }

  private async initSetting() {
    await this.loadData(STORAGE_NAME);
    if (!this.data[STORAGE_NAME]) this.data[STORAGE_NAME] = {};
    if (typeof this.data[STORAGE_NAME].labelDisplay === 'undefined') this.data[STORAGE_NAME].labelDisplay = "showLabelOnHover";
    if (typeof this.data[STORAGE_NAME].embedImageFormat === 'undefined') this.data[STORAGE_NAME].embedImageFormat = "svg";
    if (typeof this.data[STORAGE_NAME].fullscreenEdit === 'undefined') this.data[STORAGE_NAME].fullscreenEdit = false;
    if (typeof this.data[STORAGE_NAME].editWindow === 'undefined') this.data[STORAGE_NAME].editWindow = 'dialog';
    if (typeof this.data[STORAGE_NAME].themeMode === 'undefined') this.data[STORAGE_NAME].themeMode = "themeLight";

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
        title: this.i18n.fullscreenEdit,
        direction: "column",
        description: this.i18n.fullscreenEditDescription,
        createActionElement: () => {
          const element = HTMLToElement(`<input type="checkbox" class="b3-switch fn__flex-center" data-type="fullscreenEdit">`) as HTMLInputElement;
          element.checked = this.data[STORAGE_NAME].fullscreenEdit;
          return element;
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
        title: this.i18n.themeMode,
        direction: "column",
        description: this.i18n.themeModeDescription,
        createActionElement: () => {
          const options = ["themeLight", "themeDark", "themeOS"];
          const optionsHTML = options.map(option => {
            const isSelected = String(option) === String(this.data[STORAGE_NAME].themeMode);
            return `<option value="${option}"${isSelected ? " selected" : ""}>${window.siyuan.languages[option]}</option>`;
          }).join("");
          return HTMLToElement(`<select class="b3-select fn__flex-center" data-type="themeMode">${optionsHTML}</select>`);
        },
      },
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
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="270" height="183"><rect width="100%" height="100%" fill="#ffffff"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="16" fill="#888">MindMap</text></svg>`;
    const base64 = btoa(unescape(encodeURIComponent(svg)));
    if (format === 'svg') return `data:image/svg+xml;base64,${base64}`;
    // Fallback: return svg data URL even for png to ensure a valid data URL is returned
    return `data:image/svg+xml;base64,${base64}`;
  }



  public newMindmapImage(blockID: string, callback?: (imageInfo: MindmapImageInfo) => void) {
    const format = this.data[STORAGE_NAME].embedImageFormat;
    const imageName = `mindmap-image-${window.Lute.NewNodeID()}.${format}`;
    const placeholderImageContent = this.getPlaceholderImageContent(format);
    const blob = dataURLToBlob(placeholderImageContent);
    const file = new File([blob], imageName, { type: blob.type });
    const formData = new FormData();
    formData.append('path', `data/assets/${imageName}`);
    formData.append('file', file);
    formData.append('isDir', 'false');
    fetchPost('/api/file/putFile', formData, () => {
      const imageURL = `assets/${imageName}`;
      fetchPost('/api/block/updateBlock', {
        id: blockID,
        data: `![](${imageURL})`,
        dataType: "markdown",
      });
      // 初始化空思维导图到块属性
      const initial = {
        root: { data: { text: "根节点" }, children: [] },
        theme: null,
        layout: null,
        config: {},
        view: {}
      };
      try {
        fetchPost('/api/attr/setBlockAttrs', { id: blockID, attrs: { 'custom-mindmap': JSON.stringify(initial) } }, () => { });
      } catch (err) { }

      const imageInfo: MindmapImageInfo = {
        imageURL: imageURL,
        data: placeholderImageContent,
        format: format,
      };
      if (callback) {
        callback(imageInfo);
      }
    });
  }

  public async getMindmapImage(imageURL: string, reload: boolean): Promise<string> {
    const response = await fetch(imageURL, { cache: reload ? 'reload' : 'default' });
    if (!response.ok) return "";
    const blob = await response.blob();
    return await blobToDataURL(blob);
  }

  public updateMindmapImage(imageInfo: MindmapImageInfo, callback?: (response: IWebSocketData) => void) {
    if (!imageInfo.data) {
      imageInfo.data = this.getPlaceholderImageContent(imageInfo.format);
    }
    const blob = dataURLToBlob(imageInfo.data);
    const file = new File([blob], imageInfo.imageURL.split('/').pop(), { type: blob.type });
    const formData = new FormData();
    formData.append("path", 'data/' + imageInfo.imageURL);
    formData.append("file", file);
    formData.append("isDir", "false");
    fetchPost("/api/file/putFile", formData, callback);
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
            label: `Edit Mind Map`,
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
      <iframe src="/plugins/siyuan-embed-mindmap/mind/index.html?iframeID=${iframeID}"></iframe>
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
              fetchPost('/api/attr/getBlockAttrs', { id: imageInfo.blockID }, (resp) => {
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

        const disableTabSwitching = () => {
          const tabHeaders = document.querySelectorAll('.layout-tab-bar li[data-type="tab-header"]');
          tabHeaders.forEach((header: HTMLElement) => {
            header.style.pointerEvents = 'none';
            header.style.opacity = '0.6';
          });
        };

        const enableTabSwitching = () => {
          const tabHeaders = document.querySelectorAll('.layout-tab-bar li[data-type="tab-header"]');
          tabHeaders.forEach((header: HTMLElement) => {
            header.style.pointerEvents = '';
            header.style.opacity = '';
          });
        };

        const onSave = (message: any) => {
          // Save mind map data to block attributes
          try {
            const payload = message.data || null;
            if (imageInfo.blockID && payload) {
              // Disable tab switching during save to prevent SVG dimension errors
              disableTabSwitching();
              
              fetchPost('/api/attr/setBlockAttrs', { 
                id: imageInfo.blockID, 
                attrs: { 'custom-mindmap': typeof payload === 'string' ? payload : JSON.stringify(payload) } 
              }, (_resp) => {
                // After saving data, export image
                postMessage({ action: 'export_image', type: imageInfo.format });
                // Push a notification to inform user that save succeeded only when it's a manual save (Ctrl+S)
                try {
                  if (message && message.via === 'manual') {
                    fetchPost('/api/notification/pushMsg', { msg: '保存成功', timeout: 7000 }, () => {});
                  }
                } catch (e) {
                  console.error('Push notification error:', e);
                }
              });
            }
          } catch (err) {
            console.error('Save error:', err);
            // Re-enable tab switching even if save fails
            enableTabSwitching();
          }
        }

        const onExportSuccess = (message: any) => {
          // Update image with exported data
          if (message.data) {
            imageInfo.data = message.data;
            imageInfo.data = that.fixImageContent(imageInfo.data);

            that.updateMindmapImage(imageInfo, () => {
              fetch(imageInfo.imageURL, { cache: 'reload' }).then(() => {
                document.querySelectorAll(`img[data-src='${imageInfo.imageURL}']`).forEach(imageElement => {
                  (imageElement as HTMLImageElement).src = imageInfo.imageURL;
                  const blockElement = imageElement.closest("div[data-type='NodeParagraph']") as HTMLElement;
                  if (blockElement) {
                    that.updateAttrLabel(imageInfo, blockElement);
                  }
                });
                // Re-enable tab switching after save is complete (with 300ms delay)
                setTimeout(() => {
                  enableTabSwitching();
                }, 300);
              }).catch((err) => {
                console.error('Failed to reload image:', err);
                // Re-enable tab switching even if reload fails
                enableTabSwitching();
              });
            });
          } else {
            // Re-enable tab switching if no data
            enableTabSwitching();
          }
        }

        const onExit = (_message: any) => {
          this.tab.close();
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
        <iframe src="/plugins/siyuan-embed-mindmap/mind/index.html?iframeID=${iframeID}"></iframe>
      </div>
      <div class="fn__hr--b"></div>
    </div>
  </div>
    `;

    const dialogDestroyCallbacks = [];

    const dialog = new Dialog({
      content: editDialogHTML,
      width: this.isMobile ? "92vw" : "90vw",
      height: "80vh",
      hideCloseIcon: this.isMobile,
      destroyCallback: () => {
        dialogDestroyCallbacks.forEach(callback => callback());
      },
    });

    const iframe = dialog.element.querySelector("iframe");
    iframe.focus();

    const postMessage = (message: any) => {
      if (!iframe.contentWindow) return;
      iframe.contentWindow.postMessage(JSON.stringify(message), '*');
    };

    // 在 simple-mind-map 中，我们通过块属性保存/读取思维导图 JSON
    const onInit = async (_message: any) => {
      // Load mind map data from block attributes
      if (imageInfo.blockID) {
        try {
          fetchPost('/api/attr/getBlockAttrs', { id: imageInfo.blockID }, (resp) => {
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



    const disableTabSwitching = () => {
      const tabHeaders = document.querySelectorAll('.layout-tab-bar li[data-type="tab-header"]');
      tabHeaders.forEach((header: HTMLElement) => {
        header.style.pointerEvents = 'none';
        header.style.opacity = '0.6';
      });
    };

    const enableTabSwitching = () => {
      const tabHeaders = document.querySelectorAll('.layout-tab-bar li[data-type="tab-header"]');
      tabHeaders.forEach((header: HTMLElement) => {
        header.style.pointerEvents = '';
        header.style.opacity = '';
      });
    };

    const onSave = (message: any) => {
      // Save mind map data to block attributes
      try {
        const payload = message.data || null;
        if (imageInfo.blockID && payload) {
          // Disable tab switching during save to prevent SVG dimension errors
          disableTabSwitching();
          
          fetchPost('/api/attr/setBlockAttrs', { 
            id: imageInfo.blockID, 
            attrs: { 'custom-mindmap': typeof payload === 'string' ? payload : JSON.stringify(payload) } 
          }, (_resp) => {
            // After saving data, export image
            postMessage({ action: 'export_image', type: imageInfo.format });
            // Push a notification to inform user that save succeeded only when it's a manual save (Ctrl+S)
            try {
              if (message && message.via === 'manual') {
                fetchPost('/api/notification/pushMsg', { msg: '保存成功', timeout: 7000 }, () => {});
              }
            } catch (e) {
              console.error('Push notification error:', e);
            }
          });
        }
      } catch (err) {
        console.error('Save error:', err);
        // Re-enable tab switching even if save fails
        enableTabSwitching();
      }
    }

    const onExportSuccess = (message: any) => {
      // Update image with exported data
      if (message.data) {
        imageInfo.data = message.data;
        imageInfo.data = this.fixImageContent(imageInfo.data);

        this.updateMindmapImage(imageInfo, () => {
          fetch(imageInfo.imageURL, { cache: 'reload' }).then(() => {
            document.querySelectorAll(`img[data-src='${imageInfo.imageURL}']`).forEach(imageElement => {
              (imageElement as HTMLImageElement).src = imageInfo.imageURL;
              const blockElement = imageElement.closest("div[data-type='NodeParagraph']") as HTMLElement;
              if (blockElement) {
                this.updateAttrLabel(imageInfo, blockElement);
              }
            });
            // Re-enable tab switching after save is complete (with 300ms delay)
            setTimeout(() => {
              enableTabSwitching();
            }, 300);
          }).catch((err) => {
            console.error('Failed to reload image:', err);
            // Re-enable tab switching even if reload fails
            enableTabSwitching();
          });
        });
      } else {
        // Re-enable tab switching if no data
        enableTabSwitching();
      }
    }

    const onExit = (_message: any) => {
      dialog.destroy();
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

  public isDarkMode(): boolean {
    return this.data[STORAGE_NAME].themeMode === 'themeDark' || (this.data[STORAGE_NAME].themeMode === 'themeOS' && window.siyuan.config.appearance.mode === 1);
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
}
