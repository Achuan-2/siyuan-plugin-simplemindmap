<script lang="ts">
    import { onMount } from 'svelte';
    import SettingPanel from '@/libs/components/setting-panel.svelte';
    import { getDefaultSettings } from './defaultSettings';
    import { confirm } from 'siyuan';
    import { pushMsg } from './api';
    export let plugin;

    // 使用动态默认设置
    let settings = { ...getDefaultSettings() };

    interface ISettingGroup {
        name: string;
        items: ISettingItem[];
    }

    // 可用的思维导图主题列表
    const THEME_LIST = [
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
        { value: 'dark', name: '暗色' },
        { value: 'dark2', name: '暗色2' },
        { value: 'dark3', name: '暗色3' },
        { value: 'dark4', name: '暗色4' },
        { value: 'blackHumour', name: '黑色幽默' },
        { value: 'lateNightOffice', name: '深夜办公室' },
        { value: 'blackGold', name: '黑金' }
    ];

    // 可用的思维导图结构列表
    const LAYOUT_LIST = [
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

    // 彩虹线条配置列表（包含完整颜色信息）
    const RAINBOW_LINES_OPTIONS = [
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

    // 构建主题选项对象
    const themeOptions = {};
    THEME_LIST.forEach(theme => {
        themeOptions[theme.value] = theme.name;
    });

    let groups: ISettingGroup[] = [
        {
            name: '📝基础设置',
            items: [
                {
                    key: 'labelDisplay',
                    value: settings.labelDisplay,
                    type: 'select',
                    title: '标签显示',
                    description: '控制思维导图标签的显示方式',
                    options: {
                        noLabel: '不显示标签',
                        showLabelAlways: '始终显示标签',
                        showLabelOnHover: '悬停时显示标签'
                    }
                },
                {
                    key: 'embedImageFormat',
                    value: settings.embedImageFormat,
                    type: 'select',
                    title: '嵌入图片格式',
                    description: '新建思维导图时使用的图片格式',
                    options: {
                        svg: 'SVG',
                        png: 'PNG'
                    }
                },
                {
                    key: 'editWindow',
                    value: settings.editWindow,
                    type: 'select',
                    title: '编辑窗口',
                    description: '选择编辑思维导图时使用的窗口类型',
                    options: {
                        dialog: '对话框',
                        tab: '标签页'
                    }
                }
            ]
        },
        {
            name: '🎨导图样式设置',
            items: [
                {
                    key: 'defaultTheme',
                    value: settings.defaultTheme,
                    type: 'custom',
                    title: '默认主题',
                    description: '新建思维导图时使用的默认主题',
                    direction: 'row'
                },
                {
                    key: 'defaultLayout',
                    value: settings.defaultLayout,
                    type: 'custom',
                    title: '默认结构',
                    description: '新建思维导图时使用的默认结构',
                    direction: 'row'
                },
                {
                    key: 'themeConfig',
                    value: settings.themeConfig,
                    type: 'textarea',
                    title: '主题配置',
                    description: '自定义主题配置（JSON格式）',
                    direction: 'row',
                    rows: 10,
                    placeholder: '输入JSON格式的主题配置'
                },
                {
                    key: 'defaultRainbowLines',
                    value: settings.defaultRainbowLines,
                    type: 'custom',
                    title: '默认彩虹线条',
                    description: '新建思维导图时默认使用的彩虹线条样式',
                    direction: 'row'
                }
            ]
        },
        {
            name: '⚙️全局思维导图设置',
            items: [
                {
                    key: 'globalMindmapSetting',
                    value: settings.globalMindmapSetting,
                    type: 'textarea',
                    title: '全局思维导图设置',
                    description: '全局默认的思维导图配置（JSON格式），可配置水印、性能模式等选项，优先级低于块属性设置，可以从设置好的导图块的mindmap-setting属性复制',
                    direction: 'row',
                    rows: 10,
                    placeholder: '{}'
                },
            ],
        },
        {
            name: '🔄重置设置',
            items: [
                {
                    key: 'reset',
                    value: '',
                    type: 'button',
                    title: '重置所有设置',
                    description: '将所有设置恢复为默认值',
                    button: {
                        label: '重置设置',
                        callback: async () => {
                            confirm(
                                '重置设置',
                                '确定要将所有设置恢复为默认值吗？此操作无法撤销。',
                                async () => {
                                    // 确认回调
                                    settings = { ...getDefaultSettings() };
                                    updateGroupItems();
                                    await saveSettings();
                                    await pushMsg('设置已重置为默认值');
                                },
                                () => {
                                    // 取消回调（可选）
                                    console.log('Reset cancelled');
                                }
                            );
                        },
                    },
                },
            ],
        },
        {
            name: '❤️用爱发电',
            items: [
                {
                    key: 'donateInfo',
                    value: '',
                    type: 'hint',
                    title: '用爱发电',
                    description: `
                        <p style="margin-top:12px;">如果喜欢我的插件，欢迎给GitHub仓库点star和微信赞赏，这会激励我继续完善此插件和开发新插件。</p>

                        <p style="margin-top:12px;">维护插件费时费力，个人时间和精力有限，开源只是分享，不等于我要浪费我的时间免费帮用户实现ta需要的功能，</p>

                        <p style="margin-top:12px;">我需要的功能我会慢慢改进（打赏可以催更），有些我觉得可以改进、但是现阶段不必要的功能需要打赏才改进（会标注打赏标签和需要打赏金额），而不需要的功能、实现很麻烦的功能会直接关闭issue不考虑实现，我没实现的功能欢迎有大佬来pr</p>

                        <p style="margin-top:12px;">累积赞赏50元的朋友如果想加我微信，可以在赞赏的时候备注微信号，或者发邮件到<a href="mailto:achuan-2@outlook.com">achuan-2@outlook.com</a>来进行好友申请</p>

                        <div style="margin-top:12px;">
                            <img src="plugins/siyuan-plugin-simplemindmap/assets/donate.png" alt="donate" style="max-width:260px; height:auto; border:1px solid var(--b3-border-color);"/>
                        </div>
                    `,
                },
            ],
        }
    ];

    let focusGroup = groups[0].name;
    let rainbowDropdownOpen = false;
    let dropdownTrigger: HTMLElement;
    let themeDropdownOpen = false;
    let themeDropdownTrigger: HTMLElement;

    interface ChangeEvent {
        group: string;
        key: string;
        value: any;
    }

    const onChanged = ({ detail }: CustomEvent<ChangeEvent>) => {
        console.log(detail.key, detail.value);
        const setting = settings[detail.key];
        if (setting !== undefined) {
            settings = { ...settings, [detail.key]: detail.value };
            saveSettings();
        }
    };

    async function saveSettings() {
        await plugin.saveSettings(settings);
    }

    onMount(async () => {
        await runload();
        // Close dropdown when clicking outside
        document.addEventListener('click', handleClickOutside);
    });

    function handleClickOutside(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (!target.closest('.rainbow-dropdown-container')) {
            rainbowDropdownOpen = false;
        }
        if (!target.closest('.theme-dropdown-container')) {
            themeDropdownOpen = false;
        }
        if (!target.closest('.layout-dropdown-container')) {
            layoutDropdownOpen = false;
        }
    }

    async function runload() {
        const loadedSettings = await plugin.loadSettings();
        settings = { ...loadedSettings };
        updateGroupItems();
        // 确保设置已保存（可能包含新的默认值）
        await saveSettings();
        console.debug('加载配置文件完成');
    }

    function updateGroupItems() {
        groups = groups.map(group => ({
            ...group,
            items: group.items.map(item => ({
                ...item,
                value: settings[item.key] ?? item.value,
            })),
        }));
    }

    function selectRainbowOption(value: string) {
        settings = { ...settings, defaultRainbowLines: value };
        rainbowDropdownOpen = false;
        saveSettings();
    }

    $: selectedRainbowOption = RAINBOW_LINES_OPTIONS.find(opt => opt.value === settings.defaultRainbowLines) || RAINBOW_LINES_OPTIONS[0];

    function selectThemeOption(value: string) {
        settings = { ...settings, defaultTheme: value };
        themeDropdownOpen = false;
        saveSettings();
    }

    $: selectedThemeOption = THEME_LIST.find(opt => opt.value === settings.defaultTheme) || THEME_LIST[0];

    function getThemeImagePath(themeValue: string): string {
        // classic8-15 使用 PNG 格式，其他使用 JPG 格式
        const pngThemes = ['classic8', 'classic9', 'classic10', 'classic11', 'classic12', 'classic13', 'classic14', 'classic15'];
        const extension = pngThemes.includes(themeValue) ? 'png' : 'jpg';
        return `plugins/siyuan-plugin-simplemindmap/mindmap-embed/dist/img/${themeValue}.${extension}`;
    }

    let layoutDropdownOpen = false;
    let layoutDropdownTrigger: HTMLElement;

    function selectLayoutOption(value: string) {
        settings = { ...settings, defaultLayout: value };
        layoutDropdownOpen = false;
        saveSettings();
    }

    $: selectedLayoutOption = LAYOUT_LIST.find(opt => opt.value === settings.defaultLayout) || LAYOUT_LIST[0];

    function getLayoutImagePath(layoutValue: string): string {
        return `plugins/siyuan-plugin-simplemindmap/mindmap-embed/dist/img/${layoutValue}.jpg`;
    }

    $: currentGroup = groups.find(group => group.name === focusGroup);
</script>

<div class="fn__flex-1 fn__flex config__panel">
    <ul class="b3-tab-bar b3-list b3-list--background">
        {#each groups as group}
            <li
                data-name="editor"
                class:b3-list-item--focus={group.name === focusGroup}
                class="b3-list-item"
                on:click={() => {
                    focusGroup = group.name;
                }}
                on:keydown={() => {}}
            >
                <span class="b3-list-item__text">{group.name}</span>
            </li>
        {/each}
    </ul>
    <div class="config__tab-wrap">
        {#if currentGroup}
            <div class="config__tab-container-plugin" data-name={currentGroup.name}>
                {#each currentGroup.items as item (item.key)}
                    {#if item.key === 'defaultTheme'}
                        <!-- Custom Theme Dropdown Selector -->
                        <div class="fn__flex b3-label config__item">
                            <div class="fn__flex-1">
                                <div class="fn__block">{item.title}</div>
                                {#if item.description}
                                    <div class="b3-label__text">{item.description}</div>
                                {/if}
                            </div>
                            <span class="fn__space"></span>
                            <div class="theme-dropdown-container fn__flex-center fn__size200">
                                <div 
                                    class="theme-dropdown-trigger"
                                    bind:this={themeDropdownTrigger}
                                    on:click|stopPropagation={() => themeDropdownOpen = !themeDropdownOpen}
                                    on:keydown={() => {}}
                                    role="button"
                                    tabindex="0"
                                >
                                    <img 
                                        src={getThemeImagePath(selectedThemeOption.value)} 
                                        alt={selectedThemeOption.name}
                                        class="theme-preview-img"
                                    />
                                    <span class="theme-preview-text">
                                        {selectedThemeOption.name}
                                        <svg class="dropdown-arrow" class:open={themeDropdownOpen} width="12" height="12" viewBox="0 0 12 12">
                                            <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                                        </svg>
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Theme dropdown menu rendered at body level -->
                        {#if themeDropdownOpen && themeDropdownTrigger}
                            <div 
                                class="theme-dropdown-menu"
                                style="
                                    left: {themeDropdownTrigger.getBoundingClientRect().left}px;
                                    top: {themeDropdownTrigger.getBoundingClientRect().bottom + 4}px;
                                    width: {themeDropdownTrigger.getBoundingClientRect().width}px;
                                "
                            >
                                {#each THEME_LIST as theme}
                                    <div 
                                        class="theme-dropdown-item" 
                                        class:selected={settings.defaultTheme === theme.value}
                                        on:click|stopPropagation={() => selectThemeOption(theme.value)}
                                        on:keydown={() => {}}
                                        role="button"
                                        tabindex="0"
                                    >
                                        <img 
                                            src={getThemeImagePath(theme.value)} 
                                            alt={theme.name}
                                            class="theme-item-img"
                                        />
                                        <span class="theme-item-name">{theme.name}</span>
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    {:else if item.key === 'defaultLayout'}
                        <!-- Custom Layout Dropdown Selector -->
                        <div class="fn__flex b3-label config__item">
                            <div class="fn__flex-1">
                                <div class="fn__block">{item.title}</div>
                                {#if item.description}
                                    <div class="b3-label__text">{item.description}</div>
                                {/if}
                            </div>
                            <span class="fn__space"></span>
                            <div class="layout-dropdown-container fn__flex-center fn__size200">
                                <div 
                                    class="layout-dropdown-trigger"
                                    bind:this={layoutDropdownTrigger}
                                    on:click|stopPropagation={() => layoutDropdownOpen = !layoutDropdownOpen}
                                    on:keydown={() => {}}
                                    role="button"
                                    tabindex="0"
                                >
                                    <img 
                                        src={getLayoutImagePath(selectedLayoutOption.value)} 
                                        alt={selectedLayoutOption.name}
                                        class="layout-preview-img"
                                    />
                                    <span class="layout-preview-text">
                                        {selectedLayoutOption.name}
                                        <svg class="dropdown-arrow" class:open={layoutDropdownOpen} width="12" height="12" viewBox="0 0 12 12">
                                            <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                                        </svg>
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Layout dropdown menu rendered at body level -->
                        {#if layoutDropdownOpen && layoutDropdownTrigger}
                            <div 
                                class="layout-dropdown-menu"
                                style="
                                    left: {layoutDropdownTrigger.getBoundingClientRect().left}px;
                                    top: {layoutDropdownTrigger.getBoundingClientRect().bottom + 4}px;
                                    width: {layoutDropdownTrigger.getBoundingClientRect().width}px;
                                "
                            >
                                {#each LAYOUT_LIST as layout}
                                    <div 
                                        class="layout-dropdown-item" 
                                        class:selected={settings.defaultLayout === layout.value}
                                        on:click|stopPropagation={() => selectLayoutOption(layout.value)}
                                        on:keydown={() => {}}
                                        role="button"
                                        tabindex="0"
                                    >
                                        <img 
                                            src={getLayoutImagePath(layout.value)} 
                                            alt={layout.name}
                                            class="layout-item-img"
                                        />
                                        <span class="layout-item-name">{layout.name}</span>
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    {:else if item.key === 'defaultRainbowLines'}
                        <!-- Custom Rainbow Lines Dropdown Selector -->
                        <div class="fn__flex b3-label config__item">
                            <div class="fn__flex-1">
                                <div class="fn__block">{item.title}</div>
                                {#if item.description}
                                    <div class="b3-label__text">{item.description}</div>
                                {/if}
                            </div>
                            <span class="fn__space"></span>
                            <div class="rainbow-dropdown-container fn__flex-center fn__size200">
                                <div 
                                    class="rainbow-dropdown-trigger"
                                    bind:this={dropdownTrigger}
                                    on:click|stopPropagation={() => rainbowDropdownOpen = !rainbowDropdownOpen}
                                    on:keydown={() => {}}
                                    role="button"
                                    tabindex="0"
                                >
                                    {#if selectedRainbowOption.list}
                                        <div class="rainbow-preview">
                                            {#each selectedRainbowOption.list as color}
                                                <span class="color-preview-item" style="background-color: {color};"></span>
                                            {/each}
                                        </div>
                                    {:else}
                                        <span class="rainbow-preview-text">{selectedRainbowOption.name}</span>
                                    {/if}
                                    <svg class="dropdown-arrow" class:open={rainbowDropdownOpen} width="12" height="12" viewBox="0 0 12 12">
                                        <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                                    </svg>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Dropdown menu rendered at body level -->
                        {#if rainbowDropdownOpen && dropdownTrigger}
                            <div 
                                class="rainbow-dropdown-menu"
                                style="
                                    left: {dropdownTrigger.getBoundingClientRect().left}px;
                                    bottom: {window.innerHeight - dropdownTrigger.getBoundingClientRect().top + 4}px;
                                    width: {dropdownTrigger.getBoundingClientRect().width}px;
                                "
                            >
                                {#each RAINBOW_LINES_OPTIONS as option}
                                    <div 
                                        class="rainbow-dropdown-item" 
                                        class:selected={settings.defaultRainbowLines === option.value}
                                        on:click|stopPropagation={() => selectRainbowOption(option.value)}
                                        on:keydown={() => {}}
                                        role="button"
                                        tabindex="0"
                                    >
                                        <span class="rainbow-item-name">{option.name}</span>
                                        {#if option.list}
                                            <div class="rainbow-item-preview">
                                                {#each option.list as color}
                                                    <span class="color-preview-item" style="background-color: {color};"></span>
                                                {/each}
                                            </div>
                                        {:else}
                                            <div class="rainbow-item-preview-empty">-</div>
                                        {/if}
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    {:else}
                        <!-- Standard Form Items -->
                        <SettingPanel
                            group={currentGroup.name}
                            settingItems={[item]}
                            display={true}
                            on:changed={onChanged}
                        />
                    {/if}
                {/each}
            </div>
        {/if}
    </div>
</div>

<style lang="scss">
    .config__panel {
        height: 100%;
        display: flex;
        flex-direction: row;
        overflow: hidden;
    }
    .config__panel > .b3-tab-bar {
        width: 170px;
    }

    .config__tab-wrap {
        flex: 1;
        height: 100%;
        overflow: auto;
        padding: 2px;
    }

    /* Theme Dropdown Styles */
    .theme-dropdown-container {
        position: relative;
        width: 300px;
    }

    .theme-dropdown-trigger {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        background: var(--b3-theme-surface);
        border: 1px solid var(--b3-border-color);
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
        width: 100%;

        &:hover {
            border-color: var(--b3-theme-primary);
            background: var(--b3-theme-background);
        }
    }

    .theme-preview-img {
        width: 180px;
        height: 72.52px;
        object-fit: contain;
        border-radius: 3px;
        flex-shrink: 0;
    }

    .theme-preview-text {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 13px;
        color: var(--b3-theme-on-surface);
    }

    .theme-dropdown-menu {
        position: fixed;
        max-height: 400px;
        overflow-y: auto;
        background: var(--b3-theme-surface);
        border: 1px solid var(--b3-border-color);
        border-radius: 4px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        z-index: 9999;
        animation: dropdownFadeIn 0.15s ease;
    }

    .theme-dropdown-item {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        cursor: pointer;
        transition: all 0.15s;
        border-bottom: 1px solid var(--b3-theme-background);

        &:last-child {
            border-bottom: none;
        }

        &:hover {
            background: var(--b3-theme-background);
            
            .theme-item-img {
                transform: scale(1.02);
            }
        }

        &.selected {
            background: var(--b3-theme-primary-lightest);
            
            .theme-item-name {
                color: var(--b3-theme-primary);
                font-weight: 500;
            }
        }
    }

    .theme-item-img {
        width: 180px;
        height: 72.52px;
        object-fit: contain;
        border-radius: 3px;
        flex-shrink: 0;
        transition: transform 0.2s;
    }

    .theme-item-name {
        flex: 1;
        font-size: 13px;
        color: var(--b3-theme-on-surface);
    }


    /* Layout Dropdown Styles */
    .layout-dropdown-container {
        position: relative;
        width: 300px;
    }

    .layout-dropdown-trigger {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        background: var(--b3-theme-surface);
        border: 1px solid var(--b3-border-color);
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
        width: 100%;

        &:hover {
            border-color: var(--b3-theme-primary);
            background: var(--b3-theme-background);
        }
    }

    .layout-preview-img {
        width: 180px;
        height: 72.52px;
        object-fit: contain;
        border-radius: 3px;
        flex-shrink: 0;
    }

    .layout-preview-text {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 13px;
        color: var(--b3-theme-on-surface);
    }

    .layout-dropdown-menu {
        position: fixed;
        max-height: 400px;
        overflow-y: auto;
        background: var(--b3-theme-surface);
        border: 1px solid var(--b3-border-color);
        border-radius: 4px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        z-index: 9999;
        animation: dropdownFadeIn 0.15s ease;
    }

    .layout-dropdown-item {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        cursor: pointer;
        transition: all 0.15s;
        border-bottom: 1px solid var(--b3-theme-background);

        &:last-child {
            border-bottom: none;
        }

        &:hover {
            background: var(--b3-theme-background);
            
            .layout-item-img {
                transform: scale(1.02);
            }
        }

        &.selected {
            background: var(--b3-theme-primary-lightest);
            
            .layout-item-name {
                color: var(--b3-theme-primary);
                font-weight: 500;
            }
        }
    }

    .layout-item-img {
        width: 180px;
        height: 72.52px;
        object-fit: contain;
        border-radius: 3px;
        flex-shrink: 0;
        transition: transform 0.2s;
    }

    .layout-item-name {
        flex: 1;
        font-size: 13px;
        color: var(--b3-theme-on-surface);
    }


    /* Rainbow Lines Dropdown Styles */
    .rainbow-dropdown-container {
        position: relative;
        width: 200px;
    }

    .rainbow-dropdown-trigger {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 6px 10px;
        background: var(--b3-theme-surface);
        border: 1px solid var(--b3-border-color);
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
        width: 100%;

        &:hover {
            border-color: var(--b3-theme-primary);
            background: var(--b3-theme-background);
        }
    }

    .rainbow-preview {
        display: flex;
        flex: 1;
        height: 20px;
        border-radius: 3px;
        overflow: hidden;
    }

    .rainbow-preview-text {
        flex: 1;
        font-size: 13px;
        color: var(--b3-theme-on-surface);
    }

    .color-preview-item {
        flex: 1;
        min-width: 4px;
    }

    .dropdown-arrow {
        flex-shrink: 0;
        transition: transform 0.2s;
        color: var(--b3-theme-on-surface);

        &.open {
            transform: rotate(180deg);
        }
    }

    .rainbow-dropdown-menu {
        position: fixed;
        max-height: 280px;
        overflow-y: auto;
        background: var(--b3-theme-surface);
        border: 1px solid var(--b3-border-color);
        border-radius: 4px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        z-index: 9999;
        animation: dropdownFadeIn 0.15s ease;
    }

    @keyframes dropdownFadeIn {
        from {
            opacity: 0;
            transform: translateY(-4px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .rainbow-dropdown-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        cursor: pointer;
        transition: all 0.15s;
        border-bottom: 1px solid var(--b3-theme-background);

        &:last-child {
            border-bottom: none;
        }

        &:hover {
            background: var(--b3-theme-background);
        }

        &.selected {
            background: var(--b3-theme-primary-lightest);
            
            .rainbow-item-name {
                color: var(--b3-theme-primary);
                font-weight: 500;
            }
        }
    }

    .rainbow-item-name {
        min-width: 50px;
        font-size: 13px;
        color: var(--b3-theme-on-surface);
    }

    .rainbow-item-preview {
        display: flex;
        flex: 1;
        height: 18px;
        border-radius: 3px;
        overflow: hidden;
    }

    .rainbow-item-preview-empty {
        flex: 1;
        text-align: center;
        color: var(--b3-theme-on-surface-light);
        font-size: 12px;
    }
</style>
