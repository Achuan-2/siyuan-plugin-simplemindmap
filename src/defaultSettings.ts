// 默认主题配置
export const DEFAULT_THEME_CONFIG = {
  "imgMaxWidth": 350,
  "imgMaxHeight": 200,
  "root": {
    "shape": "rectangle"
  },
  "second": {
    "fontSize": 24,
    "shape": "rectangle",
    "marginY": 16
  },
  "node": {
    "fontSize": 24,
    "borderColor": "#4D4D4D",
    "borderWidth": 2,
    "marginY": 16
  },
  "lineStyle": "curve",
  "rootLineKeepSameInCurve": true,
  "rootLineStartPositionKeepSameInCurve": true,
  "showLineMarker": false
};

// 可用的思维导图主题列表
export const THEME_LIST = [
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
  { value: 'blackHumour', name: '黑色幽默' },
  { value: 'lateNightOffice', name: '深夜办公室' },
  { value: 'blackGold', name: '黑金' }
];

// 可用的思维导图结构列表
export const LAYOUT_LIST = [
  { value: 'logicalStructure', name: '逻辑结构图' },
  { value: 'logicalStructureLeft', name: '逻辑结构图（左侧）' },
  { value: 'mindMap', name: '思维导图' },
  { value: 'organizationStructure', name: '组织结构图' },
  { value: 'catalogOrganization', name: '目录组织图' },
  { value: 'timeline', name: '时间轴' },
  { value: 'timeline2', name: '时间轴2' },
  { value: 'verticalTimeline', name: '竖向时间轴' },
  { value: 'fishbone', name: '鱼骨图' }
];

// 彩虹线条配置列表
export const RAINBOW_LINES_OPTIONS = [
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

export const getDefaultSettings = () => ({
  labelDisplay: "showLabelAlways",
  embedImageFormat: "png",
  editWindow: "dialog",
  defaultTheme: "lemonBubbles",
  defaultLayout: "logicalStructure",
  themeConfig: JSON.stringify(DEFAULT_THEME_CONFIG, null, 2),
  defaultRainbowLines: "colors2",
  globalMindmapSetting: `{"mousewheelAction":"zoom"}`
});
