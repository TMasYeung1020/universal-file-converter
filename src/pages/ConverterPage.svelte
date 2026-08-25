<script lang="ts">
  // The converter page — moved from the old App.svelte so the router can
  // load it as an independent route.

  import DropZone from '../lib/components/DropZone.svelte';
  import FileCard from '../lib/components/FileCard.svelte';
  import { ingestFile } from '../lib/detect';
  import type { DetectedFile } from '../lib/types';

  let files = $state<DetectedFile[]>([]);
  let unreadable = $state<string[]>([]);

  async function addFiles(picked: File[]) {
    const accepted: DetectedFile[] = [];
    const rejected: string[] = [];
    for (const f of picked) {
      const detected = await ingestFile(f);
      if (detected) accepted.push(detected);
      else rejected.push(f.name);
    }
    files = [...files, ...accepted];
    unreadable = [...unreadable, ...rejected];
  }

  function remove(idx: number) {
    files = files.filter((_, i) => i !== idx);
  }

  function clearAll() {
    files = [];
    unreadable = [];
  }
</script>

<div class="page-body">
  <div class="intro">
    <h2>万能文件格式转换</h2>
    <p class="lede">
      纯浏览器端处理 · 19 种格式 · 文件不上传任何服务器
    </p>
  </div>

  <DropZone onfiles={addFiles} />

  {#if unreadable.length > 0}
    <div class="warn">
      ⚠️ 不认识这几个格式: {unreadable.join(', ')}
      <button class="link" onclick={() => (unreadable = [])}>忽略</button>
    </div>
  {/if}

  {#if files.length > 0}
    <div class="files-head">
      <h3>{files.length} 个文件已就绪</h3>
      <button type="button" class="ghost" onclick={clearAll}>清空全部</button>
    </div>
    <div class="files">
      {#each files as f, i (i)}
        <FileCard file={f} onremove={() => remove(i)} />
      {/each}
    </div>
  {:else}
    <div class="empty">
      <p>
        支持 <strong>19 种格式</strong> · 文档 (MD/HTML/DOCX/PDF/TXT) · 图片 (PNG/JPG/WebP/SVG) · 数据 (JSON/CSV/YAML/TOML/XML)
        · 表格 (XLSX) · 演示 (PPTX) · 音频 (WAV/MP3)
      </p>
    </div>
  {/if}
</div>

<style>
  .page-body {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .intro {
    text-align: center;
    padding: 8px 0 4px;
  }

  .intro h2 {
    margin: 0 0 6px;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .lede {
    color: var(--text-muted);
    margin: 0;
    font-size: 14px;
  }

  .warn {
    background: color-mix(in srgb, #f59e0b 12%, transparent);
    color: #b45309;
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  :global(.dark) .warn {
    color: #fcd34d;
  }

  .link {
    background: transparent;
    border: 0;
    color: inherit;
    text-decoration: underline;
    font-size: 13px;
    cursor: pointer;
  }

  .files-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px;
  }

  .files-head h3 {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .ghost {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-muted);
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    cursor: pointer;
  }

  .ghost:hover {
    color: var(--text);
    border-color: var(--border-strong);
  }

  .files {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .empty {
    text-align: center;
    color: var(--text-muted);
    font-size: 13px;
    padding: 12px 0;
  }
</style>