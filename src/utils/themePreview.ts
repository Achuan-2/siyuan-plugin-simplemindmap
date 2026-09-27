/** 复用导图样式设置中的内置主题预览资源。 */
export function getThemeImagePath(themeValue: string): string {
    const extension = /^classic(?:[89]|1[0-5])$/.test(themeValue) ? 'png' : 'jpg';
    return `plugins/siyuan-plugin-simplemindmap/mindmap-embed/dist/img/${themeValue}.${extension}`;
}
