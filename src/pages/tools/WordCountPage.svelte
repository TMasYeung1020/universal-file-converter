<script lang="ts">
  // ── state ──────────────────────────────────────────────────────────────────
  let text = $state('');

  // ── derived statistics ─────────────────────────────────────────────────────
  const charWithSpaces = $derived(text.length);

  const charWithoutSpaces = $derived(text.replace(/\s/g, '').length);

  const wordCount = $derived(
    text.trim() === '' ? 0 : text.trim().split(/\s+/).length
  );

  const cjkCount = $derived(
    (text.match(/[一-鿿㐀-䶿]/g) ?? []).length
  );

  const lineCount = $derived(text === '' ? 0 : text.split('\n').length);

  const paragraphCount = $derived.by(() => {
    if (text.trim() === '') return 0;
    return text
      .split(/\n(?:\s*\n)+/)
      .filter((p) => p.trim() !== '').length;
  });

  const sentenceCount = $derived.by(() => {
    if (text.trim() === '') return 0;
    return text
      .split(/[.!?。！？…]+/)
      .filter((s) => s.trim() !== '').length;
  });

  const readingTime = $derived.by(() => {
    if (text.trim() === '') return '—';
    // Non-CJK token count: strip CJK then split on whitespace
    const nonCjkWords = text
      .replace(/[一-鿿㐀-䶿]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
    const mins = nonCjkWords / 200 + cjkCount / 400;
    if (mins < 0.5) return '< 1 分钟';
    return `约 ${Math.ceil(mins)} 分钟`;
  });

  // ── actions ────────────────────────────────────────────────────────────────
  async function handlePaste(): Promise<void> {
    try {
      text = await navigator.clipboard.readText();
    } catch {
      /* clipboard not available or permission denied */
    }
  }

  function handleClear(): void {
    text = '';
  }
</script>

<div class="page-body">
  <!-- intro -->
  <div class="intro">
    <h2>字数 &amp; 字符统计</h2>
    <p class="lede">粘贴或输入文本，即时获得字符数、单词数、段落数等详细统计。</p>
  </div>

  <!-- editor -->
  <div class="card editor-card">
    <div class="toolbar">
      <span class="toolbar-label">输入文本</span>
      <div class="toolbar-actions">
        <button class="btn-ghost" onclick={handlePaste} title="从剪贴板粘贴">
          粘贴
        </button>
        <button class="btn-ghost danger" onclick={handleClear} title="清空文本">
          清空
        </button>
      </div>
    </div>
    <textarea
      bind:value={text}
      aria-label="统计文本输入框"
      placeholder="在此输入或粘贴文本……"
      spellcheck="false"
    ></textarea>
  </div>

  <!-- stats grid -->
  <div class="stats-grid">
    <div class="stat-card">
      <span class="stat-label">字符数（含空格）</span>
      <span class="stat-value">{charWithSpaces.toLocaleString('zh-CN')}</span>
    </div>
    <div class="stat-card">
      <span class="stat-label">字符数（不含空格）</span>
      <span class="stat-value">{charWithoutSpaces.toLocaleString('zh-CN')}</span>
    </div>
    <div class="stat-card">
      <span class="stat-label">单词数</span>
      <span class="stat-value">{wordCount.toLocaleString('zh-CN')}</span>
    </div>
    <div class="stat-card">
      <span class="stat-label">中文字符数</span>
      <span class="stat-value">{cjkCount.toLocaleString('zh-CN')}</span>
    </div>
    <div class="stat-card">
      <span class="stat-label">行数</span>
      <span class="stat-value">{lineCount.toLocaleString('zh-CN')}</span>
    </div>
    <div class="stat-card">
      <span class="stat-label">段落数</span>
      <span class="stat-value">{paragraphCount.toLocaleString('zh-CN')}</span>
    </div>
    <div class="stat-card">
      <span class="stat-label">句子数</span>
      <span class="stat-value">{sentenceCount.toLocaleString('zh-CN')}</span>
    </div>
    <div class="stat-card accent-card">
      <span class="stat-label">预计阅读时间</span>
      <span class="stat-value time-value">{readingTime}</span>
    </div>
  </div>
</div>

<style>
  /* ── layout ──────────────────────────────────────────────────────────────── */
  .page-body {
    max-width: 860px;
    margin: 0 auto;
    padding: 2rem 1.25rem 4rem;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
  }

  /* ── intro ───────────────────────────────────────────────────────────────── */
  .intro {
    text-align: center;
  }

  .intro h2 {
    margin: 0 0 0.5rem;
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.01em;
  }

  .lede {
    margin: 0;
    color: var(--text-muted);
    font-size: 1rem;
    line-height: 1.6;
  }

  /* ── editor card ─────────────────────────────────────────────────────────── */
  .card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
  }

  .editor-card {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.625rem 1rem;
    border-bottom: 1px solid var(--border);
    background: var(--bg-elevated);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }

  .toolbar-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .toolbar-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-ghost {
    padding: 0.3rem 0.8rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-muted);
    font-size: 0.8125rem;
    font-family: inherit;
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s,
      border-color 0.15s;
    line-height: 1.4;
  }

  .btn-ghost:hover {
    background: var(--bg-card);
    color: var(--text);
    border-color: var(--text-muted);
  }

  .btn-ghost.danger:hover {
    border-color: var(--error);
    color: var(--error);
    background: transparent;
  }

  textarea {
    width: 100%;
    min-height: 260px;
    padding: 1rem;
    background: transparent;
    border: none;
    outline: none;
    resize: vertical;
    font-size: 1rem;
    line-height: 1.75;
    color: var(--text);
    font-family: inherit;
    box-sizing: border-box;
    border-radius: 0 0 var(--radius-lg) var(--radius-lg);
    display: block;
  }

  textarea::placeholder {
    color: var(--text-muted);
    opacity: 0.55;
  }

  /* ── stats grid ──────────────────────────────────────────────────────────── */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 0.875rem;
  }

  .stat-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    padding: 1rem 1.125rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    transition: box-shadow 0.15s;
  }

  .stat-card:hover {
    box-shadow:
      var(--shadow-sm),
      0 0 0 1px var(--border);
  }

  .stat-label {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-weight: 500;
    line-height: 1.35;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .stat-value {
    font-size: 1.875rem;
    font-weight: 700;
    color: var(--text);
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  /* accent card — reading time */
  .accent-card {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 7%, var(--bg-card));
  }

  .accent-card .stat-label {
    color: var(--accent);
    opacity: 0.85;
  }

  .accent-card .stat-value {
    color: var(--accent);
  }

  .time-value {
    font-size: 1.375rem;
  }

  /* ── responsive tweaks ───────────────────────────────────────────────────── */
  @media (max-width: 480px) {
    .page-body {
      padding: 1.25rem 1rem 3rem;
      gap: 1.25rem;
    }

    .intro h2 {
      font-size: 1.4rem;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .stat-value {
      font-size: 1.5rem;
    }
  }
</style>
