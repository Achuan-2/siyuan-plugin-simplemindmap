<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import { confirm } from 'siyuan';
    import MindMap from 'simple-mind-map';
    import FontFamilySelect from '@/libs/components/font-family-select.svelte';
    import ThemeSelect from './ThemeSelect.svelte';
    import type { FontFamilyOption } from '@/utils/systemFonts';
    import { LAYOUT_LIST } from './defaultSettings';
    import {
        getBuiltinThemeConfig, mergeThemeConfig, parseThemeConfig, validateThemeConfig,
        NODE_LEVELS, SHAPE_OPTIONS, type CustomTheme, type ThemeConfig
    } from './utils/customThemes';

    export let themes: CustomTheme[] = [];
    export let activeId = '';
    export let defaultTemplate: string;
    export let defaultConfig: string;
    export let fonts: FontFamilyOption[] = [];
    export let fontsLoading = false;
    export let fontsError = '';
    export let retryFonts: () => void;
    export let saveTheme: (theme: CustomTheme, apply: boolean) => Promise<void>;
    export let deleteTheme: (id: string) => Promise<void>;
    const dispatch = createEventDispatcher<{ dirty: boolean }>();

    interface Field {
        key: string;
        label: string;
        type: 'color' | 'number' | 'select' | 'checkbox';
        options?: Record<string, string>;
        min?: number;
    }
    const globalFields: Field[] = [
        { key: 'backgroundColor', label: '背景颜色', type: 'color' },
        { key: 'lineColor', label: '连线颜色', type: 'color' },
        { key: 'lineWidth', label: '连线粗细（px）', type: 'number', min: 0 },
        { key: 'lineStyle', label: '连线风格', type: 'select', options: { straight: '直线', curve: '曲线', curve2: '圆弧', direct: '直连' } },
        { key: 'lineDasharray', label: '连线样式', type: 'select', options: { none: '实线', '5,5': '虚线', '2,4': '点线' } },
        { key: 'paddingX', label: '节点水平内边距（px）', type: 'number', min: 0 },
        { key: 'paddingY', label: '节点垂直内边距（px）', type: 'number', min: 0 },
        { key: 'showLineMarker', label: '显示连线箭头', type: 'checkbox' },
        { key: 'rootLineKeepSameInCurve', label: '根节点使用相同曲线风格', type: 'checkbox' }
    ];
    const nodeFields: Field[] = [
        { key: 'fillColor', label: '填充颜色', type: 'color' },
        { key: 'color', label: '文字颜色', type: 'color' },
        { key: 'fontSize', label: '字体大小（px）', type: 'number', min: 1 },
        { key: 'fontWeight', label: '字重', type: 'select', options: { normal: '常规', bold: '加粗' } },
        { key: 'fontStyle', label: '字形', type: 'select', options: { normal: '常规', italic: '斜体' } },
        { key: 'shape', label: '节点形状', type: 'select', options: SHAPE_OPTIONS },
        { key: 'borderColor', label: '边框颜色', type: 'color' },
        { key: 'borderWidth', label: '边框粗细（px）', type: 'number', min: 0 },
        { key: 'borderRadius', label: '圆角大小（px）', type: 'number', min: 0 },
        { key: 'gradientStyle', label: '渐变填充', type: 'checkbox' },
        { key: 'startColor', label: '渐变起始颜色', type: 'color' },
        { key: 'endColor', label: '渐变结束颜色', type: 'color' }
    ];
    const spacingFields: Field[] = [
        { key: 'marginX', label: '水平间距（px）', type: 'number', min: 0 },
        { key: 'marginY', label: '垂直间距（px）', type: 'number', min: 0 }
    ];

    let themeId = '';
    let name = '我的主题';
    let template = defaultTemplate;
    let config: ThemeConfig = getBuiltinThemeConfig(template);
    let section = 'global';
    let layout = 'logicalStructure';
    let jsonText = '';
    let error = '';
    let previewError = '';
    let dirty = false;
    let busy = false;
    let previewElement: HTMLDivElement;
    let preview: any;
    let previewTimer: ReturnType<typeof setTimeout>;

    $: fields = section === 'global' ? globalFields : [
        ...nodeFields, ...(section === 'root' ? [] : spacingFields)
    ];
    $: values = section === 'global' ? config : config[section];
    $: pendingJson = jsonText !== JSON.stringify(config, null, 2);
    $: dispatch('dirty', dirty);
    $: schedulePreview(config, layout);

    function loadDraft(id = '') {
        const theme = themes.find(item => item.id === id);
        themeId = theme?.id ?? '';
        name = theme?.name ?? '我的主题';
        template = theme?.template ?? defaultTemplate;
        config = mergeThemeConfig(getBuiltinThemeConfig(template), theme?.config ?? parseThemeConfig(defaultConfig) ?? {});
        jsonText = JSON.stringify(config, null, 2);
        error = '';
        dirty = false;
    }

    function confirmDiscard(action: () => void) {
        if (!dirty) return action();
        confirm('放弃修改', '当前主题有未保存的修改，确定放弃吗？', action);
    }

    function changeBase(nextTemplate: string) {
        confirmDiscard(() => {
            template = nextTemplate;
            config = getBuiltinThemeConfig(template);
            jsonText = JSON.stringify(config, null, 2);
            error = '';
            dirty = true;
        });
    }

    function updateField(key: string, value: any) {
        if (typeof value === 'number' && (!Number.isFinite(value) || value < (key === 'fontSize' ? 1 : 0))) {
            error = '请输入有效的数值';
            return false;
        }
        if (key.toLowerCase().includes('color') && !CSS.supports('color', value)) {
            error = '请输入有效的颜色，例如 #549688 或 transparent';
            return false;
        }
        const nextConfig = section === 'global'
            ? { ...config, [key]: value }
            : { ...config, [section]: { ...config[section], [key]: value } };
        const validationError = validateThemeConfig(nextConfig);
        if (validationError) {
            error = validationError;
            return false;
        }
        config = nextConfig;
        jsonText = JSON.stringify(config, null, 2);
        error = '';
        dirty = true;
        return true;
    }

    function fieldChanged(field: Field, event: Event) {
        const input = event.currentTarget as HTMLInputElement;
        const value = field.type === 'number' ? (input.value === '' ? NaN : Number(input.value)) : input.value.trim();
        if (!updateField(field.key, value)) input.value = String(values[field.key] ?? config[field.key] ?? '');
    }

    function applyJson() {
        const parsed = parseThemeConfig(jsonText);
        error = validateThemeConfig(parsed);
        if (error) return false;
        config = mergeThemeConfig(getBuiltinThemeConfig(template), parsed);
        jsonText = JSON.stringify(config, null, 2);
        dirty = true;
        return true;
    }

    async function save(apply = false) {
        if (jsonText !== JSON.stringify(config, null, 2) && !applyJson()) return;
        error = validateThemeConfig(config);
        if (error) return;
        const trimmedName = name.trim();
        if (!trimmedName) { error = '请填写主题名称'; return; }
        if (themes.some(theme => theme.id !== themeId && theme.name === trimmedName)) {
            error = '已有同名主题，请使用其他名称';
            return;
        }
        busy = true;
        try {
            const newId = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
            const theme = { id: themeId || `custom-${newId}`, name: trimmedName, template, config: JSON.parse(JSON.stringify(config)) };
            await saveTheme(theme, apply);
            themeId = theme.id;
            name = trimmedName;
            jsonText = JSON.stringify(config, null, 2);
            dirty = false;
        } catch (err) {
            console.error('保存自定义主题失败', err);
            error = '保存主题失败，请重试';
        } finally {
            busy = false;
        }
    }

    function remove() {
        confirm('删除主题', `确定删除“${name}”吗？${activeId === themeId ? '默认主题将恢复为内置主题。' : ''}`, async () => {
            busy = true;
            try {
                await deleteTheme(themeId);
                loadDraft();
            } catch (err) {
                console.error('删除自定义主题失败', err);
                error = '删除主题失败，请重试';
            } finally {
                busy = false;
            }
        });
    }

    function isTransparent(value: string) {
        return value?.trim().toLowerCase() === 'transparent';
    }

    function colorHex(value: string) {
        if (/^#[\da-f]{6}$/i.test(value)) return value;
        if (/^#[\da-f]{3}$/i.test(value)) return '#' + value.slice(1).split('').map(char => char + char).join('');
        const rgb = value?.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
        return rgb ? '#' + rgb.slice(1, 4).map(channel => Number(channel).toString(16).padStart(2, '0')).join('') : '#000000';
    }

    function fitPreview() {
        if (!preview || !previewElement.clientWidth || !previewElement.clientHeight) return;
        // 设置面板滚动只会改变容器位置，不会触发 ResizeObserver。
        // fit 使用屏幕坐标计算居中，必须先刷新位置，避免沿用滚动前的偏移。
        preview.getElRectInfo();
        preview.view.fit();
    }

    function schedulePreview(nextConfig: ThemeConfig, nextLayout: string) {
        if (!preview) return;
        clearTimeout(previewTimer);
        previewTimer = setTimeout(() => {
            try {
                preview.setThemeConfig(nextConfig);
                if (preview.getLayout() !== nextLayout) preview.setLayout(nextLayout);
                previewError = '';
            } catch (err) {
                console.error('主题预览失败', err);
                previewError = '预览失败，请检查主题配置';
            }
        }, 120);
    }

    onMount(() => {
        loadDraft(activeId);
        try {
            preview = new MindMap({
                el: previewElement,
                readonly: true,
                theme: 'default',
                themeConfig: config,
                layout,
                fit: false,
                // 预览由渲染完成和容器尺寸变化自动适配，滚轮和触控板不调整视图。
                customHandleMousewheel: () => {},
                data: {
                    data: { text: '我的主题' },
                    children: [
                        { data: { text: '二级节点', generalization: { text: '概要节点' } }, children: [{ data: { text: '普通节点' } }, { data: { text: '文字与边框' } }] },
                        { data: { text: '主题样式' }, children: [{ data: { text: '颜色与连线' } }] }
                    ]
                }
            });
            preview.on('node_tree_render_end', fitPreview);
            preview.keyCommand.pause();
        } catch (err) {
            console.error('初始化主题预览失败', err);
            previewError = '无法加载主题预览';
        }
        const observer = new ResizeObserver(() => {
            if (preview && previewElement.clientWidth && previewElement.clientHeight) {
                preview.resize();
                fitPreview();
            }
        });
        observer.observe(previewElement);
        return () => {
            observer.disconnect();
            clearTimeout(previewTimer);
            preview?.destroy();
            preview = null;
        };
    });
</script>

<div class="theme-editor">
    <p class="b3-label__text">从内置主题创建自己的主题，保存后可在“默认主题”中选择。设为默认后，新建导图使用该主题。</p>
    <div class="editor-toolbar">
        <label for="saved-theme">编辑主题</label>
        <select id="saved-theme" class="b3-select" value={themeId} disabled={busy}
            on:change={(event) => {
                const id = event.currentTarget.value;
                event.currentTarget.value = themeId;
                confirmDiscard(() => loadDraft(id));
            }}>
            <option value="">新建主题</option>
            {#each themes as theme (theme.id)}
                <option value={theme.id}>{theme.name}{activeId === theme.id ? '（默认）' : ''}</option>
            {/each}
        </select>
        <button class="b3-button b3-button--outline" disabled={busy} on:click={() => confirmDiscard(() => loadDraft())}>新建主题</button>
    </div>
    <fieldset class="editor-metadata" disabled={busy}>
        <label>主题名称<input class="b3-text-field" bind:value={name} on:input={() => dirty = true} maxlength="80" /></label>
        <div class="editor-field">
            <label for="theme-editor-base-theme">基础主题</label>
            <ThemeSelect id="theme-editor-base-theme" value={template} disabled={busy}
                on:changed={(event) => changeBase(event.detail.value)} />
        </div>
    </fieldset>
    <p class="b3-label__text">更换基础主题会重新载入该主题的样式。颜色支持 transparent（透明）。</p>
    <div class="preview-toolbar">
        <strong>实时预览</strong>
        <label>预览结构<select class="b3-select" bind:value={layout}>
            {#each LAYOUT_LIST as item}<option value={item.value}>{item.name}</option>{/each}
        </select></label>
    </div>
    <div class="theme-preview" bind:this={previewElement}></div>
    {#if previewError}<p class="editor-error" role="alert">{previewError}</p>{/if}
    <div class="editor-tabs" role="tablist" aria-label="主题样式">
        {#each [{ key: 'global', title: '背景与连线' }, ...NODE_LEVELS] as tab}
            <button class="b3-button b3-button--outline" class:active={section === tab.key} role="tab"
                aria-selected={section === tab.key} on:click={() => section = tab.key}>{tab.title}</button>
        {/each}
    </div>
    {#if pendingJson}<p class="b3-label__text">JSON 配置有待应用的修改，请先点击“应用到预览”再编辑样式。</p>{/if}
    <fieldset class="editor-fields" disabled={busy || pendingJson}>
        {#if section !== 'global'}
            <div class="editor-field">
                <span>字体</span>
                <FontFamilySelect id={`theme-editor-${section}-font`} value={values.fontFamily ?? ''}
                    {fonts} loading={fontsLoading} error={fontsError}
                    on:changed={(event) => updateField('fontFamily', event.detail.value || getBuiltinThemeConfig(template)[section].fontFamily)}
                    on:retry={retryFonts} />
            </div>
        {/if}
        {#each fields as field (`${section}.${field.key}`)}
            <label class="editor-field" for={`theme-editor-${section}-${field.key}`}>
                <span>{field.label}</span>
                {#if field.type === 'color'}
                    <span class="color-control">
                        <span class="color-picker" class:transparent={isTransparent(values[field.key])}
                            title={isTransparent(values[field.key]) ? '透明（transparent），点击选择颜色' : values[field.key]}>
                            <input type="color" aria-label={`${field.label}选择器${isTransparent(values[field.key]) ? '，当前透明' : ''}`}
                                value={colorHex(values[field.key])}
                                on:input={(event) => updateField(field.key, event.currentTarget.value)} />
                        </span>
                        <input id={`theme-editor-${section}-${field.key}`} class="b3-text-field" value={values[field.key] ?? ''}
                            on:change={(event) => fieldChanged(field, event)} />
                    </span>
                {:else if field.type === 'number'}
                    <input id={`theme-editor-${section}-${field.key}`} type="number" class="b3-text-field"
                        min={field.min} step={field.key === 'fontSize' ? 1 : 0.5} value={values[field.key] ?? config[field.key] ?? 0}
                        on:change={(event) => fieldChanged(field, event)} />
                {:else if field.type === 'select'}
                    <select id={`theme-editor-${section}-${field.key}`} class="b3-select" value={values[field.key]}
                        on:change={(event) => updateField(field.key, event.currentTarget.value)}>
                        {#if values[field.key] !== undefined && !(values[field.key] in field.options)}
                            <option value={values[field.key]}>{values[field.key]}</option>
                        {/if}
                        {#each Object.entries(field.options) as [value, label]}<option {value}>{label}</option>{/each}
                    </select>
                {:else}
                    <input id={`theme-editor-${section}-${field.key}`} type="checkbox" class="b3-switch" checked={values[field.key]}
                        on:change={(event) => updateField(field.key, event.currentTarget.checked)} />
                {/if}
            </label>
        {/each}
    </fieldset>
    <details class="editor-json">
        <summary>高级 JSON 配置</summary>
        <textarea class="b3-text-field" rows="12" spellcheck="false" disabled={busy} bind:value={jsonText} on:input={() => dirty = true} aria-label="主题 JSON 配置"></textarea>
        <button class="b3-button b3-button--outline" disabled={busy} on:click={applyJson}>应用到预览</button>
    </details>
    {#if error}<p class="editor-error" role="alert">{error}</p>{/if}
    <div class="editor-actions">
        <button class="b3-button" disabled={busy} on:click={() => save(false)}>保存主题</button>
        <button class="b3-button b3-button--outline" disabled={busy} on:click={() => save(true)}>保存并设为默认</button>
        {#if themeId}<button class="b3-button b3-button--outline" disabled={busy} on:click={remove}>删除主题</button>{/if}
        {#if dirty}<span class="b3-label__text">有未保存的修改</span>{/if}
    </div>
</div>

<style lang="scss">
    .theme-editor { padding: 16px; }
    .editor-toolbar, .preview-toolbar, .editor-tabs, .editor-actions {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
        margin: 16px 0;
    }
    .editor-toolbar select { flex: 1; min-width: 120px; }
    .editor-metadata, .editor-fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
    fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
    fieldset:disabled { opacity: 0.6; }
    .editor-metadata label, .editor-field { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
    .editor-metadata input, .editor-field > input:not([type='checkbox']), .editor-field select { width: 100%; box-sizing: border-box; }
    .preview-toolbar { justify-content: space-between; }
    .preview-toolbar label { display: flex; align-items: center; gap: 8px; }
    .theme-preview { height: 280px; width: 100%; overflow: hidden; border: 1px solid var(--b3-border-color); border-radius: 6px; }
    .editor-tabs .active { background: var(--b3-theme-primary); color: var(--b3-theme-on-primary); }
    .color-control { display: flex; gap: 8px; }
    .color-picker { width: 38px; height: 30px; flex-shrink: 0; box-sizing: border-box; overflow: hidden; background: var(--b3-theme-surface); border: 1px solid var(--b3-border-color); border-radius: 4px; }
    .color-picker.transparent { background-color: #fff; background-image: conic-gradient(#d8d8d8 25%, #fff 0 50%, #d8d8d8 0 75%, #fff 0); background-size: 10px 10px; }
    .color-picker:focus-within { border-color: var(--b3-theme-primary); outline: 1px solid var(--b3-theme-primary); }
    .color-picker input[type='color'] { display: block; width: 100%; height: 100%; box-sizing: border-box; margin: 0; padding: 2px; background: transparent; border: 0; cursor: pointer; }
    // 保留原生颜色选择器的点击和键盘交互，让底层棋盘格显示透明状态。
    .color-picker.transparent input[type='color'] { opacity: 0; }
    .color-control .b3-text-field { flex: 1; min-width: 0; }
    .editor-json { margin-top: 20px; }
    .editor-json summary { cursor: pointer; margin-bottom: 12px; }
    .editor-json textarea { width: 100%; box-sizing: border-box; resize: vertical; font-family: var(--b3-font-family-code); margin-bottom: 10px; }
    .editor-error { color: var(--b3-theme-error); }
</style>
