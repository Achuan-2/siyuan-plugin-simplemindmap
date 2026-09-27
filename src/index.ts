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
  readMindMapDataFromPNG,
  hasMindMapDataInPNG,
  readMindMapDataFromSVG,
  hasMindMapDataInSVG,
  writeMindMapDataToPNG,
  writeMindMapDataToSVG,
} from "./utils";
import { matchHotKey } from "./utils/hotkey";
import { getMindmapLanguage } from "./utils/i18n";
import { importOutline, importDocTree, importContent } from "../mind-map/web/src/utils/noteImport";
import SettingPanel from "./SettingPanel.svelte";
import { getDefaultSettings, DEFAULT_THEME_CONFIG, RAINBOW_LINES_OPTIONS, normalizeThemeFontSizes } from "./defaultSettings";

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
const MINDMAP_BLOCK_SELECTOR = "div[data-type='NodeParagraph'][custom-mindmap], div[data-type='NodeParagraph'][custom-mindmap-image]";
const MINDMAP_IMAGE_SELECTOR = ".img[data-type='img'] img";

type BackgroundImageSaveTask = {
  imageInfo: MindmapImageInfo;
  data: any;
  config: any;
  signature: string;
  callbacks: { resolve: (signature: string) => void; reject: (error: Error) => void }[];
};

type BackgroundImageSaveState = {
  running: boolean;
  pending: BackgroundImageSaveTask | null;
};

