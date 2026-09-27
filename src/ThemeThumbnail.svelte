<script lang="ts">
    import type { ThemeConfig } from './utils/customThemes';
    export let config: ThemeConfig;
    export let name: string;
</script>

<svg width="180" height="73" viewBox="0 0 180 73" role="img" aria-label={name}>
    <rect width="180" height="73" rx="3" fill={config.backgroundColor} />
    <path d="M54 36H68V20H80M68 36V54H80M124 20H137" fill="none" stroke={config.lineColor} stroke-width="2" />
    {#each [{ key: 'root', x: 5, y: 26, width: 49, text: '根节点' }, { key: 'second', x: 80, y: 10, width: 44, text: '二级' }, { key: 'second', x: 80, y: 44, width: 44, text: '二级' }, { key: 'node', x: 137, y: 10, width: 38, text: '普通' }] as node}
        <rect x={node.x} y={node.y} width={node.width} height="20" rx="3"
            fill={config[node.key]?.fillColor} stroke={config[node.key]?.borderColor}
            stroke-width={config[node.key]?.borderWidth ? 1 : 0} />
        <text x={node.x + node.width / 2} y={node.y + 14} text-anchor="middle" font-size="10"
            font-family={config[node.key]?.fontFamily} fill={config[node.key]?.color}>{node.text}</text>
    {/each}
</svg>

<style>
    svg { flex-shrink: 0; border-radius: 3px; }
</style>
