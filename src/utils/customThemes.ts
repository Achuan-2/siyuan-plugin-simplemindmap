import engineDefaultTheme from 'simple-mind-map/src/theme/default';
import Themes from 'simple-mind-map-plugin-themes';

export type ThemeConfig = Record<string, any>;

export interface CustomTheme {
    id: string;
    name: string;
    template: string;
    config: ThemeConfig;
}

export const NODE_LEVELS = [
    { key: 'root', title: '根节点' },
    { key: 'second', title: '二级节点' },
    { key: 'node', title: '普通节点' },
    { key: 'generalization', title: '概要节点' }
] as const;

export const SHAPE_OPTIONS = {
    rectangle: '矩形', roundedRectangle: '圆角矩形', ellipse: '椭圆',
    diamond: '菱形', parallelogram: '平行四边形', octagonalRectangle: '八角矩形'
};

export function isThemeObject(value: unknown): value is ThemeConfig {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** 与导图引擎一样逐层合并主题，同时保留高级配置中的额外属性。 */
export function mergeThemeConfig(base: ThemeConfig, overrides: ThemeConfig): ThemeConfig {
    const result = JSON.parse(JSON.stringify(base));
    for (const [key, value] of Object.entries(overrides)) {
        if (['__proto__', 'constructor', 'prototype'].includes(key)) continue;
        result[key] = isThemeObject(value)
            ? mergeThemeConfig(isThemeObject(result[key]) ? result[key] : {}, value)
            : Array.isArray(value) ? JSON.parse(JSON.stringify(value)) : value;
    }
    return result;
}

export function getBuiltinThemeConfig(template: string): ThemeConfig {
    const theme = [...Themes.lightList, ...Themes.darkList].find(item => item.value === template);
    return mergeThemeConfig(engineDefaultTheme, theme?.theme ?? {});
}

/** 校验可视化编辑器使用的字段，避免非法值进入导图渲染器。 */
export function validateThemeConfig(config: unknown): string {
    if (!isThemeObject(config)) return '主题配置必须是 JSON 对象';
    const checkNumbers = (values: ThemeConfig, title: string) => {
        for (const key of ['fontSize', 'lineWidth', 'borderWidth', 'borderRadius', 'paddingX', 'paddingY', 'marginX', 'marginY']) {
            const value = values[key];
            if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value) || value < (key === 'fontSize' ? 1 : 0))) {
                return `${title}${key} 必须为${key === 'fontSize' ? '大于 0' : '大于或等于 0'}的数字`;
            }
        }
        for (const key of ['color', 'fillColor', 'borderColor', 'fontFamily', 'backgroundColor', 'lineColor', 'startColor', 'endColor']) {
            if (values[key] !== undefined && typeof values[key] !== 'string') return `${title}${key} 必须为字符串`;
            if (key !== 'fontFamily' && values[key] !== undefined && typeof CSS !== 'undefined'
                && !CSS.supports('color', values[key])) return `${title}${key} 不是有效的颜色`;
        }
        for (const key of ['showLineMarker', 'rootLineKeepSameInCurve', 'gradientStyle']) {
            if (values[key] !== undefined && typeof values[key] !== 'boolean') return `${title}${key} 必须为布尔值`;
        }
        if (values.shape !== undefined && !Object.prototype.hasOwnProperty.call(SHAPE_OPTIONS, values.shape)
            && !['circle', 'outerTriangularRectangle', 'innerTriangularRectangle'].includes(values.shape)) {
            return `${title}shape 不是有效的节点形状`;
        }
        return '';
    };
    const globalError = checkNumbers(config, '');
    if (globalError) return globalError;
    if (config.lineStyle !== undefined && !['straight', 'curve', 'curve2', 'direct'].includes(config.lineStyle)) return '连线风格无效';
    for (const { key, title } of NODE_LEVELS) {
        if (config[key] !== undefined) {
            if (!isThemeObject(config[key])) return `${title}配置必须是 JSON 对象`;
            const error = checkNumbers(config[key], `${title}的 `);
            if (error) return error;
        }
    }
    return '';
}

export function parseThemeConfig(value: string): ThemeConfig | null {
    try {
        const config = JSON.parse(value.trim() || '{}');
        return isThemeObject(config) ? config : null;
    } catch {
        return null;
    }
}
