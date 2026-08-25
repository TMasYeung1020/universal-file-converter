<script lang="ts">
  // Cron expression parser & generator — no external dependencies.
  // Supports standard 5-field cron: minute hour dom month dow
  // Also handles common presets and "next N runs" preview.

  interface CronField {
    label: string;
    placeholder: string;
    min: number;
    max: number;
    names?: string[];
  }

  const FIELDS: CronField[] = [
    { label: '分钟', placeholder: '0-59', min: 0, max: 59 },
    { label: '小时', placeholder: '0-23', min: 0, max: 23 },
    { label: '日期', placeholder: '1-31', min: 1, max: 31 },
    { label: '月份', placeholder: '1-12', min: 1, max: 12, names: ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] },
    { label: '星期', placeholder: '0-6', min: 0, max: 6, names: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
  ];

  const PRESETS = [
    { label: '每分钟',       cron: '* * * * *' },
    { label: '每小时',       cron: '0 * * * *' },
    { label: '每天午夜',     cron: '0 0 * * *' },
    { label: '每天中午',     cron: '0 12 * * *' },
    { label: '每周一上午9点', cron: '0 9 * * 1' },
    { label: '每月1号零时',  cron: '0 0 1 * *' },
    { label: '每年元旦',     cron: '0 0 1 1 *' },
    { label: '工作日早9点',  cron: '0 9 * * 1-5' },
    { label: '每15分钟',     cron: '*/15 * * * *' },
    { label: '每5分钟',      cron: '*/5 * * * *' },
  ];

  // ── State ────────────────────────────────────────────────────────────────
  let cronExpr = $state('* * * * *');
  let copied = $state(false);

  const parts = $derived(cronExpr.trim().split(/\s+/));
  const isValid = $derived(parts.length === 5 && parts.every((p, i) => validateField(p, FIELDS[i])));
  const description = $derived(isValid ? describe(parts) : null);
  const parseError = $derived(!isValid && cronExpr.trim() !== '' ? getError(parts) : null);
  const nextRuns = $derived(isValid ? getNextRuns(parts, 6) : []);

  // ── Field validation ─────────────────────────────────────────────────────
  function validateField(val: string, field: CronField): boolean {
    if (val === '*') return true;
    if (val.startsWith('*/')) {
      const n = Number(val.slice(2));
      return !isNaN(n) && n >= 1;
    }
    // comma-separated list of values/ranges
    for (const tok of val.split(',')) {
      if (tok.includes('-')) {
        const [a, b] = tok.split('-').map(Number);
        if (isNaN(a) || isNaN(b) || a < field.min || b > field.max || a > b) return false;
      } else {
        const n = Number(tok);
        if (isNaN(n) || n < field.min || n > field.max) return false;
      }
    }
    return true;
  }

  function getError(parts: string[]): string {
    if (parts.length !== 5) return `需要 5 个字段，当前有 ${parts.length} 个`;
    for (let i = 0; i < 5; i++) {
      if (!validateField(parts[i], FIELDS[i])) {
        return `${FIELDS[i].label}字段无效："${parts[i]}"（范围 ${FIELDS[i].min}–${FIELDS[i].max}）`;
      }
    }
    return '格式无效';
  }

  // ── Human-readable description ───────────────────────────────────────────
  function describeField(val: string, field: CronField): string {
    if (val === '*') return `每${field.label}`;
    if (val.startsWith('*/')) return `每 ${val.slice(2)} ${field.label}`;
    const toks = val.split(',').map(tok => {
      if (tok.includes('-')) {
        const [a, b] = tok.split('-');
        const na = field.names ? (field.names[Number(a)] ?? a) : a;
        const nb = field.names ? (field.names[Number(b)] ?? b) : b;
        return `${na}~${nb}`;
      }
      return field.names ? (field.names[Number(tok)] ?? tok) : tok;
    });
    return toks.join('、');
  }

  function describe(p: string[]): string {
    const [min, hr, dom, mon, dow] = p;
    const parts: string[] = [];
    if (mon !== '*') parts.push(`${describeField(mon, FIELDS[3])}月`);
    if (dom !== '*') parts.push(`${describeField(dom, FIELDS[2])}日`);
    if (dow !== '*') parts.push(`每${describeField(dow, FIELDS[4])}`);
    if (hr !== '*') {
      const minPart = min === '*' ? '每分钟' : min.startsWith('*/') ? `每${min.slice(2)}分钟` : `${min}分`;
      parts.push(`${hr === '*' ? '每' : hr}时${minPart}`);
    } else if (min !== '*') {
      parts.push(min.startsWith('*/') ? `每${min.slice(2)}分钟` : `每小时第${min}分`);
    } else {
      parts.push('每分钟');
    }
    return parts.join(' ');
  }

  // ── Next runs ────────────────────────────────────────────────────────────
  function matchesField(val: string, n: number, field: CronField): boolean {
    if (val === '*') return true;
    if (val.startsWith('*/')) {
      const step = Number(val.slice(2));
      return (n - field.min) % step === 0;
    }
    for (const tok of val.split(',')) {
      if (tok.includes('-')) {
        const [a, b] = tok.split('-').map(Number);
        if (n >= a && n <= b) return true;
      } else {
        if (n === Number(tok)) return true;
      }
    }
    return false;
  }

  function getNextRuns(p: string[], count: number): Date[] {
    const [minF, hrF, domF, monF, dowF] = p;
    const results: Date[] = [];
    const now = new Date();
    const d = new Date(now);
    d.setSeconds(0, 0);
    d.setMinutes(d.getMinutes() + 1); // start from next minute

    let iterations = 0;
    while (results.length < count && iterations < 500000) {
      iterations++;
      const mo = d.getMonth() + 1;
      const dom = d.getDate();
      const hr = d.getHours();
      const min = d.getMinutes();
      const dow = d.getDay();

      if (!matchesField(monF, mo, FIELDS[3])) {
        d.setDate(1);
        d.setMonth(d.getMonth() + 1);
        d.setHours(0, 0, 0, 0);
        continue;
      }
      if (!matchesField(domF, dom, FIELDS[2]) || !matchesField(dowF, dow, FIELDS[4])) {
        d.setDate(d.getDate() + 1);
        d.setHours(0, 0, 0, 0);
        continue;
      }
      if (!matchesField(hrF, hr, FIELDS[1])) {
        d.setHours(d.getHours() + 1, 0, 0, 0);
        continue;
      }
      if (!matchesField(minF, min, FIELDS[0])) {
        d.setMinutes(d.getMinutes() + 1, 0, 0);
        continue;
      }
      results.push(new Date(d));
      d.setMinutes(d.getMinutes() + 1, 0, 0);
    }
    return results;
  }

  // ── Copy ──────────────────────────────────────────────────────────────────
  async function copyCron() {
    try {
      await navigator.clipboard.writeText(cronExpr);
      copied = true;
      setTimeout(() => { copied = false; }, 1800);
    } catch { /* unavailable */ }
  }

  function formatDate(d: Date): string {
    return d.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', weekday: 'short' });
  }
