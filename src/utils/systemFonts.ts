export interface FontFamilyOption {
    value: string;
    label: string;
    searchText: string;
}

/** 兼容旧版字符串列表和新版带本地化名称、字重的字体列表。 */
export function normalizeSystemFonts(data: unknown): FontFamilyOption[] {
    if (!Array.isArray(data)) {
        throw new Error('系统字体接口未返回字体列表');
    }
    const families = new Map<string, FontFamilyOption>();
    for (const item of data) {
        const family = typeof item === 'string' ? item : item?.family;
        if (typeof family !== 'string' || !family.trim()) continue;
        const name = family.trim();
        const displayName = typeof item?.displayName === 'string' ? item.displayName.trim() : '';
        const aliases = Array.isArray(item?.aliases) ? item.aliases.filter(alias => typeof alias === 'string') : [];
        const searchText = [name, typeof item?.displayName === 'string' ? item.displayName : '', ...aliases].join(' ').toLocaleLowerCase();
        const existing = families.get(name);
        if (existing) {
            existing.searchText += ` ${searchText}`;
            if (displayName && item.weight === 400) existing.label = displayName;
        } else {
            // 包含逗号等特殊字符的字体名需要作为单个 CSS 字体家族引用。
            const value = /[,"'\\]/.test(name) ? JSON.stringify(name) : name;
            families.set(name, { value, label: displayName || name, searchText });
        }
    }
    return [...families.values()].sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
}
