<script lang="ts">
  type DiffType = 'equal' | 'added' | 'removed';

  interface DiffLine {
    type: DiffType;
    text: string;
    lineNumLeft: number | null;
    lineNumRight: number | null;
  }

  let leftText = $state('');
  let rightText = $state('');
  let diffResult = $state<DiffLine[]>([]);
  let hasDiff = $state(false);

  const addedCount = $derived(diffResult.filter(l => l.type === 'added').length);
  const removedCount = $derived(diffResult.filter(l => l.type === 'removed').length);
  const equalCount = $derived(diffResult.filter(l => l.type === 'equal').length);

  function computeLCS(a: string[], b: string[]): number[][] {
    const m = a.length;
    const n = b.length;
    // For very large inputs cap the LCS to avoid blocking the main thread.
    // If either side exceeds 2000 lines we fall back to a trivial all-changed diff
    // (returned as an empty dp so the backtracker immediately hits the fallback branch).
    if (m > 2000 || n > 2000) {
      return Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    }
    const dp: number[][] = Array.from({ length: m + 1 }, () =>
      new Array(n + 1).fill(0)
    );
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] =
          a[i - 1] === b[j - 1]
            ? dp[i - 1][j - 1] + 1
            : Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
    return dp;
  }

  function buildDiff(a: string[], b: string[]): DiffLine[] {
    const dp = computeLCS(a, b);
    const ops: Array<{ type: DiffType; text: string }> = [];
    let i = a.length;
    let j = b.length;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
        ops.unshift({ type: 'equal', text: a[i - 1] });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        ops.unshift({ type: 'added', text: b[j - 1] });
        j--;
      } else {
        ops.unshift({ type: 'removed', text: a[i - 1] });
        i--;
      }
    }

    let ln = 1;
    let rn = 1;
    return ops.map(op => {
      const line: DiffLine = {
        type: op.type,
        text: op.text,
        lineNumLeft: op.type !== 'added' ? ln : null,
        lineNumRight: op.type !== 'removed' ? rn : null,
      };
      if (op.type !== 'added') ln++;
      if (op.type !== 'removed') rn++;
      return line;
    });
  }

  function runDiff(): void {
    const aLines = leftText.split('\n');
    const bLines = rightText.split('\n');
    diffResult = buildDiff(aLines, bLines);
    hasDiff = true;
  }

  function clearAll(): void {
    leftText = '';
    rightText = '';
    diffResult = [];
    hasDiff = false;
  }

  function prefixChar(type: DiffType): string {
    if (type === 'added') return '+';
    if (type === 'removed') return '-';
    return ' '; // non-breaking space so the column never collapses
  }
</script>

