<script lang="ts">
    import { onDestroy, tick } from 'svelte';
    import type { FontFamilyOption } from '@/utils/systemFonts';
    import { createEventDispatcher } from 'svelte';

    export let id: string;
    export let value = '';
    export let fonts: FontFamilyOption[] = [];
    export let loading = false;
    export let error = '';

    const dispatch = createEventDispatcher();
    let open = false;
    let query = '';
    let activeIndex = 0;
    let trigger: HTMLButtonElement;
    let searchInput: HTMLInputElement;
    let menu: HTMLDivElement;
    let left = 0;
    let top = 0;
    let width = 320;
    let maxHeight = 300;
    let menuAbove = false;

    $: options = [
        { value: '', label: '主题默认字体', searchText: '主题默认字体 default' },
        ...(value && !fonts.some(font => font.value === value)
            ? [{ value, label: value, searchText: value.toLocaleLowerCase() }]
            : []),
        ...fonts
    ];
    $: selectedLabel = options.find(font => font.value === value)?.label ?? value;
    $: filtered = options.filter(font => font.searchText.includes(query.trim().toLocaleLowerCase()));
    $: if (activeIndex >= filtered.length) activeIndex = Math.max(0, filtered.length - 1);

    function positionMenu() {
        const rect = trigger.getBoundingClientRect();
        width = Math.min(360, window.innerWidth - 16);
        left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
        const below = window.innerHeight - rect.bottom - 12;
        const above = rect.top - 12;
        const showAbove = below < 220 && above > below;
        maxHeight = Math.max(80, Math.min(340, showAbove ? above : below));
        top = showAbove ? rect.top - 4 : rect.bottom + 4;
        // 搜索结果减少时，向上展开的菜单仍紧贴触发按钮。
        menuAbove = showAbove;
    }

    function closeMenu() {
        open = false;
        document.removeEventListener('pointerdown', handleOutside);
        window.removeEventListener('resize', positionMenu);
        document.removeEventListener('scroll', handleScroll, true);
    }

    function handleOutside(event: PointerEvent) {
        const target = event.target as Node;
        if (!trigger.contains(target) && !menu?.contains(target)) closeMenu();
    }

    function handleScroll(event: Event) {
        if (!menu?.contains(event.target as Node)) positionMenu();
    }

    async function toggleMenu() {
        if (open) {
            closeMenu();
            return;
        }
        query = '';
        activeIndex = 0;
        positionMenu();
        open = true;
        document.addEventListener('pointerdown', handleOutside);
        window.addEventListener('resize', positionMenu);
        document.addEventListener('scroll', handleScroll, true);
        await tick();
        searchInput?.focus();
    }

    function selectFont(font: FontFamilyOption) {
        value = font.value;
        dispatch('changed', { key: id, value });
        closeMenu();
        trigger.focus();
    }

    async function handleKeydown(event: KeyboardEvent) {
        event.stopPropagation();
        if (event.isComposing) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            closeMenu();
            trigger.focus();
        } else if (event.key === 'Tab') {
            closeMenu();
            trigger.focus();
        } else if (event.key === 'Enter' && filtered[activeIndex]) {
            event.preventDefault();
            selectFont(filtered[activeIndex]);
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            activeIndex = Math.max(0, Math.min(filtered.length - 1, activeIndex + (event.key === 'ArrowDown' ? 1 : -1)));
            await tick();
            menu?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
        }
    }

    // 菜单挂到 body，避免设置面板的滚动容器裁切下拉列表。
    function portal(node: HTMLElement) {
        document.body.appendChild(node);
        return { destroy: () => node.remove() };
    }

    onDestroy(closeMenu);
</script>

<button
    type="button"
    class="b3-select font-trigger"
    bind:this={trigger}
    aria-label="选择字体"
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-controls={`${id}-list`}
    title={selectedLabel}
    on:click={toggleMenu}
>
    {selectedLabel}
</button>

{#if open}
    <div
        class="font-menu"
        bind:this={menu}
        use:portal
        style={`left:${left}px;top:${top}px;width:${width}px;max-height:${maxHeight}px;transform:translateY(${menuAbove ? '-100%' : '0'});`}
    >
        <input
            class="b3-text-field font-search"
            bind:this={searchInput}
            bind:value={query}
            placeholder="搜索字体名称…"
            aria-label="搜索字体"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls={`${id}-list`}
            aria-activedescendant={filtered.length ? `${id}-option-${activeIndex}` : undefined}
            spellcheck="false"
            on:input={() => activeIndex = 0}
            on:keydown={handleKeydown}
        />
        {#if loading}
            <div class="font-status" role="status">正在读取系统字体…</div>
        {:else if error}
            <div class="font-status" role="status">
                {error}
                <button type="button" class="b3-button b3-button--outline" on:click={() => dispatch('retry')}>重试</button>
            </div>
        {/if}
        <div class="font-list" id={`${id}-list`} role="listbox" aria-label="字体列表">
            {#each filtered as font, index (font.value)}
                <button
                    type="button"
                    id={`${id}-option-${index}`}
                    class="font-option"
                    class:active={index === activeIndex}
                    data-active={index === activeIndex}
                    role="option"
                    aria-selected={font.value === value}
                    tabindex="-1"
                    on:click={() => selectFont(font)}
                >
                    <span>{font.label}</span><span>{font.value === value ? '✓' : ''}</span>
                </button>
            {:else}
                <div class="font-status">没有匹配的字体</div>
            {/each}
        </div>
    </div>
{/if}

<style>
    .font-trigger { width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; }
    .font-menu { position: fixed; z-index: 10000; display: flex; flex-direction: column; box-sizing: border-box; padding: 8px; border: 1px solid var(--b3-border-color); border-radius: 6px; background: var(--b3-theme-background); color: var(--b3-theme-on-background); box-shadow: var(--b3-dialog-shadow); }
    .font-search { width: 100%; box-sizing: border-box; flex-shrink: 0; margin-bottom: 8px; }
    .font-list { overflow-y: auto; min-height: 0; }
    .font-option { display: flex; justify-content: space-between; gap: 12px; width: 100%; border: 0; border-radius: 4px; background: transparent; color: inherit; padding: 7px 10px; text-align: left; cursor: pointer; font: inherit; overflow-wrap: anywhere; }
    .font-option:hover, .font-option.active { background: var(--b3-theme-primary-lightest); }
    .font-option[aria-selected="true"] { color: var(--b3-theme-primary); }
    .font-status { padding: 8px; font-size: 12px; color: var(--b3-theme-on-surface); }
</style>
