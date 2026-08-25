<script lang="ts">
  let pattern = $state('');
  let flagG = $state(true);
  let flagI = $state(false);
  let flagM = $state(false);
  let flagS = $state(false);
  let flagU = $state(false);
  let testText = $state('');
  let replacement = $state('');
  let replaceResult = $state<string | null>(null);
  let copied = $state(false);

  interface MatchInfo {
    fullMatch: string;
    index: number;
    end: number;
    groups: (string | undefined)[];
  }

  let patternError: string | null = $derived.by(() => {
    if (!pattern) return null;
    try {
      new RegExp(pattern, 'g' + (flagI ? 'i' : '') + (flagM ? 'm' : '') + (flagS ? 's' : '') + (flagU ? 'u' : ''));
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  });

  let matches: MatchInfo[] = $derived.by(() => {
    if (!pattern || patternError !== null || !testText) return [];
    try {
      const f = 'g' + (flagI ? 'i' : '') + (flagM ? 'm' : '') + (flagS ? 's' : '') + (flagU ? 'u' : '');
      const re = new RegExp(pattern, f);
      const results: MatchInfo[] = [];
      let m: RegExpExecArray | null;
      while ((m = re.exec(testText)) !== null) {
        results.push({
          fullMatch: m[0],
          index: m.index,
          end: m.index + m[0].length,
          groups: Array.from({ length: m.length - 1 }, (_, i) => m![i + 1]),
        });
        if (!flagG) break;
        if (m[0].length === 0) re.lastIndex++;
      }
      return results;
    } catch {
      return [];
    }
  });

  function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  let highlightedHtml: string = $derived.by(() => {
    if (!testText) return '';
    if (!matches.length) return escapeHtml(testText);
    let out = '';
    let cursor = 0;
    for (const m of matches) {
      if (m.index < cursor) continue;
      out += escapeHtml(testText.slice(cursor, m.index));
      out += `<mark class="hl">${escapeHtml(m.fullMatch)}</mark>`;
      cursor = m.end;
    }
    out += escapeHtml(testText.slice(cursor));
    return out;
  });

  function doReplace() {
    if (!pattern || patternError !== null || !testText) return;
    try {
      const f = (flagG ? 'g' : '') + (flagI ? 'i' : '') + (flagM ? 'm' : '') + (flagS ? 's' : '') + (flagU ? 'u' : '');
      replaceResult = testText.replace(new RegExp(pattern, f), replacement);
    } catch { /* guarded by patternError */ }
  }

  async function copyResult() {
    if (replaceResult == null) return;
    try {
      await navigator.clipboard.writeText(replaceResult);
      copied = true;
      setTimeout(() => { copied = false; }, 1800);
    } catch { /* clipboard unavailable */ }
  }
</script>

<div class="page-body">
  <div class="intro">
    <h2>正規表達式測試器</h2>
    <p class="lede">純瀏覽器端 · 即時匹配高亮 · 捕獲組 · 替換功能</p>
  </div>

  <!-- Pattern -->
  <div class="card">
    <div class="section-label">表達式</div>
    <div class="pattern-row">
      <span class="delim">/</span>
      <input
        class="pattern-input"
        class:is-error={!!patternError}
        type="text"
        placeholder="輸入正規 pattern（不含斜線）"
        bind:value={pattern}
        spellcheck="false"
        autocomplete="off"
      />
      <span class="delim">/</span>
      <div class="flags">
        <label class="flag-pill" class:active={flagG}><input type="checkbox" bind:checked={flagG} />g</label>
        <label class="flag-pill" class:active={flagI}><input type="checkbox" bind:checked={flagI} />i</label>
        <label class="flag-pill" class:active={flagM}><input type="checkbox" bind:checked={flagM} />m</label>
        <label class="flag-pill" class:active={flagS}><input type="checkbox" bind:checked={flagS} />s</label>
        <label class="flag-pill" class:active={flagU}><input type="checkbox" bind:checked={flagU} />u</label>
      </div>
    </div>
    {#if patternError}
      <p class="status-msg err-msg">⚠ {patternError}</p>
    {:else if pattern}
      <p class="status-msg ok-msg">✓ 正規有效</p>
    {/if}
  </div>

  <!-- Test text + mirror -->
  <div class="card">
    <div class="section-label">測試文字</div>
    <textarea class="test-area" placeholder="貼上或輸入要測試的文字…" bind:value={testText} spellcheck="false"></textarea>
    <div class="section-label preview-label">
      匹配預覽
      {#if testText && matches.length > 0}
        <span class="count-badge">{matches.length}</span>
      {/if}
    </div>
    <div class="mirror" class:mirror-empty={!testText}>
      {#if testText}
        {@html highlightedHtml}
      {:else}
        <span class="mirror-ph">在上方輸入文字後，匹配項將橙色高亮顯示</span>
      {/if}
    </div>
  </div>

  <!-- Match results -->
  <div class="card">
    <div class="section-label">匹配結果</div>
    {#if !pattern}
      <p class="hint">請先輸入正規表達式</p>
    {:else if patternError}
      <p class="hint">正規有誤，請修正後查看</p>
    {:else if !testText}
      <p class="hint">請在上方輸入測試文字</p>
    {:else if matches.length === 0}
      <p class="no-match">未找到匹配項</p>
    {:else}
      <p class="match-summary">共匹配 <strong>{matches.length}</strong> 處{#if !flagG} <span class="hint-inline">（g 標誌未啟用，僅首個）</span>{/if}</p>
      <div class="match-list">
        {#each matches as m, i (i)}
          <div class="match-item">
            <div class="match-header">
              <span class="match-num">#{i + 1}</span>
              <span class="match-pos">{m.index}–{m.end}</span>
              <span class="match-len">長度 {m.fullMatch.length}</span>
            </div>
            <code class="match-text">{m.fullMatch !== '' ? m.fullMatch : '（零長度匹配）'}</code>
            {#if m.groups.length > 0}
              <div class="groups">
                {#each m.groups as g, gi (gi)}
                  <span class="group-pill">
                    <span class="group-label">${gi + 1}</span>
                    <code class="group-val">{g !== undefined ? g : '未捕獲'}</code>
                  </span>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Replace -->
  <div class="card">
    <div class="section-label">替換</div>
    <div class="replace-row">
      <input class="replace-input" type="text" placeholder="替換字串（$1 $2… 捕獲組，$& 整個匹配）" bind:value={replacement} />
      <button class="btn-primary" onclick={doReplace} disabled={!pattern || !!patternError || !testText}>Replace All</button>
    </div>
    {#if replaceResult !== null}
      <div class="result-block">
        <div class="result-header">
          <span class="section-label" style="margin-bottom:0">替換結果</span>
          <button class="ghost" onclick={copyResult}>{copied ? '✓ 已複製' : '複製'}</button>
        </div>
        <div class="result-text">{replaceResult}</div>
      </div>
    {/if}
  </div>
</div>

<style>
  .page-body { display: flex; flex-direction: column; gap: 18px; }
  .intro { text-align: center; padding: 8px 0 4px; }
  .intro h2 { margin: 0 0 6px; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
  .lede { color: var(--text-muted); margin: 0; font-size: 14px; }

  .card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 18px 20px;
    box-shadow: var(--shadow-sm);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .section-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .pattern-row {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
  }

  .delim {
    font-family: ui-monospace, Consolas, monospace;
    font-size: 22px;
    color: var(--text-muted);
    user-select: none;
    padding: 0 2px;
  }

  .pattern-input {
    flex: 1;
    min-width: 180px;
    font-family: ui-monospace, Consolas, monospace;
    font-size: 15px;
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background: var(--bg-elevated);
    color: inherit;
    transition: border-color 0.15s;
  }
  .pattern-input:focus { outline: none; border-color: var(--accent); }
  .pattern-input.is-error { border-color: var(--error); background: color-mix(in srgb, var(--error) 5%, var(--bg-elevated)); }

  .flags { display: flex; gap: 4px; flex-wrap: wrap; }
  .flag-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background: var(--bg-elevated);
    font-family: ui-monospace, Consolas, monospace;
    font-size: 13px;
    font-weight: 700;
    color: var(--text-muted);
    cursor: pointer;
    user-select: none;
    transition: background 0.12s, color 0.12s, border-color 0.12s;
  }
  .flag-pill input { display: none; }
  .flag-pill:hover { color: var(--text); }
  .flag-pill.active { background: color-mix(in srgb, var(--accent) 15%, transparent); border-color: var(--accent); color: var(--accent); }

  .status-msg { margin: 0; font-size: 13px; }
  .err-msg { color: var(--error); font-family: ui-monospace, Consolas, monospace; word-break: break-all; }
  .ok-msg { color: var(--success); }

  .test-area {
    width: 100%;
    min-height: 130px;
    resize: vertical;
    font-family: ui-monospace, Consolas, monospace;
    font-size: 14px;
    line-height: 1.65;
    padding: 10px 12px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background: var(--bg-elevated);
    color: inherit;
    box-sizing: border-box;
    transition: border-color 0.15s;
  }
  .test-area:focus { outline: none; border-color: var(--accent); }

  .preview-label { margin-top: 2px; }
  .count-badge {
    background: color-mix(in srgb, var(--accent) 20%, transparent);
    color: var(--accent);
    border-radius: 999px;
    padding: 1px 7px;
    font-size: 11px;
    font-weight: 700;
    font-family: ui-monospace, Consolas, monospace;
    text-transform: none;
    letter-spacing: 0;
  }

  .mirror {
    min-height: 80px;
    max-height: 280px;
    overflow-y: auto;
    padding: 10px 12px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background: var(--bg-elevated);
    font-family: ui-monospace, Consolas, monospace;
    font-size: 14px;
    line-height: 1.65;
    white-space: pre-wrap;
    word-break: break-all;
  }
  .mirror-empty { display: flex; align-items: center; }
  .mirror-ph { color: var(--text-muted); font-family: inherit; font-size: 14px; white-space: normal; font-style: italic; }
  :global(.mirror mark.hl) {
    background: color-mix(in srgb, var(--accent) 30%, transparent);
    color: inherit;
    border-radius: 2px;
    padding: 1px 0;
  }

  .hint { color: var(--text-muted); font-size: 14px; margin: 0; }
  .no-match { color: var(--error); font-size: 14px; margin: 0; }
  .match-summary { font-size: 14px; margin: 0; }
  .hint-inline { font-size: 12px; color: var(--text-muted); margin-left: 4px; }

  .match-list { display: flex; flex-direction: column; gap: 8px; max-height: 340px; overflow-y: auto; }
  .match-item {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .match-header { display: flex; align-items: center; gap: 8px; font-size: 12px; }
  .match-num { font-weight: 700; color: var(--accent); font-family: ui-monospace, Consolas, monospace; }
  .match-pos { font-family: ui-monospace, Consolas, monospace; color: var(--text-muted); background: var(--bg-card); border: 1px solid var(--border); border-radius: 4px; padding: 1px 6px; }
  .match-len { color: var(--text-muted); font-size: 11px; }
  .match-text {
    display: inline-block;
    background: color-mix(in srgb, var(--accent) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
    border-radius: var(--radius-sm);
    padding: 4px 10px;
    font-size: 13px;
    word-break: break-all;
    font-family: ui-monospace, Consolas, monospace;
  }
  .groups { display: flex; flex-wrap: wrap; gap: 6px; }
  .group-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 3px 8px;
    font-size: 12px;
  }
  .group-label { color: var(--text-muted); font-size: 11px; font-family: ui-monospace, Consolas, monospace; font-weight: 600; }
  .group-val { font-family: ui-monospace, Consolas, monospace; font-size: 12px; background: transparent; border: none; padding: 0; }

  .replace-row { display: flex; gap: 10px; flex-wrap: wrap; }
  .replace-input {
    flex: 1;
    min-width: 200px;
    font-family: ui-monospace, Consolas, monospace;
    font-size: 14px;
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background: var(--bg-elevated);
    color: inherit;
    transition: border-color 0.15s;
  }
  .replace-input:focus { outline: none; border-color: var(--accent); }

  .btn-primary {
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: var(--radius-sm);
    padding: 8px 18px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: opacity 0.15s;
  }
  .btn-primary:hover:not(:disabled) { opacity: 0.82; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  .result-block { display: flex; flex-direction: column; gap: 8px; }
  .result-header { display: flex; align-items: center; justify-content: space-between; }
  .result-text {
    min-height: 72px;
    max-height: 240px;
    overflow-y: auto;
    padding: 10px 12px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background: var(--bg-elevated);
    font-family: ui-monospace, Consolas, monospace;
    font-size: 14px;
    line-height: 1.65;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .ghost {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-muted);
    padding: 4px 12px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    cursor: pointer;
    transition: color 0.12s;
  }
  .ghost:hover { color: var(--text); }
</style>