<div class="page-body">
  <div class="intro">
    <h2>文字 Diff 比对</h2>
    <p class="lede">对比两段文本，逐行高亮显示新增、删除与未变更内容。</p>
  </div>

  <div class="editor-card">
    <div class="textareas">
      <div class="textarea-col">
        <label class="col-label" for="left-input">原文</label>
        <textarea
          id="left-input"
          class="code-area"
          bind:value={leftText}
          placeholder="在此粘贴或输入原始文本…"
          spellcheck="false"
          autocomplete="off"
        ></textarea>
      </div>

      <div class="divider-v" aria-hidden="true"></div>

      <div class="textarea-col">
        <label class="col-label" for="right-input">新文</label>
        <textarea
          id="right-input"
          class="code-area"
          bind:value={rightText}
          placeholder="在此粘贴或输入新版文本…"
          spellcheck="false"
          autocomplete="off"
        ></textarea>
      </div>
    </div>

    <div class="toolbar">
      <button class="btn btn-primary" onclick={runDiff}>对比</button>
      <button class="btn btn-ghost" onclick={clearAll}>清空</button>
    </div>
  </div>

  {#if hasDiff}
    <div class="result-card">
      <div class="stats-bar" role="status" aria-live="polite">
        <span class="badge badge-added">+ {addedCount} 行新增</span>
        <span class="badge badge-removed">- {removedCount} 行删除</span>
        <span class="badge badge-equal">= {equalCount} 行不变</span>
      </div>

      {#if diffResult.length === 0}
        <p class="empty-note">两段文本完全一致。</p>
      {:else}
        <div class="diff-table" role="table" aria-label="Diff 结果">
          {#each diffResult as line}
            <div class="diff-row diff-row--{line.type}" role="row">
              <span class="cell ln-left" role="cell" aria-label="原文行号">
                {line.lineNumLeft ?? ''}
              </span>
              <span class="cell ln-right" role="cell" aria-label="新文行号">
                {line.lineNumRight ?? ''}
              </span>
              <span class="cell pfx" role="cell" aria-hidden="true">
                {prefixChar(line.type)}
              </span>
              <span class="cell line-text" role="cell">{line.text}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  /* ── Layout ─────────────────────────────────────────────── */
  .page-body {
    padding: 2rem 1.5rem 3rem;
    max-width: 1140px;
    margin: 0 auto;
  }

  .intro {
    text-align: center;
    margin-bottom: 2rem;
  }

  .intro h2 {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--text);
    margin: 0 0 0.5rem;
  }

  .lede {
    color: var(--text-muted);
    font-size: 1rem;
    margin: 0;
  }

  /* ── Editor card ─────────────────────────────────────────── */
  .editor-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1.25rem 1.25rem 1rem;
    box-shadow: var(--shadow-sm);
    margin-bottom: 1.5rem;
  }

  .textareas {
    display: grid;
    grid-template-columns: 1fr 1px 1fr;
    gap: 0 1rem;
    margin-bottom: 1rem;
  }

  .divider-v {
    background: var(--border);
    align-self: stretch;
  }

  .textarea-col {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .col-label {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-muted);
    user-select: none;
  }

  .code-area {
    width: 100%;
    min-height: 220px;
    padding: 0.75rem 0.875rem;
    font-family: 'JetBrains Mono', 'Cascadia Code', 'Fira Code', ui-monospace,
      monospace;
    font-size: 0.85rem;
    line-height: 1.65;
    color: var(--text);
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    resize: vertical;
    outline: none;
    transition: border-color 0.15s;
    box-sizing: border-box;
    caret-color: var(--accent);
  }

  .code-area:focus {
    border-color: var(--accent);
  }

  .code-area::placeholder {
    color: var(--text-muted);
    opacity: 0.55;
  }

  /* ── Toolbar ─────────────────────────────────────────────── */
  .toolbar {
    display: flex;
    gap: 0.625rem;
    align-items: center;
  }

  .btn {
    padding: 0.45rem 1.375rem;
    border-radius: var(--radius-sm);
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition:
      opacity 0.14s,
      background 0.14s;
    line-height: 1.4;
  }

  .btn:active {
    opacity: 0.8;
  }

  .btn-primary {
    background: var(--accent);
    color: #fff;
  }

  .btn-primary:hover {
    opacity: 0.88;
  }

  .btn-ghost {
    background: transparent;
    color: var(--text-muted);
    border: 1px solid var(--border);
  }

  .btn-ghost:hover {
    background: var(--bg-elevated);
    color: var(--text);
  }

  /* ── Result card ─────────────────────────────────────────── */
  .result-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
  }

  .stats-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.25rem;
    padding: 0.65rem 1rem;
    background: var(--bg-elevated);
    border-bottom: 1px solid var(--border);
  }

  .badge {
    font-size: 0.8125rem;
    font-weight: 600;
    letter-spacing: 0.01em;
  }

  .badge-added {
    color: var(--success);
  }

  .badge-removed {
    color: var(--error);
  }

  .badge-equal {
    color: var(--text-muted);
  }

  .empty-note {
    padding: 2rem 1.25rem;
    color: var(--text-muted);
    font-size: 0.9rem;
    text-align: center;
    margin: 0;
  }

  /* ── Diff table ──────────────────────────────────────────── */
  .diff-table {
    font-family: 'JetBrains Mono', 'Cascadia Code', 'Fira Code', ui-monospace,
      monospace;
    font-size: 0.8125rem;
    line-height: 1.55;
    overflow-x: auto;
  }

  .diff-row {
    display: grid;
    /* ln-left | ln-right | prefix | line-text */
    grid-template-columns: 3.25rem 3.25rem 1.75rem 1fr;
    align-items: baseline;
    min-width: 0;
  }

  .diff-row + .diff-row {
    border-top: 1px solid var(--border);
  }

  .diff-row--added {
    background: color-mix(in srgb, var(--success) 13%, transparent);
  }

  .diff-row--removed {
    background: color-mix(in srgb, var(--error) 13%, transparent);
  }

  .diff-row--equal {
    background: transparent;
  }

  /* Cells */
  .cell {
    display: block;
    padding: 0.2rem 0;
  }

  .ln-left,
  .ln-right {
    padding: 0.2rem 0.5rem;
    text-align: right;
    color: var(--text-muted);
    font-size: 0.72rem;
    opacity: 0.55;
    user-select: none;
    border-right: 1px solid var(--border);
    white-space: nowrap;
  }

  .pfx {
    padding: 0.2rem 0.3rem;
    text-align: center;
    font-weight: 700;
    user-select: none;
    border-right: 1px solid var(--border);
  }

  .diff-row--added .pfx {
    color: var(--success);
  }

  .diff-row--removed .pfx {
    color: var(--error);
  }

  .diff-row--equal .pfx {
    color: var(--text-muted);
    opacity: 0.3;
  }

  .line-text {
    padding: 0.2rem 0.75rem;
    white-space: pre;
    overflow: hidden;
    text-overflow: clip;
    min-width: 0;
  }

  .diff-row--added .line-text {
    color: color-mix(in srgb, var(--success) 80%, var(--text));
  }

  .diff-row--removed .line-text {
    color: color-mix(in srgb, var(--error) 80%, var(--text));
  }

  .diff-row--equal .line-text {
    color: var(--text);
  }

  /* ── Responsive ──────────────────────────────────────────── */
  @media (max-width: 640px) {
    .page-body {
      padding: 1.25rem 1rem 2.5rem;
    }

    .textareas {
      grid-template-columns: 1fr;
      gap: 1rem 0;
    }

    .divider-v {
      display: none;
    }

    .diff-row {
      grid-template-columns: 2.5rem 2.5rem 1.5rem 1fr;
    }

    .ln-left,
    .ln-right {
      font-size: 0.65rem;
      padding: 0.2rem 0.3rem;
    }
  }
</style>
