// 默认主题配置
const DEFAULT_THEME_CONFIG = {
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

export const getDefaultSettings = () => ({
  labelDisplay: "showLabelAlways",
  embedImageFormat: "png",
  editWindow: "dialog",
  defaultTheme: "lemonBubbles",
  defaultLayout: "logicalStructure",
  themeConfig: JSON.stringify(DEFAULT_THEME_CONFIG, null, 2),
  defaultRainbowLines: "none",
  globalMindmapSetting: "{}"
});
