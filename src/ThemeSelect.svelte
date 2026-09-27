<script lang="ts">
    import { createEventDispatcher, onDestroy, tick } from 'svelte';
    import { THEME_LIST } from './defaultSettings';
    import { getThemeImagePath } from './utils/themePreview';

    export let id: string;
    export let value: string;
    export let disabled = false;
    const dispatch = createEventDispatcher<{ changed: { value: string } }>();
    let open = false;
    let trigger: HTMLButtonElement;
    let menu: HTMLDivElement;
    let activeIndex = 0;
    let left = 0;
    let top = 0;
    let width = 320;
    let maxHeight = 400;
    let above = false;
    $: selectedTheme = THEME_LIST.find(theme => theme.value === value) ?? THEME_LIST[0];
    $: if (disabled && open) closeMenu();

    function positionMenu() {
        const rect = trigger.getBoundingClientRect();
        width = Math.min(Math.max(320, rect.width), window.innerWidth - 16);
        left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
        const below = window.innerHeight - rect.bottom - 12;
        const aboveSpace = rect.top - 12;
        above = below < 220 && aboveSpace > below;
        maxHeight = Math.max(80, Math.min(400, above ? aboveSpace : below));
        top = above ? rect.top - 4 : rect.bottom + 4;
    }

    function closeMenu() {
        open = false;
        document.removeEventListener('pointerdown', handleOutside);
        document.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', positionMenu);
    }

    function handleOutside(event: PointerEvent) {
        const target = event.target as Node;
        if (!trigger.contains(target) && !menu?.contains(target)) closeMenu();
    }

    function handleScroll(event: Event) {
        if (!menu?.contains(event.target as Node)) positionMenu();
    }

    async function toggleMenu() {
        if (open) { closeMenu(); return; }
        if (disabled || trigger.matches(':disabled')) return;
        activeIndex = Math.max(0, THEME_LIST.findIndex(theme => theme.value === value));
        positionMenu();
        open = true;
        document.addEventListener('pointerdown', handleOutside);
        document.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', positionMenu);
        await tick();
        menu?.focus({ preventScroll: true });
        revealActive();
    }

    function selectTheme(index: number) {
        const nextValue = THEME_LIST[index].value;
        closeMenu();
        trigger.focus({ preventScroll: true });
        // 由父组件确认并更新值，取消更换基础主题时保留原来的预览。
        if (nextValue !== value) dispatch('changed', { value: nextValue });
    }

    function revealActive() {
        menu?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
    }

    async function handleKeydown(event: KeyboardEvent) {
        event.stopPropagation();
        if (event.isComposing) return;
        if (event.key === 'Escape' || event.key === 'Tab') {
            if (event.key === 'Escape') event.preventDefault();
            closeMenu();
            trigger.focus({ preventScroll: true });
        } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            selectTheme(activeIndex);
        } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            activeIndex = event.key === 'Home' ? 0 : event.key === 'End' ? THEME_LIST.length - 1
                : Math.max(0, Math.min(THEME_LIST.length - 1, activeIndex + (event.key === 'ArrowDown' ? 1 : -1)));
            await tick();
            revealActive();
        }
    }

    // 避免设置面板的滚动容器裁切主题预览列表。
    function portal(node: HTMLElement) {
        document.body.appendChild(node);
        return { destroy: () => node.remove() };
    }
    onDestroy(closeMenu);
</script>

<button {id} type="button" class="theme-trigger" {disabled} bind:this={trigger}
    aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-list`} on:click={toggleMenu}>
    <img src={getThemeImagePath(selectedTheme.value)} alt="" />
    <span class="theme-name">{selectedTheme.name}</span>
    <svg class:open width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" />
    </svg>
</button>

{#if open}
    <div id={`${id}-list`} class="theme-menu" role="listbox" aria-label="基础主题" tabindex="0"
        aria-activedescendant={`${id}-option-${activeIndex}`} bind:this={menu} use:portal on:keydown={handleKeydown}
        style={`left:${left}px;top:${top}px;width:${width}px;max-height:${maxHeight}px;transform:translateY(${above ? '-100%' : '0'});`}>
        {#each THEME_LIST as theme, index (theme.value)}
            <button id={`${id}-option-${index}`} type="button" class="theme-option"
                class:active={index === activeIndex} data-active={index === activeIndex}
                role="option" aria-selected={theme.value === value} tabindex="-1" on:click={() => selectTheme(index)}>
                <img src={getThemeImagePath(theme.value)} alt="" loading="lazy" />
                <span class="theme-name">{theme.name}</span>
            </button>
        {/each}
    </div>
{/if}

<style>
    .theme-trigger, .theme-option { display: flex; align-items: center; gap: 10px; width: 100%; box-sizing: border-box; padding: 6px 10px; font: inherit; color: var(--b3-theme-on-surface); text-align: left; cursor: pointer; }
    .theme-trigger { border: 1px solid var(--b3-border-color); border-radius: 4px; background: var(--b3-theme-surface); }
    .theme-trigger:hover, .theme-trigger:focus-visible { border-color: var(--b3-theme-primary); }
    .theme-trigger:disabled { cursor: default; }
    img { width: 180px; max-width: 60%; height: 72.52px; object-fit: contain; border-radius: 3px; flex-shrink: 0; }
    .theme-name { flex: 1; min-width: 0; overflow-wrap: anywhere; font-size: 13px; }
    svg { flex-shrink: 0; transition: transform 0.2s; }
    svg.open { transform: rotate(180deg); }
    .theme-menu { position: fixed; z-index: 10000; overflow-y: auto; box-sizing: border-box; background: var(--b3-theme-surface); border: 1px solid var(--b3-border-color); border-radius: 4px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2); }
    .theme-option { padding: 8px 12px; border: 0; border-bottom: 1px solid var(--b3-theme-background); background: transparent; }
    .theme-option:last-child { border-bottom: 0; }
    .theme-option:hover, .theme-option.active { background: var(--b3-theme-background); }
    .theme-option[aria-selected='true'] { background: var(--b3-theme-primary-lightest); color: var(--b3-theme-primary); }
</style>