</script>

<div class="page-body">
  <div class="intro">
    <h2>Cron 表达式解析器</h2>
    <p class="lede">可视化配置定时任务 · 查看下次执行时间 · 纯浏览器</p>
  </div>

  <!-- Input -->
  <div class="card">
    <div class="input-row">
      <input
        class="cron-input"
        class:is-error={!!parseError}
        class:is-ok={isValid}
        type="text"
        spellcheck="false"
        placeholder="输入 Cron 表达式，例如：0 9 * * 1-5"
        bind:value={cronExpr}
      />
      <button class="ghost" onclick={copyCron}>{copied ? '✓ 已复制' : '复制'}</button>
    </div>

    <div class="field-hints">
      {#each FIELDS as f}
        <span class="field-chip">{f.label}<br /><code>{f.placeholder}</code></span>
      {/each}
    </div>

    {#if parseError}
      <p class="status-msg err-msg">⚠ {parseError}</p>
    {:else if description}
      <p class="status-msg ok-msg">✓ {description}</p>
    {/if}
  </div>

  <!-- Next runs -->
  {#if nextRuns.length > 0}
    <div class="card">
      <div class="section-label">接下来 {nextRuns.length} 次执行</div>
      <ul class="run-list">
        {#each nextRuns as d, i (i)}
          <li class="run-item">
            <span class="run-num">#{i + 1}</span>
            <span class="run-date">{formatDate(d)}</span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  <!-- Presets -->
  <div class="card">
    <div class="section-label">常用预设</div>
    <div class="presets">
      {#each PRESETS as p}
        <button class="preset-btn" class:active={cronExpr === p.cron} onclick={() => { cronExpr = p.cron; }}>
          <span class="preset-label">{p.label}</span>
          <code class="preset-cron">{p.cron}</code>
        </button>
      {/each}
    </div>
  </div>

  <!-- Field reference -->
  <div class="card">
    <div class="section-label">字段参考</div>
    <div class="ref-table">
      <div class="ref-header">
        <span>字段</span><span>范围</span><span>特殊值示例</span>
      </div>
      {#each FIELDS as f, i}
        <div class="ref-row">
          <span class="ref-field">{f.label}</span>
          <code>{f.min}–{f.max}</code>
          <span class="ref-examples">
            {#if i === 0}* · */5 · 0,30{/if}
            {#if i === 1}* · 9-17 · 0{/if}
            {#if i === 2}* · 1 · 1,15{/if}
            {#if i === 3}* · 1-3 · 12{/if}
            {#if i === 4}* · 1-5 · 0,6{/if}
          </span>
        </div>
      {/each}
    </div>
    <p class="ref-note">
      <code>*</code> 任意值 &nbsp;·&nbsp;
      <code>*/n</code> 每 n 步 &nbsp;·&nbsp;
      <code>a-b</code> 范围 &nbsp;·&nbsp;
      <code>a,b</code> 列表
    </p>
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
    gap: 14px;
  }

  .section-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
  }

  .input-row { display: flex; gap: 8px; }
  .cron-input {
    flex: 1;
    font-family: 'Cascadia Code', ui-monospace, Consolas, monospace;
    font-size: 18px;
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background: var(--bg-elevated);
    color: inherit;
    letter-spacing: 0.12em;
    transition: border-color 0.15s;
  }
  .cron-input:focus { outline: none; border-color: var(--accent); }
  .cron-input.is-error { border-color: var(--error); }
  .cron-input.is-ok { border-color: var(--success); }

  .ghost {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    padding: 0 14px;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
    transition: color 0.15s;
  }
  .ghost:hover { color: var(--text); }

  .field-hints { display: flex; gap: 6px; }
  .field-chip {
    flex: 1;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 6px 8px;
    text-align: center;
    font-size: 11px;
    color: var(--text-muted);
    line-height: 1.4;
  }
  .field-chip code { display: block; font-size: 10px; color: var(--accent); }

  .status-msg { margin: 0; font-size: 14px; }
  .err-msg { color: var(--error); }
  .ok-msg { color: var(--success); font-weight: 500; }

  .run-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .run-item {
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 8px 14px;
  }
  .run-num { font-size: 11px; font-weight: 700; color: var(--accent); font-family: ui-monospace, Consolas, monospace; min-width: 24px; }
  .run-date { font-size: 14px; }

  .presets { display: flex; flex-wrap: wrap; gap: 8px; }
  .preset-btn {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 8px 12px;
    cursor: pointer;
    text-align: left;
    transition: border-color 0.15s, background 0.15s;
  }
  .preset-btn:hover { border-color: var(--accent); }
  .preset-btn.active { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, transparent); }
  .preset-label { font-size: 13px; font-weight: 500; color: var(--text); }
  .preset-cron { font-size: 11px; color: var(--text-muted); font-family: ui-monospace, Consolas, monospace; }

  .ref-table { display: flex; flex-direction: column; gap: 0; border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; }
  .ref-header {
    display: grid;
    grid-template-columns: 60px 80px 1fr;
    padding: 8px 12px;
    background: var(--bg-elevated);
    font-size: 11px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    border-bottom: 1px solid var(--border);
  }
  .ref-row {
    display: grid;
    grid-template-columns: 60px 80px 1fr;
    padding: 8px 12px;
    font-size: 13px;
    border-bottom: 1px solid var(--border);
    align-items: center;
  }
  .ref-row:last-child { border-bottom: none; }
  .ref-field { font-weight: 500; }
  .ref-examples { color: var(--text-muted); font-size: 12px; }

  .ref-note { margin: 0; font-size: 13px; color: var(--text-muted); }
  .ref-note code {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 3px;
    padding: 1px 5px;
    font-size: 12px;
  }

  @media (max-width: 480px) {
    .field-hints { display: none; }
    .cron-input { font-size: 15px; }
  }
</style>