type EditorImageSaveState = {
  lastSignature: string | null;
  queuedSignature: string | null;
  pendingSave: Promise<string> | null;
  config: any;
  data: any;
};

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
  private _clickBlockIconHandler;
  // 只合并正在进行的读取，不长期缓存图片，避免同步或外部修改后读到旧数据。
  private _pendingImageRequests = new Map<string, Promise<string>>();
  private _mindmapDialogs = new Set<Dialog>();
  private _backgroundImageSaves = new Map<string, BackgroundImageSaveState>();
  private _backgroundExportFrames = new Set<HTMLIFrameElement>();
  private _unloading = false;

  public EDIT_TAB_TYPE = "mindmap-edit-tab";
  public TEMP_TAB_TYPE = "mindmap-temp-tab";

  async onload() {
    this._unloading = false;
    // 添加自定义思维导图图标
    this.addIcons(`<symbol id="iconSimpleMindmap" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M640 138.666667c-53.717333 0-98.986667 36.096-112.896 85.333333H469.333333A160 160 0 0 0 309.333333 384v10.666667H256a117.333333 117.333333 0 1 0 0 234.666666h53.333333V640A160 160 0 0 0 469.333333 800h57.770667a117.376 117.376 0 0 0 112.896 85.333333h128a117.333333 117.333333 0 1 0 0-234.666666h-128c-53.717333 0-98.986667 36.096-112.896 85.333333H469.333333A96 96 0 0 1 373.333333 640v-10.666667H384a117.333333 117.333333 0 1 0 0-234.666666h-10.666667V384A96 96 0 0 1 469.333333 288h57.770667a117.376 117.376 0 0 0 112.896 85.333333h128a117.333333 117.333333 0 1 0 0-234.666666h-128zM586.666667 256c0-29.44 23.893333-53.333333 53.333333-53.333333h128a53.333333 53.333333 0 1 1 0 106.666666h-128c-29.44 0-53.333333-23.893333-53.333333-53.333333z m-384 256c0-29.44 23.893333-53.333333 53.333333-53.333333h128a53.333333 53.333333 0 1 1 0 106.666666H256c-29.44 0-53.333333-23.893333-53.333333-53.333333z m384 256c0-29.44 23.893333-53.333333 53.333333-53.333333h128a53.333333 53.333333 0 1 1 0 106.666666h-128c-29.44 0-53.333333-23.893333-53.333333-53.333333z" fill="currentColor"></path></symbol>`);

    this.initMetaInfo();
    await this.initSetting();
    if (this._unloading) return;

    this._mutationObserver = this.setAddImageBlockMuatationObserver(document.body, (blockElement: HTMLElement) => {
      if (this.data[STORAGE_NAME].labelDisplay === "noLabel") return;

      // 标签是固定文字，无需下载图片或解码 PNG/SVG 元数据。
      const imageElement = blockElement.querySelector(MINDMAP_IMAGE_SELECTOR);
      const imageURL = imageElement?.getAttribute("data-src");
      if (imageURL && /^assets\/.+\.(?:svg|png)$/.test(imageURL)) {
        this.updateAttrLabel(blockElement);
      }
    });

    // Add edit button on hover for mindmap images
    this._mouseoverHandler = (e: MouseEvent) => {
      if (!(e.target instanceof Element)) return;
      const imgContainer = e.target.closest('[data-type="img"]') as HTMLElement;
      if (!imgContainer) return;
      // 在同一张图片的子元素间移动鼠标，不重复查询和创建按钮。
      if (e.relatedTarget instanceof Node && imgContainer.contains(e.relatedTarget)) return;

      const action = imgContainer.querySelector('.protyle-action') as HTMLElement;
      if (!action || action.querySelector('.cst-edit-mindmap')) return;

      // Check if this image has custom-mindmap attribute
      const blockElement = imgContainer.closest("div[data-type='NodeParagraph']") as HTMLElement;
      if (!blockElement) return;
      if (!blockElement.hasAttribute('custom-mindmap') && !blockElement.hasAttribute('custom-mindmap-image')) return;

      // Create edit button element
      const editBtnElement = HTMLToElement(`<span aria-label="编辑思维导图" data-position="4north" class="ariaLabel protyle-icon cst-edit-mindmap"><svg><use xlink:href="#iconSimpleMindmap"></use></svg></span>`);
      editBtnElement.addEventListener("click", async (event: PointerEvent) => {
        event.preventDefault();
        event.stopPropagation();

        // 点击时读取最新地址，避免图片替换后仍然编辑旧文件。
        const imgSrc = imgContainer.querySelector('img')?.getAttribute("data-src");
        const blockID = blockElement.getAttribute("data-node-id");
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

      this.updateImageActionStyles(action);
    };
    document.addEventListener('mouseover', this._mouseoverHandler);

    this.setupEditTab();

    this.protyleSlash = [{
      filter: ["mindmap", "simple-mindmap", "simplemindmap", "思绪思维导图", "脑图", "naotu", "sixusiweidaotu"],
      id: "simplemindmap",
      html: `<div class="b3-list-item__first"><svg class="b3-list-item__graphic"><use xlink:href="#iconImage"></use></svg><span class="b3-list-item__text">思绪思维导图</span></div>`,
      callback: (protyle, nodeElement) => {
        this.newMindmapImage(protyle, nodeElement.dataset.nodeId, (imageInfo) => {
          if (!this.isMobile && this.data[STORAGE_NAME].editWindow === 'tab') {
            this.openEditTab(imageInfo, nodeElement.dataset.nodeId, true);
          } else {
            this.openEditDialog(imageInfo, nodeElement.dataset.nodeId, true);
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

    // 监听块图标点击以添加块级菜单（内容转导图）
    this._clickBlockIconHandler = this.handleBlockMenu.bind(this);
    this.eventBus.on('click-blockicon', this._clickBlockIconHandler);

    this._globalKeyDownHandler = this.globalKeyDownHandler.bind(this);
    document.documentElement.addEventListener("keydown", this._globalKeyDownHandler);

    document.querySelectorAll<HTMLElement>(MINDMAP_BLOCK_SELECTOR).forEach(blockElement => {
      if (blockElement.querySelector(MINDMAP_IMAGE_SELECTOR)) {
        this.updateAttrLabel(blockElement);
      }
    });
  }

  onunload() {
    this._unloading = true;
    if (this._mutationObserver) this._mutationObserver.disconnect();
    if (this._openMenuImageHandler) this.eventBus.off("open-menu-image", this._openMenuImageHandler);
    if (this._openMenuDoctreeHandler) this.eventBus.off("open-menu-doctree", this._openMenuDoctreeHandler);
    if (this._clickEditorTitleIconHandler) this.eventBus.off('click-editortitleicon', this._clickEditorTitleIconHandler);
    if (this._clickBlockIconHandler) this.eventBus.off('click-blockicon', this._clickBlockIconHandler);
    if (this._globalKeyDownHandler) document.documentElement.removeEventListener("keydown", this._globalKeyDownHandler);
    if (this._mouseoverHandler) document.removeEventListener('mouseover', this._mouseoverHandler);
    for (const dialog of this._mindmapDialogs) dialog.destroy();
    this._mindmapDialogs.clear();
    for (const frame of this._backgroundExportFrames) frame.remove();
    this._backgroundExportFrames.clear();
    document.querySelectorAll('.label--embed-mindmap').forEach(label => label.remove());
    document.querySelectorAll('.cst-edit-mindmap').forEach(button => {
      const action = button.parentElement;
      button.remove();
      if (action) this.updateImageActionStyles(action);
    });
    this.removeAllMindmapTab();
  }

  uninstall() {
    this.removeData(STORAGE_NAME);
  }

  async openSetting() {
    let dialog = new Dialog({
      title: this.displayName,
      content: `<div id="SettingPanel" style="height: 100%;"></div>`,
      width: this.isMobile ? "92vw" : "800px",
      height: this.isMobile ? "80vh" : "700px",
      destroyCallback: () => {
        pannel.$destroy();
      }
    });

    let pannel = new SettingPanel({
      target: dialog.element.querySelector("#SettingPanel"),
      props: {
        plugin: this
      }
    });
  }

  private async initSetting() {
    const defaultSettings = getDefaultSettings();
    await this.loadData(STORAGE_NAME);
    if (!this.data[STORAGE_NAME]) this.data[STORAGE_NAME] = {};

    // Merge default settings with loaded settings
    Object.keys(defaultSettings).forEach(key => {
      if (typeof this.data[STORAGE_NAME][key] === 'undefined') {
        this.data[STORAGE_NAME][key] = defaultSettings[key];
      }
    });
    const themeConfig = normalizeThemeFontSizes(this.data[STORAGE_NAME].themeConfig);
    if (themeConfig !== this.data[STORAGE_NAME].themeConfig) {
      await this.saveSettings({ ...this.data[STORAGE_NAME], themeConfig });
    }
  }

  /**
   * 加载设置
   */
  async loadSettings() {
    const settings = await this.loadData(STORAGE_NAME);
    const defaultSettings = getDefaultSettings();
    const mergedSettings = { ...defaultSettings, ...settings };
    return { ...mergedSettings, themeConfig: normalizeThemeFontSizes(mergedSettings.themeConfig) };
  }

  /**
   * 保存设置
   */
  async saveSettings(settings: any) {
    settings = { ...settings, themeConfig: normalizeThemeFontSizes(settings.themeConfig) };
    this.data[STORAGE_NAME] = settings;
    await this.saveData(STORAGE_NAME, settings);
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
      const addedRoots = new Set<Element>();
      const blocks = new Set<HTMLElement>();
      for (const mutation of mutations) {
        // 图片或属性栏也可能单独插入已存在的段落。
        const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
        const parentBlock = target?.closest<HTMLElement>(MINDMAP_BLOCK_SELECTOR);
        if (parentBlock) blocks.add(parentBlock);

        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node instanceof Element) addedRoots.add(node);
          }
        }
      }

      for (const root of addedRoots) {
        if (!root.isConnected) continue;
        // 父节点已经在本批次中时，只扫描父节点一次。
        let parent = root.parentElement;
        while (parent && !addedRoots.has(parent)) parent = parent.parentElement;
        if (parent) continue;
        if (root.matches(MINDMAP_BLOCK_SELECTOR)) blocks.add(root as HTMLElement);
        root.querySelectorAll<HTMLElement>(MINDMAP_BLOCK_SELECTOR).forEach(block => blocks.add(block));
      }

      for (const block of blocks) {
        if (block.isConnected && element.contains(block) && block.querySelector(MINDMAP_IMAGE_SELECTOR)) {
          callback(block);
        }
      }
    });

    mutationObserver.observe(element, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['custom-mindmap', 'custom-mindmap-image', 'data-src']
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
    // 获取默认的思维导图数据
    const defaultMindMapData = this.getDefaultMindMapData();

    
    if (format === 'png') {
      // 创建一个带有灰色背景和文字的PNG图片
      const canvas = document.createElement('canvas');
      canvas.width = 270;
      canvas.height = 183;
      const ctx = canvas.getContext('2d');
      
      // 灰色背景
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 黑色文字
      ctx.fillStyle = '#000000';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SimpleMindMap', canvas.width / 2, canvas.height / 2);
      
      const dataUrl = canvas.toDataURL('image/png');
      
      // 将思维导图数据写入PNG元数据
      return writeMindMapDataToPNG(dataUrl, defaultMindMapData, {});
    } else {
      // 创建一个带有灰色背景和文字的SVG图片
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="270" height="183">
        <rect width="100%" height="100%" fill="#f0f0f0"/>
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="20" fill="#000000">SimpleMindMap</text>
      </svg>`;
      const base64 = btoa(unescape(encodeURIComponent(svg)));
      const dataUrl = `data:image/svg+xml;base64,${base64}`;
      
      // 将思维导图数据写入SVG元数据
      return writeMindMapDataToSVG(dataUrl, defaultMindMapData, {});
    }
  }

  // 获取默认的思维导图数据结构（使用配置的默认主题）
  private getDefaultMindMapData(): any {
    const defaultTheme = this.data[STORAGE_NAME].defaultTheme || 'lemonBubbles';
    const defaultLayout = this.data[STORAGE_NAME].defaultLayout || 'logicalStructure';

    // 获取主题自定义配置
    let themeConfig = {};
    try {
      const configStr = this.data[STORAGE_NAME].themeConfig;
      if (configStr !== undefined && configStr !== null) {
        // 如果配置存在（即使是空字符串），尝试解析
        if (configStr.trim()) {
          themeConfig = JSON.parse(configStr);
        }
        // 如果是空字符串，themeConfig 保持为 {}
      } else {
        // 如果配置不存在，使用默认配置
        themeConfig = DEFAULT_THEME_CONFIG;
      }
    } catch (e) {
      console.warn('Failed to parse theme config, using default');
      themeConfig = DEFAULT_THEME_CONFIG;
    }

    return {
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
      layout: defaultLayout,
      config: {},
      view: null
    };
  }



  // 获取初始的 localConfig，根据设置同步 isDark 状态
  private getInitialLocalConfig(): { isDark?: boolean } | null {
    const syncThemeWithSiyuan = this.data[STORAGE_NAME].syncThemeWithSiyuan;
    
    // 如果未启用跟随思源主题，返回 null（使用默认配置）
    if (!syncThemeWithSiyuan) {
      return null;
    }

    // 获取思源笔记的外观模式：0=亮色，1=暗色
    const siyuanMode = (window as any).siyuan?.config?.appearance?.mode;
    
    // 返回初始的 isDark 配置
    return {
      isDark: siyuanMode === 1
    };
  }



  public async newMindmapImage(protyle, blockID: string, callback?: (imageInfo: MindmapImageInfo) => void) {
    const format = this.data[STORAGE_NAME].embedImageFormat;
    const defaultRainbowLines = this.data[STORAGE_NAME].defaultRainbowLines || 'none';

    // 获取彩虹线条配置
    let rainbowLinesConfig: { open: boolean; colorsList?: string[] } = { open: false };
    if (defaultRainbowLines !== 'none') {
      const rainbowOption = RAINBOW_LINES_OPTIONS.find(opt => opt.value === defaultRainbowLines);
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

    // 初始化配置（彩虹线条等）
    const initialConfig = {
      rainbowLinesConfig: rainbowLinesConfig
    };
    console.log('Initial mindmap config:', initialConfig);

    // 分离保存配置 — 不再在新建块时保存 legacy `custom-mindmap`
    const attrs: any = {};

    // 保存彩虹线条配置到单独的属性
    if (rainbowLinesConfig) {
      attrs['custom-mindmap-rainbowLinesConfig'] = JSON.stringify(rainbowLinesConfig);
    }

    // 如果有其他配置，保存到custom-mindmap-setting
    const { rainbowLinesConfig: _, ...otherConfig } = initialConfig;
    if (Object.keys(otherConfig).length > 0) {
      attrs['custom-mindmap-setting'] = JSON.stringify(otherConfig);
    }

    try {
      await fetchSyncPost('/api/attr/setBlockAttrs', {
        id: blockID,
        attrs: attrs
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
    const key = `${reload ? 'reload' : 'default'}:${imageURL}`;
    const pending = this._pendingImageRequests.get(key);
    if (pending) return pending;

    const request = (async () => {
      const response = await fetch(imageURL, { cache: reload ? 'reload' : 'default' });
      if (!response.ok) return "";
      return blobToDataURL(await response.blob());
    })();
    this._pendingImageRequests.set(key, request);
    try {
      return await request;
    } finally {
      this._pendingImageRequests.delete(key);
    }
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
    return resp;
  }

  private getMindmapContentSignature(data: any, config: any): string {
    // 视图位置和缩放不属于图片内容。
    return JSON.stringify([data?.root, data?.layout, data?.theme, config?.rainbowLinesConfig]);
  }

  private exportImageInBackground(data: any, config: any, format: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const frame = document.createElement('iframe');
      const baseURL = `/plugins/${this.name}/mindmap-embed/index.html`;
      frame.src = `${baseURL}?backgroundExport=1`;
      frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:1200px;height:800px;border:0;pointer-events:none;';
      frame.setAttribute('aria-hidden', 'true');
      this._backgroundExportFrames.add(frame);

      const cleanup = () => {
        clearTimeout(timeout);
        window.removeEventListener('message', onMessage);
        frame.remove();
        this._backgroundExportFrames.delete(frame);
      };
      const fail = (error: Error) => {
        cleanup();
        reject(error);
      };
      const timeout = window.setTimeout(() => fail(new Error('后台导出思维导图超时')), 60000);
      const send = (message: any) => {
        frame.contentWindow?.postMessage(JSON.stringify(message), '*');
      };
      const onMessage = (event: MessageEvent) => {
        if (event.source !== frame.contentWindow || typeof event.data !== 'string') return;
        let message: any;
        try {
          message = JSON.parse(event.data);
        } catch (error) {
          return;
        }
        if (message.event === 'request_data') {
          send({
            event: 'init_data',
            mindMapData: { ...data, view: null },
            mindMapConfig: config,
            lang: getMindmapLanguage(window.siyuan?.config?.lang),
            localConfig: this.getInitialLocalConfig()
          });
        } else if (message.event === 'app_inited') {
          send({ action: 'export_image', type: format });
        } else if (message.event === 'export_success') {
          cleanup();
          resolve(message.data);
        } else if (message.event === 'export_error') {
          fail(new Error(message.error || '后台导出思维导图失败'));
        }
      };
      window.addEventListener('message', onMessage);
      frame.addEventListener('error', () => fail(new Error('后台导出页面加载失败')), { once: true });
      document.body.appendChild(frame);
    });
  }

  private queueBackgroundImageSave(imageInfo: MindmapImageInfo, data: any, config: any, signature: string): Promise<string> {
    const key = imageInfo.imageURL;
    let state = this._backgroundImageSaves.get(key);
    if (!state) {
      state = { running: false, pending: null };
      this._backgroundImageSaves.set(key, state);
    }
    return new Promise((resolve, reject) => {
      const callback = { resolve, reject };
      if (state.pending) {
        // 导出过程中发生多次编辑，只保留最新快照，同时通知等待旧快照的调用方。
        state.pending = {
          imageInfo, data, config, signature,
          callbacks: [...state.pending.callbacks, callback]
        };
      } else {
        state.pending = { imageInfo, data, config, signature, callbacks: [callback] };
      }
      if (!state.running) void this.runBackgroundImageSaves(key, state);
    });
  }

  private async runBackgroundImageSaves(key: string, state: BackgroundImageSaveState): Promise<void> {
    state.running = true;
    while (state.pending) {
      const task = state.pending;
      state.pending = null;
      try {
        if (this._unloading) throw new Error('插件已卸载');
        const exported = await this.exportImageInBackground(task.data, task.config, task.imageInfo.format);
        if (typeof exported !== 'string' || !exported.startsWith('data:image/')) {
          throw new Error('后台导出未返回有效图片');
        }
        const savedImage = { ...task.imageInfo, data: this.fixImageContent(exported) };
        const attrResponse = await fetchSyncPost('/api/attr/setBlockAttrs', {
          id: task.imageInfo.blockID,
          attrs: { 'custom-mindmap-image': 'true' }
        });
        if (attrResponse?.code !== 0) throw new Error('设置思维导图块属性失败');
        const imageResponse = await this.updateMindmapImage(savedImage);
        if (imageResponse?.code !== 0) throw new Error('写入思维导图图片失败');
        task.imageInfo.data = savedImage.data;
        void fetch(task.imageInfo.imageURL, { cache: 'reload' }).catch(error => {
          console.warn('Failed to refresh mindmap image cache:', error);
        });
        document.querySelectorAll(`img[data-src='${task.imageInfo.imageURL}']`).forEach(imageElement => {
          (imageElement as HTMLImageElement).src = task.imageInfo.imageURL;
          const blockElement = imageElement.closest("div[data-type='NodeParagraph']") as HTMLElement;
          if (blockElement) this.updateAttrLabel(blockElement);
        });
        task.callbacks.forEach(callback => callback.resolve(task.signature));
      } catch (error) {
        const saveError = error instanceof Error ? error : new Error(String(error));
        task.callbacks.forEach(callback => callback.reject(saveError));
      }
    }
    state.running = false;
    this._backgroundImageSaves.delete(key);
  }

  private handleEditorImageSave(
    imageInfo: MindmapImageInfo,
    message: any,
    state: EditorImageSaveState,
    postMessage: (message: any) => void
  ): void {
    const payload = message.data;
    if (!imageInfo.blockID || !payload) return;
    state.data = payload;
    const signature = this.getMindmapContentSignature(payload, state.config);
    const confirmSave = () => {
      postMessage({ event: 'save_confirmed' });
      if (message.via === 'manual') {
        void fetchSyncPost('/api/notification/pushMsg', { msg: '保存成功', timeout: 7000 })
          .catch(error => console.error('Push notification error:', error));
      }
    };
    if (signature === state.lastSignature && state.queuedSignature === null) {
      if (message.via === 'manual') confirmSave();
      return;
    }
    if (signature !== state.queuedSignature || !state.pendingSave) {
      state.queuedSignature = signature;
      state.pendingSave = this.queueBackgroundImageSave(imageInfo, payload, state.config, signature);
    }
    state.pendingSave.then(savedSignature => {
      state.lastSignature = savedSignature;
      if (state.queuedSignature === signature) {
        state.queuedSignature = null;
        state.pendingSave = null;
      }
      confirmSave();
    }).catch(error => {
      if (state.queuedSignature === signature) {
        state.queuedSignature = null;
        state.pendingSave = null;
      }
      console.error('Background mindmap image save failed:', error);
      if (message.via === 'manual') {
        void fetchSyncPost('/api/notification/pushErrMsg', {
          msg: '思维导图图片保存失败', timeout: 7000
        }).catch(notificationError => console.error('Push notification error:', notificationError));
      }
    });
  }

  public updateAttrLabel(blockElement: HTMLElement) {
    if (this.data[STORAGE_NAME].labelDisplay === "noLabel") return;

    const attrElement = blockElement.querySelector(".protyle-attr") as HTMLDivElement;
    if (attrElement) {
      let labelElement = attrElement.querySelector(".label--embed-mindmap") as HTMLDivElement;
      if (!labelElement) {
        labelElement = document.createElement("div");
        labelElement.classList.add("label--embed-mindmap");
        labelElement.innerHTML = '<span>SimpleMindMap</span>';
        attrElement.prepend(labelElement);
      }
      labelElement.classList.toggle('label--embed-mindmap--always',
        this.data[STORAGE_NAME].labelDisplay === "showLabelAlways");
    }
  }

  private updateImageActionStyles(action: HTMLElement) {
    const count = action.children.length;
    for (const child of action.children) {
      child.classList.toggle('protyle-icon--only', count === 1);
      child.classList.toggle('protyle-icon--first', count > 1 && child === action.firstElementChild);
      child.classList.toggle('protyle-icon--last', count > 1 && child === action.lastElementChild);
    }
  }

  private async saveMindmapConfig(blockID: string, config: any) {
    if (!blockID || !config) return;
    const { rainbowLinesConfig, ...otherConfig } = config;
    const attrs: Record<string, string> = {};
    if (Object.keys(otherConfig).length > 0) {
      attrs['custom-mindmap-setting'] = JSON.stringify(otherConfig);
    }
    if (rainbowLinesConfig) {
      attrs['custom-mindmap-rainbowLinesConfig'] = JSON.stringify(rainbowLinesConfig);
    }
    if (Object.keys(attrs).length > 0) {
      await fetchSyncPost('/api/attr/setBlockAttrs', { id: blockID, attrs });
    }
  }

  private openMenuImageHandler({ detail }) {
    const selectedElement = detail.element;
    const imageElement = selectedElement.querySelector("img") as HTMLImageElement;
    if (!imageElement) return;
    const imageURL = imageElement.dataset.src;
    const blockElement = selectedElement.closest("div[data-type='NodeParagraph']") as HTMLElement;
    if (!blockElement) return;
    const blockID = blockElement.getAttribute("data-node-id");

    // 检查是否有导图属性（新版本 custom-mindmap-image 或 旧版本 custom-mindmap）
    const hasMindmapPngAttr = blockElement.getAttribute("custom-mindmap-image") === 'true';
    const hasOldMindmapAttr = !!blockElement.getAttribute("custom-mindmap");

    if (hasMindmapPngAttr || hasOldMindmapAttr) {
      // 有属性标识，直接显示编辑菜单
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
      });
    } else if (imageURL && (imageURL.endsWith('.png') || imageURL.endsWith('.svg'))) {
      // 没有属性标识，但是PNG或SVG图片，检查是否包含导图元数据
      this.getMindmapImageInfo(imageURL, true).then(async (imageInfo: MindmapImageInfo) => {
        if (imageInfo && imageInfo.data) {
          const hasMindMapData = imageInfo.format === 'png'
            ? hasMindMapDataInPNG(imageInfo.data)
            : hasMindMapDataInSVG(imageInfo.data);
          if (hasMindMapData) {
            // 自动设置 custom-mindmap-image 属性
            try {
              await fetchSyncPost('/api/attr/setBlockAttrs', {
                id: blockID,
                attrs: { 'custom-mindmap-image': 'true' }
              });
            } catch (e) {
              console.warn('Failed to set custom-mindmap-image attr:', e);
            }
            // 图片中包含导图数据，添加编辑菜单
            window.siyuan.menus.menu.addItem({
              id: "edit-mindmap",
              icon: 'iconSimpleMindmap',
              label: `思维导图编辑`,
              index: 1,
              click: async () => {
                if (!this.isMobile && this.data[STORAGE_NAME].editWindow === 'tab') {
                  this.openEditTab(imageInfo, blockID);
                } else {
                  this.openEditDialog(imageInfo, blockID);
                }
              }
            });
          }
        }
      });
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
    if (!isNotebook && !isDoc) return;

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

      // 文档内容转导图
      detail.menu.addItem({
        icon: "iconSimpleMindmap",
        label: this.i18n.docContentToMindmap || "思绪：文档内容转导图",
        click: () => {
          const docId = element.getAttribute('data-node-id');
          console.log('Show doc content mindmap for docId:', docId);
          this.showDocContentMindmap(docId);
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
      const mindmapData = await importDocTree(notebookId, startPath, 0, sortMode, rootName, rootDocId);

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

      // 文档内容转导图
      menu.addItem({
        icon: 'iconSimpleMindmap',
        label: this.i18n.docContentToMindmap || '思绪：文档内容转导图',
        click: () => {
          const idToUse = docId;
          if (idToUse) {
            this.showDocContentMindmap(idToUse);
          } else {
            new Dialog({ title: '错误', content: `<div class="b3-dialog__content">无法获取到文档 ID</div>`, width: '360px' });
          }
        }
      });
    } catch (err) {
      console.error('handleDocumentMenu error:', err);
    }
  }

  // 为块图标（块右键菜单）添加“内容转导图”菜单项，支持多选块
  private handleBlockMenu({ detail }) {
    try {
      const menu = detail?.menu;
      if (!menu) return;

      const singleLabel = '内容转导图';
      const batchLabel = '批量内容转导图';

      menu.addItem({
        icon: 'iconSimpleMindmap',
        label: (detail.blockElements && detail.blockElements.length > 1) ? `${batchLabel} (${detail.blockElements.length})` : singleLabel,
        click: async () => {
          try {
            // 优先使用 detail.blockElements（可多选）
            if (detail.blockElements && detail.blockElements.length > 0) {
              const blockIds = detail.blockElements
                .map((el: Element) => (el as HTMLElement).getAttribute('data-node-id'))
                .filter((id: string | null) => !!id) as string[];

              if (blockIds.length === 0) {
                new Dialog({ title: '错误', content: `<div class="b3-dialog__content">无法获取到块 ID</div>`, width: '360px' });
                return;
              }

              if (blockIds.length === 1) {
                this.showBlockContentMindmap(blockIds[0]);
              } else {
                await this.showBlocksContentMindmap(blockIds);
              }
              return;
            }

          } catch (err) {
            console.error('click-blockicon handler click error:', err);
            new Dialog({ title: '错误', content: `<div class="b3-dialog__content">${err.message || '操作失败'}</div>`, width: '360px' });
          }
        }
      });
    } catch (err) {
      console.error('handleBlockMenu error:', err);
    }
  }

  // 将多个块的内容导入为思维导图并展示（合并多个块）
  private async showBlocksContentMindmap(blockIds: string[]) {
    const loadingDialog = new Dialog({
      title: this.i18n?.batchBlockContentToMindmap || '批量内容转导图',
      content: `<div class="b3-dialog__content" style="text-align: center; padding: 40px;">\n        <div class="fn__loading"><svg class="fn__rotate"><use xlink:href="#iconLoading"></use></svg></div>\n        <div style="margin-top: 16px;">正在生成合并块内容思维导图...</div>\n      </div>`,
      width: "480px",
    });

    try {
      if (!blockIds || blockIds.length === 0) throw new Error('无法获取块 ID 列表');

      // 使用 importContent 生成合并的思维导图数据
      const combined = await importContent(blockIds.join(','), { content: '合并内容', name: '合并内容' }, 0, '');

      loadingDialog.destroy();

      const blockSettings = {
        blockId: blockIds.join(','),
        importType: 'content',
        autoNumber: false,
        maxLevel: 0,
        autoRefresh: false,
        isNotebook: false
      };

      if (!this.isMobile && this.data[STORAGE_NAME].editWindow === 'tab') {
        this.openTempMindmapTab(combined, this.i18n?.combinedBlocksTitle || '合并内容', blockSettings);
      } else {
        this.openTempMindmapDialog(combined, blockSettings);
      }
    } catch (error) {
      console.error('生成合并块内容思维导图失败:', error);
      loadingDialog.destroy();
      new Dialog({ title: '错误', content: `<div class="b3-dialog__content">${error.message || '生成失败'}</div>`, width: '400px' });
    }
  }

  // 将指定块的内容导入为思维导图并展示（块级内容）
  private async showBlockContentMindmap(blockId: string) {
    const loadingDialog = new Dialog({
      title: this.i18n?.blockContentToMindmap || '内容转导图',
      content: `<div class="b3-dialog__content" style="text-align: center; padding: 40px;">\n        <div class="fn__loading"><svg class="fn__rotate"><use xlink:href="#iconLoading"></use></svg></div>\n        <div style="margin-top: 16px;">正在生成块内容思维导图...</div>\n      </div>`,
      width: "400px",
    });

    try {
      if (!blockId) throw new Error('无法获取块 ID');

      const blockRes = await fetchSyncPost('/api/query/sql', {
        stmt: `SELECT box, path, content, name FROM blocks WHERE id = '${blockId}'`
      });

      if (!blockRes || blockRes.code !== 0 || !blockRes.data || blockRes.data.length === 0) {
        throw new Error('无法获取块信息');
      }

      const blockInfo = blockRes.data[0];

      // 使用 importContent 来生成思维导图数据
      const mindmapRoot = await importContent(blockId, blockInfo, 0, '');

      const plainTitle = (blockInfo.content || blockInfo.name || '内容').replace(/<[^>]+>/g, '').trim();

      const blockSettings = {
        blockId: blockId,
        importType: 'content',
        autoNumber: false,
        maxLevel: 0,
        autoRefresh: false,
        isNotebook: false
      };

      loadingDialog.destroy();

      if (!this.isMobile && this.data[STORAGE_NAME].editWindow === 'tab') {
        this.openTempMindmapTab(mindmapRoot, plainTitle, blockSettings);
      } else {
        this.openTempMindmapDialog(mindmapRoot, blockSettings);
      }
    } catch (error) {
      console.error('生成块内容思维导图失败:', error);
      loadingDialog.destroy();
      new Dialog({ title: '错误', content: `<div class="b3-dialog__content">${error.message || '生成失败'}</div>`, width: '400px' });
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
      const mindmapData = await importDocTree(notebookId, startPath, 0, sortMode, rootName, docId);

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

  // 将文档内容导入为思维导图并展示（单文档内容）
  // 参数：docId - 文档的 block id
  private async showDocContentMindmap(docId: string) {
    const loadingDialog = new Dialog({
      title: this.i18n.docContentToMindmap || "文档内容转导图",
      content: `<div class="b3-dialog__content" style="text-align: center; padding: 40px;">
        <div class="fn__loading"><svg class="fn__rotate"><use xlink:href="#iconLoading"></use></svg></div>
        <div style="margin-top: 16px;">正在生成文档内容思维导图...</div>
      </div>`,
      width: "400px",
    });

    try {
      if (!docId) throw new Error('无法获取文档 ID');

      const blockRes = await fetchSyncPost('/api/query/sql', {
        stmt: `SELECT box, path, content, name FROM blocks WHERE id = '${docId}'`
      });

      if (!blockRes || blockRes.code !== 0 || !blockRes.data || blockRes.data.length === 0) {
        throw new Error('无法获取文档信息');
      }

      const blockInfo = blockRes.data[0];

      // 使用 importContent 来生成思维导图数据
      const mindmapRoot = await importContent(docId, blockInfo, 0, '');

      const plainTitle = (blockInfo.content || blockInfo.name || '文档').replace(/<[^>]+>/g, '').trim();

      const blockSettings = {
        blockId: docId,
        importType: 'content',
        autoNumber: false,
        maxLevel: 0,
        autoRefresh: false,
        isNotebook: false
      };

      loadingDialog.destroy();

      if (!this.isMobile && this.data[STORAGE_NAME].editWindow === 'tab') {
        this.openTempMindmapTab(mindmapRoot, plainTitle, blockSettings);
      } else {
        this.openTempMindmapDialog(mindmapRoot, blockSettings);
      }
    } catch (error) {
      console.error('生成文档内容思维导图失败:', error);
      loadingDialog.destroy();
      new Dialog({
        title: "错误",
        content: `<div class="b3-dialog__content">${error.message || '生成失败'}</div>`,
        width: "400px",
      });
    }
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

    let dialogTitle = this.i18n.docTreeToMindmap || "子文档转导图";
    if (blockSettings?.importType) {
      switch (blockSettings.importType) {
        case 'outline':
          dialogTitle = this.i18n.docOutlineToMindmap || "文档大纲转导图";
          break;
        case 'content':
          dialogTitle = this.i18n.contentToMindmap || "笔记内容转导图";
          break;
        case 'docTree':
        default:
          dialogTitle = this.i18n.docTreeToMindmap || "子文档转导图";
          break;
      }
    }

    let removeMessageListener = () => {};
    const dialog = new Dialog({
      title: dialogTitle,
      content: dialogHTML,
      width: this.isMobile ? "92vw" : "90vw",
      height: "80vh",
      destroyCallback: () => {
        removeMessageListener();
        this._mindmapDialogs.delete(dialog);
      },
    });
    this._mindmapDialogs.add(dialog);

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
      if (event.source !== iframe.contentWindow || typeof event.data !== 'string') return;
      try {
        const message = JSON.parse(event.data);

        if (message.event === 'request_data') {
          // iframe 请求数据 - 可编辑但不自动保存


          // 获取彩虹线条配置
          let rainbowLinesConfig: { open: boolean; colorsList?: string[] } = { open: false };
          const defaultRainbowLines = this.data[STORAGE_NAME].defaultRainbowLines || 'none';
          if (defaultRainbowLines !== 'none') {
            const rainbowOption = RAINBOW_LINES_OPTIONS.find(opt => opt.value === defaultRainbowLines);
            if (rainbowOption && rainbowOption.list) {
              rainbowLinesConfig = {
                open: true,
                colorsList: rainbowOption.list
              };
            }
          }

          // 合并全局思维导图设置
          let globalMindmapConfig = {};
          try {
            globalMindmapConfig = JSON.parse(this.data[STORAGE_NAME].globalMindmapSetting || '{}');
          } catch (e) {
            globalMindmapConfig = {};
          }

          // 解析主题配置
          let themeConfig = {};
          try {
            const configStr = this.data[STORAGE_NAME].themeConfig;
            if (configStr !== undefined && configStr !== null) {
              if (typeof configStr === 'string' && configStr.trim()) {
                themeConfig = JSON.parse(configStr);
              } else if (typeof configStr === 'object') {
                themeConfig = configStr;
              }
            } else {
              themeConfig = DEFAULT_THEME_CONFIG;
            }
          } catch (e) {
            console.warn('Failed to parse theme config, using default');
            themeConfig = DEFAULT_THEME_CONFIG;
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
              layout: this.data[STORAGE_NAME].defaultLayout || 'logicalStructure',
              config: {},
              view: null
            },
            mindMapConfig: {
              ...globalMindmapConfig,
              rainbowLinesConfig: rainbowLinesConfig
              // 移除 readonly 限制，允许编辑
            },
            lang: getMindmapLanguage(window.siyuan?.config?.lang),
            localConfig: this.getInitialLocalConfig(),
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

    removeMessageListener = () => {
      window.removeEventListener('message', messageHandler);
    };
  }

  private openTempMindmapTab(mindmapData: any, rootName?: string, blockSettings?: any) {
    let defaultTitle = this.i18n.docTreeToMindmap || "子文档转导图";
    if (blockSettings?.importType) {
      switch (blockSettings.importType) {
        case 'outline':
          defaultTitle = this.i18n.docOutlineToMindmap || "文档大纲转导图";
          break;
        case 'content':
          defaultTitle = this.i18n.contentToMindmap || "笔记内容转导图";
          break;
        case 'docTree':
        default:
          defaultTitle = this.i18n.docTreeToMindmap || "子文档转导图";
          break;
      }
    }
    const title = (rootName || '').replace(/<[^>]*>/g, '') || defaultTitle;
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

        // 保存 tab 对象的引用，以便在 onInit 中使用
        const customTab = this;
        const saveState: EditorImageSaveState = {
          lastSignature: null, queuedSignature: null, pendingSave: null, config: {}, data: null
        };

        const postMessage = (message: any) => {
          if (!iframe.contentWindow) return;
          if (message.event === 'init_data') {
            saveState.config = message.mindMapConfig || {};
            saveState.data = message.mindMapData;
            saveState.lastSignature = that.getMindmapContentSignature(saveState.data, saveState.config);
          }
          iframe.contentWindow.postMessage(JSON.stringify(message), '*');
        };

        const onInit = async (_message: any) => {
          // Load mind map data - 优先从图片元数据读取（PNG/SVG），其次从块属性读取
          if (imageInfo.blockID) {
            try {
              const resp = await fetchSyncPost('/api/attr/getBlockAttrs', { id: imageInfo.blockID });
              let mindMapData = null;
              let mindMapConfig: { rainbowLinesConfig?: any;[key: string]: any } = {};

              // 检查是否有 custom-mindmap-image 属性（新版本导图图片标识）
              const hasPngAttr = resp && resp.data && resp.data['custom-mindmap-image'] === 'true';
              // 检查是否有 custom-mindmap 属性（旧版本块属性存储）
              const hasOldAttr = resp && resp.data && resp.data['custom-mindmap'];

              // 如果是PNG格式，尝试从图片元数据读取
              if (imageInfo.format === 'png' && imageInfo.data) {
                try {
                  const pngData = readMindMapDataFromPNG(imageInfo.data);
                  if (pngData && pngData.mindMapData) {
                    // mindMapData 包含完整结构 { root, theme, layout, view }
                    mindMapData = pngData.mindMapData;

                    // 合并额外的配置（如果有）
                    if (pngData.mindMapConfig && Object.keys(pngData.mindMapConfig).length > 0) {
                      mindMapConfig = { ...mindMapConfig, ...pngData.mindMapConfig };
                    }

                    console.log('Loaded mindmap data from PNG metadata');
                  }
                } catch (e) {
                  console.warn('Failed to read mindmap data from PNG:', e);
                }
              }

              // 如果是SVG格式，尝试从图片元数据读取
              if (!mindMapData && imageInfo.format === 'svg' && imageInfo.data) {
                try {
                  const svgData = readMindMapDataFromSVG(imageInfo.data);
                  if (svgData && svgData.mindMapData) {
                    // mindMapData 包含完整结构 { root, theme, layout, view }
                    mindMapData = svgData.mindMapData;

                    // 合并额外的配置（如果有）
                    if (svgData.mindMapConfig && Object.keys(svgData.mindMapConfig).length > 0) {
                      mindMapConfig = { ...mindMapConfig, ...svgData.mindMapConfig };
                    }

                    console.log('Loaded mindmap data from SVG metadata');
                  }
                } catch (e) {
                  console.warn('Failed to read mindmap data from SVG:', e);
                }
              }

              // 如果从图片元数据读取失败，尝试从块属性读取（兼容旧版本）
              if (!mindMapData && hasOldAttr) {
                try {
                  mindMapData = JSON.parse(resp.data['custom-mindmap']);
                  console.log('Loaded mindmap data from block attributes (legacy)');
                } catch (e) { mindMapData = null; }
              }

              // 如果有 custom-mindmap-image 属性但没有读取到数据，说明图片可能被替换或损坏
              // 编辑模式下不允许打开，避免覆盖原图片（但新建导图时跳过此检查）
              const isNewMindmap = (imageInfo as any).isNewMindmap || false;
              if (!isNewMindmap && hasPngAttr && !mindMapData && !hasOldAttr) {
                console.error('Block has custom-mindmap-image attribute but image contains no valid mindmap data');
                await fetchSyncPost('/api/notification/pushErrMsg', { 
                  msg: '该图片不包含有效的思维导图数据，可能已被替换或损坏。请重新创建导图。', 
                  timeout: 7000 
                });
                // 关闭标签页 (setupEditTab 中)
                customTab.tab.close();
                return;
              }

              // 整合思维导图配置：全局设置 + 块属性设置 + 彩虹线条设置
              // 1. 先加载全局设置作为基础
              let globalConfig = {};
              try {
                globalConfig = JSON.parse(that.data[STORAGE_NAME].globalMindmapSetting || '{}');
              } catch (e) { globalConfig = {}; }
              mindMapConfig = { ...globalConfig, ...mindMapConfig };

              // 2. 加载块属性设置（非彩虹线条）- 如果图片元数据中没有配置
              if (resp && resp.data && resp.data['custom-mindmap-setting'] && !mindMapConfig.rainbowLinesConfig) {
                try {
                  const blockConfig = JSON.parse(resp.data['custom-mindmap-setting']);
                  mindMapConfig = { ...mindMapConfig, ...blockConfig };
                } catch (e) { /* 忽略解析错误 */ }
              }

              // 3. 加载彩虹线条设置 - 如果图片元数据中没有配置
              if (!mindMapConfig.rainbowLinesConfig) {
                if (resp && resp.data && resp.data['custom-mindmap-rainbowLinesConfig']) {
                  try {
                    const rainbowConfig = JSON.parse(resp.data['custom-mindmap-rainbowLinesConfig']);
                    mindMapConfig = { ...mindMapConfig, rainbowLinesConfig: rainbowConfig };
                  } catch (e) { /* 忽略解析错误 */ }
                } else {
                  // 如果块属性没有彩虹线条配置，使用插件设置的默认彩虹线条
                  const defaultRainbowLines = that.data[STORAGE_NAME].defaultRainbowLines || 'none';
                  if (defaultRainbowLines !== 'none') {
                    const rainbowOption = RAINBOW_LINES_OPTIONS.find(opt => opt.value === defaultRainbowLines);
                    if (rainbowOption && rainbowOption.list) {
                      mindMapConfig = {
                        ...mindMapConfig,
                        rainbowLinesConfig: {
                          open: true,
                          colorsList: rainbowOption.list
                        }
                      };
                    }
                  }
                }
              }

              postMessage({
                event: 'init_data',
                mindMapData: mindMapData || that.getDefaultMindMapData(),
                mindMapConfig: mindMapConfig,
                lang: getMindmapLanguage(window.siyuan?.config?.lang),
                localConfig: that.getInitialLocalConfig()
              });
            } catch (err) {
              postMessage({
                event: 'init_data',
                mindMapData: that.getDefaultMindMapData(),
                mindMapConfig: {},
                lang: getMindmapLanguage(window.siyuan?.config?.lang),
                localConfig: that.getInitialLocalConfig()
              });
            }
          } else {
            postMessage({
              event: 'init_data',
              mindMapData: that.getDefaultMindMapData(),
              mindMapConfig: {},
              lang: getMindmapLanguage(window.siyuan?.config?.lang),
              localConfig: that.getInitialLocalConfig()
            });
          }
        }

        const onSave = (message: any) => {
          that.handleEditorImageSave(imageInfo, message, saveState, postMessage);
        }

        const onSaveConfig = async (message: any) => {
          try {
            saveState.config = message.config || {};
            await that.saveMindmapConfig(imageInfo.blockID, message.config);
            if (saveState.data) {
              that.handleEditorImageSave(imageInfo, { data: saveState.data }, saveState, postMessage);
            }
          } catch (err) {
            console.error('Save config error:', err);
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

        const messageEventHandler = (event: MessageEvent) => {
          if (event.source !== iframe.contentWindow || typeof event.data !== 'string') return;
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
              else if (message.event == 'editor_ready' && message.data && !saveState.pendingSave) {
                saveState.data = message.data;
                saveState.lastSignature = that.getMindmapContentSignature(message.data, saveState.config);
              }
              else if (message.event == 'save') {
                onSave(message);
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
          if (!that._unloading) {
            try {
              const mindMap = (iframe.contentWindow as any)?.mindMapInstance;
              mindMap?.renderer?.textEdit?.hideEditTextBox();
              const data = mindMap?.getData(true);
              if (data) that.handleEditorImageSave(imageInfo, { data, via: 'close' }, saveState, () => {});
            } catch (error) {
              console.error('Failed to save mindmap tab on close:', error);
            }
          }
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
          if (event.source !== iframe.contentWindow || typeof event.data !== 'string') return;
          try {
            const message = JSON.parse(event.data);
            if (!message) return;

            if (message.event === 'request_data') {

              // 获取彩虹线条配置
              let rainbowLinesConfig: { open: boolean; colorsList?: string[] } = { open: false };
              const defaultRainbowLines = that.data[STORAGE_NAME].defaultRainbowLines || 'none';
              if (defaultRainbowLines !== 'none') {
                const rainbowOption = RAINBOW_LINES_OPTIONS.find(opt => opt.value === defaultRainbowLines);
                if (rainbowOption && rainbowOption.list) {
                  rainbowLinesConfig = {
                    open: true,
                    colorsList: rainbowOption.list
                  };
                }
              }

              // 合并全局思维导图设置
              let globalMindmapConfig = {};
              try {
                globalMindmapConfig = JSON.parse(that.data[STORAGE_NAME].globalMindmapSetting || '{}');
              } catch (e) {
                globalMindmapConfig = {};
              }

              // 解析主题配置
              let themeConfig = {};
              try {
                const configStr = that.data[STORAGE_NAME].themeConfig;
                if (configStr !== undefined && configStr !== null) {
                  if (typeof configStr === 'string' && configStr.trim()) {
                    themeConfig = JSON.parse(configStr);
                  } else if (typeof configStr === 'object') {
                    themeConfig = configStr;
                  }
                } else {
                  themeConfig = DEFAULT_THEME_CONFIG;
                }
              } catch (e) {
                console.warn('Failed to parse theme config, using default');
                themeConfig = DEFAULT_THEME_CONFIG;
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
                  ...globalMindmapConfig,
                  rainbowLinesConfig: rainbowLinesConfig
                  // 可编辑但不自动保存
                },
                lang: getMindmapLanguage(window.siyuan?.config?.lang),
                localConfig: that.getInitialLocalConfig(),
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

  public openEditTab(imageInfo: MindmapImageInfo, blockID?: string, isNewMindmap: boolean = false) {
    if (blockID) imageInfo.blockID = blockID;
    // 将 isNewMindmap 标志添加到 imageInfo 中，以便在 init 函数中使用
    (imageInfo as any).isNewMindmap = isNewMindmap;
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

  public openEditDialog(imageInfo: MindmapImageInfo, blockID?: string, isNewMindmap: boolean = false) {
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
    let triggerSaveOnClose = () => { };
    // 标记是否通过"在标签页中打开"按钮关闭
    let openingInTab = false;

    const dialog = new Dialog({
      content: editDialogHTML,
      width: this.isMobile ? "92vw" : "90vw",
      height: "80vh",
      hideCloseIcon: this.isMobile,
      destroyCallback: () => {
        // 如果是通过"在标签页中打开"按钮关闭，不触发保存（会在 Tab 中继续编辑）
        if (!openingInTab && !this._unloading) {
          triggerSaveOnClose();
        }
        dialogDestroyCallbacks.forEach(callback => callback());
        this._mindmapDialogs.delete(dialog);
      },
    });
    this._mindmapDialogs.add(dialog);

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

    const saveState: EditorImageSaveState = {
      lastSignature: null, queuedSignature: null, pendingSave: null, config: {}, data: null
    };
    const postMessage = (message: any) => {
      if (!iframe.contentWindow) return;
      if (message.event === 'init_data') {
        saveState.config = message.mindMapConfig || {};
        saveState.data = message.mindMapData;
        saveState.lastSignature = this.getMindmapContentSignature(saveState.data, saveState.config);
      }
      iframe.contentWindow.postMessage(JSON.stringify(message), '*');
    };

    // 设置关闭时触发保存的回调
    triggerSaveOnClose = () => {
      try {
        const mindMap = (iframe.contentWindow as any)?.mindMapInstance;
        mindMap?.renderer?.textEdit?.hideEditTextBox();
        const data = mindMap?.getData(true);
        if (data) this.handleEditorImageSave(imageInfo, { data, via: 'close' }, saveState, () => {});
      } catch (error) {
        console.error('Failed to save mindmap dialog on close:', error);
      }
    };

    // 在 simple-mind-map 中，我们通过块属性保存/读取思维导图 JSON
    const onInit = async (_message: any) => {
      // Load mind map data - 优先从图片元数据读取（PNG/SVG），其次从块属性读取
      if (imageInfo.blockID) {
        try {
          const resp = await fetchSyncPost('/api/attr/getBlockAttrs', { id: imageInfo.blockID });
          let mindMapData = null;
          let mindMapConfig: { rainbowLinesConfig?: any;[key: string]: any } = {};

          // 检查是否有 custom-mindmap-image 属性（新版本导图图片标识）
          const hasPngAttr = resp && resp.data && resp.data['custom-mindmap-image'] === 'true';
          // 检查是否有 custom-mindmap 属性（旧版本块属性存储）
          const hasOldAttr = resp && resp.data && resp.data['custom-mindmap'];

          // 如果是PNG格式，尝试从图片元数据读取
          if (imageInfo.format === 'png' && imageInfo.data) {
            try {
              const pngData = readMindMapDataFromPNG(imageInfo.data);
              if (pngData && pngData.mindMapData) {
                mindMapData = pngData.mindMapData;
                if (pngData.mindMapConfig) {
                  mindMapConfig = pngData.mindMapConfig;
                }
                console.log('Loaded mindmap data from PNG metadata');
              }
            } catch (e) {
              console.warn('Failed to read mindmap data from PNG:', e);
            }
          }

          // 如果是SVG格式，尝试从图片元数据读取
          if (!mindMapData && imageInfo.format === 'svg' && imageInfo.data) {
            try {
              const svgData = readMindMapDataFromSVG(imageInfo.data);
              if (svgData && svgData.mindMapData) {
                mindMapData = svgData.mindMapData;
                if (svgData.mindMapConfig) {
                  mindMapConfig = svgData.mindMapConfig;
                }
                console.log('Loaded mindmap data from SVG metadata');
              }
              console.log('SVG data read attempt finished', svgData);
            } catch (e) {
              console.warn('Failed to read mindmap data from SVG:', e);
            }
          }

          // 如果从图片元数据读取失败，尝试从块属性读取（兼容旧版本）
          if (!mindMapData && hasOldAttr) {
            try {
              mindMapData = JSON.parse(resp.data['custom-mindmap']);
              console.log('Loaded mindmap data from block attributes (legacy)');
            } catch (e) { mindMapData = null; }
          }

          // 如果有 custom-mindmap-image 属性但没有读取到数据，说明图片可能被替换或损坏
          // 编辑模式下不允许打开，避免覆盖原图片（但新建导图时跳过此检查）
          if (!isNewMindmap && hasPngAttr && !mindMapData && !hasOldAttr) {
            console.error('Block has custom-mindmap-image attribute but image contains no valid mindmap data');
            await fetchSyncPost('/api/notification/pushErrMsg', { 
              msg: '该图片不包含有效的思维导图数据，可能已被替换或损坏。请重新创建导图。', 
              timeout: 7000 
            });
            // 关闭对话框 (openEditDialog 中)
            dialog.destroy();
            return;
          }

          // 整合思维导图配置：全局设置 + 块属性设置 + 彩虹线条设置
          // 1. 先加载全局设置作为基础
          let globalConfig = {};
          try {
            globalConfig = JSON.parse(this.data[STORAGE_NAME].globalMindmapSetting || '{}');
          } catch (e) { globalConfig = {}; }
          mindMapConfig = { ...globalConfig, ...mindMapConfig };

          // 2. 加载块属性设置（非彩虹线条）- 如果图片元数据中没有配置
          if (resp && resp.data && resp.data['custom-mindmap-setting'] && !mindMapConfig.rainbowLinesConfig) {
            try {
              const blockConfig = JSON.parse(resp.data['custom-mindmap-setting']);
              mindMapConfig = { ...mindMapConfig, ...blockConfig };
            } catch (e) { /* 忽略解析错误 */ }
          }

          // 3. 加载彩虹线条设置 - 如果图片元数据中没有配置
          if (!mindMapConfig.rainbowLinesConfig) {
            if (resp && resp.data && resp.data['custom-mindmap-rainbowLinesConfig']) {
              try {
                const rainbowConfig = JSON.parse(resp.data['custom-mindmap-rainbowLinesConfig']);
                mindMapConfig = { ...mindMapConfig, rainbowLinesConfig: rainbowConfig };
              } catch (e) { /* 忽略解析错误 */ }
            } else {
              // 如果块属性没有彩虹线条配置，使用插件设置的默认彩虹线条
              const defaultRainbowLines = this.data[STORAGE_NAME].defaultRainbowLines || 'none';
              if (defaultRainbowLines !== 'none') {
                const rainbowOption = RAINBOW_LINES_OPTIONS.find(opt => opt.value === defaultRainbowLines);
                if (rainbowOption && rainbowOption.list) {
                  mindMapConfig = {
                    ...mindMapConfig,
                    rainbowLinesConfig: {
                      open: true,
                      colorsList: rainbowOption.list
                    }
                  };
                }
              }
            }
          }

          postMessage({
            event: 'init_data',
            mindMapData: mindMapData || this.getDefaultMindMapData(),
            mindMapConfig: mindMapConfig,
            lang: getMindmapLanguage(window.siyuan?.config?.lang),
            localConfig: this.getInitialLocalConfig(),
            imageUrl: imageInfo.imageURL
          });
        } catch (err) {
          postMessage({
            event: 'init_data',
            mindMapData: this.getDefaultMindMapData(),
            mindMapConfig: {},
            lang: getMindmapLanguage(window.siyuan?.config?.lang),
            localConfig: this.getInitialLocalConfig(),
            imageUrl: imageInfo.imageURL
          });
        }
      } else {
        postMessage({
          event: 'init_data',
          mindMapData: this.getDefaultMindMapData(),
          mindMapConfig: {},
          lang: getMindmapLanguage(window.siyuan?.config?.lang),
          localConfig: this.getInitialLocalConfig(),
          imageUrl: imageInfo.imageURL
        });
      }
    }

    const onSave = (message: any) => {
      this.handleEditorImageSave(imageInfo, message, saveState, postMessage);
    }

    const onSaveConfig = async (message: any) => {
      try {
        saveState.config = message.config || {};
        await this.saveMindmapConfig(imageInfo.blockID, message.config);
        if (saveState.data) {
          this.handleEditorImageSave(imageInfo, { data: saveState.data }, saveState, postMessage);
        }
      } catch (err) {
        console.error('Save config error:', err);
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

    const messageEventHandler = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow || typeof event.data !== 'string') return;
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
          else if (message.event == 'editor_ready' && message.data && !saveState.pendingSave) {
            saveState.data = message.data;
            saveState.lastSignature = this.getMindmapContentSignature(message.data, saveState.config);
          }
          else if (message.event == 'save') {
            onSave(message);
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
      if (custom.type == this.name + this.EDIT_TAB_TYPE || custom.type == this.name + this.TEMP_TAB_TYPE) {
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
