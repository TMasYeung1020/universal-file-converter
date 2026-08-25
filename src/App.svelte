<script lang="ts">
  // Top-level page: header + drop zone + file list. Each file is its own
  // FileCard so multiple conversions can run side by side.

  import DropZone from './lib/components/DropZone.svelte';
  import FileCard from './lib/components/FileCard.svelte';
  import ThemeToggle from './lib/components/ThemeToggle.svelte';
  import { ingestFile } from './lib/detect';
  import type { DetectedFile } from './lib/types';

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

<div class="page">
  <header class="topbar">
    <div class="brand">
      <span class="logo">🌐</span>
      <h1>Universal File Converter</h1>
    </div>
    <div class="topbar-right">
      <a
        class="gh"
        href="https://github.com/TMasYeung1020/universal-file-converter"
        target="_blank"
        rel="noreferrer"
        title="View source on GitHub"
      >
        GitHub
      </a>
      <ThemeToggle />
    </div>
  </header>

  <main class="main">
    <section class="hero">
      <h2>把任何文件转成别的格式</h2>
      <p class="lede">
        全部在你浏览器里跑，文件不会上传到任何服务器。文档、图片、数据格式全覆盖。
      </p>
    </section>

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
        <p>支持文档 (MD / HTML / DOCX / PDF / TXT) · 图片 (PNG / JPG / WebP / SVG) · 数据 (JSON / CSV / YAML / TOML / XML)</p>
      </div>
    {/if}
  </main>

  <footer class="foot">
    <span>纯前端 · 无服务器 · 100% 客户端转换</span>
  </footer>
</div>

<style>
  .page {
    max-width: 880px;
    margin: 0 auto;
    padding: 24px 20px 64px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 4px;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .logo {
    font-size: 26px;
  }

  .brand h1 {
    font-size: 18px;
    font-weight: 600;
    margin: 0;
    letter-spacing: -0.01em;
  }

  .topbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .gh {
    color: var(--text-muted);
    text-decoration: none;
    font-size: 14px;
    border: 1px solid var(--border);
    padding: 5px 12px;
    border-radius: var(--radius-sm);
    transition: color 0.15s ease, border-color 0.15s ease;
  }
  .gh:hover {
    color: var(--text);
    border-color: var(--accent);
  }

  .hero {
    text-align: center;
    padding: 16px 0 4px;
  }

  .hero h2 {
    margin: 0 0 6px;
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .lede {
    color: var(--text-muted);
    margin: 0;
    font-size: 15px;
  }

  .empty {
    text-align: center;
    color: var(--text-muted);
    font-size: 13px;
    padding: 12px 0;
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
  }

  .files-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px;
  }

  .files-head h3 {
    margin: 0;
    font-size: 14px;
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

  .foot {
    text-align: center;
    color: var(--text-muted);
    font-size: 12px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
  }
</style>