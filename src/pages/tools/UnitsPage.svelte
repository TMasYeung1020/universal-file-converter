<script lang="ts">
  // ── types ──────────────────────────────────────────────────────────────────
  type Category = 'weight' | 'length' | 'storage' | 'temperature';

  interface Unit {
    label: string;
    symbol: string;
    toBase: (v: number) => number;
    fromBase: (v: number) => number;
  }

  interface CategoryDef {
    label: string;
    units: Unit[];
  }

  interface ConvResult {
    label: string;
    symbol: string;
    value: number;
  }

  // ── unit definitions ───────────────────────────────────────────────────────
  const CATS: Record<Category, CategoryDef> = {
    weight: {
      label: '重量',
      units: [
        { label: '千克', symbol: 'kg', toBase: (v) => v,                   fromBase: (v) => v },
        { label: '克',   symbol: 'g',  toBase: (v) => v / 1e3,             fromBase: (v) => v * 1e3 },
        { label: '毫克', symbol: 'mg', toBase: (v) => v / 1e6,             fromBase: (v) => v * 1e6 },
        { label: '磅',   symbol: 'lb', toBase: (v) => v * 0.45359237,      fromBase: (v) => v / 0.45359237 },
        { label: '盎司', symbol: 'oz', toBase: (v) => v * 0.028349523125,  fromBase: (v) => v / 0.028349523125 },
        { label: '斤',   symbol: '斤', toBase: (v) => v * 0.5,             fromBase: (v) => v * 2 },
        { label: '公噸', symbol: 't',  toBase: (v) => v * 1e3,             fromBase: (v) => v / 1e3 },
      ],
    },
    length: {
      label: '長度',
      units: [
        { label: '公尺', symbol: 'm',   toBase: (v) => v,            fromBase: (v) => v },
        { label: '公分', symbol: 'cm',  toBase: (v) => v / 100,      fromBase: (v) => v * 100 },
        { label: '毫米', symbol: 'mm',  toBase: (v) => v / 1000,     fromBase: (v) => v * 1000 },
        { label: '公里', symbol: 'km',  toBase: (v) => v * 1000,     fromBase: (v) => v / 1000 },
        { label: '英吋', symbol: 'in',  toBase: (v) => v * 0.0254,   fromBase: (v) => v / 0.0254 },
        { label: '英呎', symbol: 'ft',  toBase: (v) => v * 0.3048,   fromBase: (v) => v / 0.3048 },
        { label: '碼',   symbol: 'yd',  toBase: (v) => v * 0.9144,   fromBase: (v) => v / 0.9144 },
        { label: '英里', symbol: 'mi',  toBase: (v) => v * 1609.344, fromBase: (v) => v / 1609.344 },
        { label: '海里', symbol: 'nmi', toBase: (v) => v * 1852,     fromBase: (v) => v / 1852 },
        { label: '光年', symbol: 'ly',  toBase: (v) => v * 9.4607304725808e15, fromBase: (v) => v / 9.4607304725808e15 },
      ],
    },
    storage: {
      label: '儲存容量',
      units: [
        { label: 'Byte', symbol: 'B',  toBase: (v) => v,                    fromBase: (v) => v },
        { label: 'KB',   symbol: 'KB', toBase: (v) => v * 1024,             fromBase: (v) => v / 1024 },
        { label: 'MB',   symbol: 'MB', toBase: (v) => v * 1048576,          fromBase: (v) => v / 1048576 },
        { label: 'GB',   symbol: 'GB', toBase: (v) => v * 1073741824,       fromBase: (v) => v / 1073741824 },
        { label: 'TB',   symbol: 'TB', toBase: (v) => v * 1099511627776,    fromBase: (v) => v / 1099511627776 },
        { label: 'PB',   symbol: 'PB', toBase: (v) => v * 1125899906842624, fromBase: (v) => v / 1125899906842624 },
      ],
    },
    temperature: {
      label: '溫度',
      units: [
        { label: '攝氏',   symbol: '°C', toBase: (v) => v,                 fromBase: (v) => v },
        { label: '華氏',   symbol: '°F', toBase: (v) => (v - 32) * 5 / 9, fromBase: (v) => v * 9 / 5 + 32 },
        { label: '克耳文', symbol: 'K',  toBase: (v) => v - 273.15,        fromBase: (v) => v + 273.15 },
      ],
    },
  };

  const CAT_KEYS = Object.keys(CATS) as Category[];

  // ── state ──────────────────────────────────────────────────────────────────
  let activeCategory = $state<Category>('weight');
  let inputValue = $state('1');
  let fromUnit = $state(CATS.weight.units[0].symbol);

  // ── actions ────────────────────────────────────────────────────────────────
  function selectCategory(key: Category): void {
    activeCategory = key;
    fromUnit = CATS[key].units[0].symbol;
    inputValue = '1';
  }

  // ── derived ────────────────────────────────────────────────────────────────
  const currentUnits = $derived(CATS[activeCategory].units);

  const parsedInput = $derived(parseFloat(inputValue));

  const isValid = $derived(inputValue.trim() !== '' && !isNaN(parsedInput));

  const results = $derived.by((): ConvResult[] => {
    if (!isValid) return [];
    const cat = CATS[activeCategory];
    const src = cat.units.find((u) => u.symbol === fromUnit);
    if (!src) return [];
    const base = src.toBase(parsedInput);
    return cat.units
      .filter((u) => u.symbol !== fromUnit)
      .map((u): ConvResult => ({
        label: u.label,
        symbol: u.symbol,
        value: u.fromBase(base),
      }));
  });

  // ── helpers ────────────────────────────────────────────────────────────────
  function fmt(v: number): string {
    if (!isFinite(v)) return '—';
    if (v === 0) return '0';
    const abs = Math.abs(v);
    if (abs >= 1e15 || (abs > 0 && abs < 1e-6)) {
      return v.toExponential(6);
    }
    return parseFloat(v.toPrecision(8)).toString();
  }
</script>

<div class="page-body">
  <!-- intro -->
  <div class="intro">
    <h2>單位轉換器</h2>
    <p class="lede">在常用單位之間快速換算。選擇分類，輸入數值，即時查看所有結果。</p>
  </div>

  <!-- converter card -->
  <div class="card">
    <!-- tabs -->
    <div class="tabs" role="tablist">
      {#each CAT_KEYS as key (key)}
        <button
          role="tab"
          aria-selected={activeCategory === key}
          class="tab"
          class:active={activeCategory === key}
          onclick={() => selectCategory(key)}
        >
          {CATS[key].label}
        </button>
      {/each}
    </div>

    <!-- input row -->
    <div class="input-section">
      <div class="input-row">
        <input
          type="text"
          inputmode="decimal"
          class="num-input"
          class:invalid={inputValue.trim() !== '' && !isValid}
          bind:value={inputValue}
          placeholder="0"
          aria-label="數值"
          autocomplete="off"
          spellcheck="false"
        />
        <select
          class="unit-sel"
          bind:value={fromUnit}
          aria-label="來源單位"
        >
          {#each currentUnits as u (u.symbol)}
            <option value={u.symbol}>{u.label}（{u.symbol}）</option>
          {/each}
        </select>
      </div>
    </div>

    <!-- results -->
    <div class="results-section">
      {#if isValid && results.length > 0}
        <ul class="results" aria-label="換算結果列表">
          {#each results as r (r.symbol)}
            <li class="result-row">
              <span class="eq">=</span>
              <span class="val">{fmt(r.value)}</span>
              <span class="sym">{r.symbol}</span>
              <span class="name">{r.label}</span>
            </li>
          {/each}
        </ul>
      {:else if inputValue.trim() !== '' && !isValid}
        <p class="hint hint-error">請輸入有效數值</p>
      {:else}
        <p class="hint">輸入數值以查看所有換算結果</p>
      {/if}
    </div>
  </div>
</div>

<style>
  /* ── layout ──────────────────────────────────────────────────────────────── */
  .page-body {
    max-width: 680px;
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

  /* ── card ────────────────────────────────────────────────────────────────── */
  .card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
  }

  /* ── tabs ────────────────────────────────────────────────────────────────── */
  .tabs {
    display: flex;
    background: var(--bg-elevated);
    border-bottom: 1px solid var(--border);
  }

  .tab {
    flex: 1;
    padding: 0.8125rem 0.5rem;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    color: var(--text-muted);
    font-size: 0.9rem;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    white-space: nowrap;
    transition: color 0.15s, border-color 0.15s;
    position: relative;
    z-index: 0;
  }

  .tab:hover {
    color: var(--text);
  }

  .tab.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
    font-weight: 600;
    z-index: 1;
  }

  /* ── input section ───────────────────────────────────────────────────────── */
  .input-section {
    padding: 1.125rem 1.125rem 1rem;
    border-bottom: 1px solid var(--border);
  }

  .input-row {
    display: flex;
    gap: 0.625rem;
    align-items: stretch;
  }

  .num-input {
    flex: 1 1 0;
    min-width: 0;
    padding: 0.625rem 0.875rem;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: var(--text);
    font-size: 1.25rem;
    font-weight: 600;
    font-family: inherit;
    font-variant-numeric: tabular-nums;
    outline: none;
    transition: border-color 0.15s;
  }

  .num-input::placeholder {
    color: var(--text-muted);
    font-weight: 400;
    opacity: 0.6;
  }

  .num-input:focus {
    border-color: var(--accent);
  }

  .num-input.invalid {
    border-color: var(--error);
  }

  .unit-sel {
    padding: 0.625rem 0.75rem;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: var(--text);
    font-size: 0.875rem;
    font-family: inherit;
    cursor: pointer;
    outline: none;
    min-width: 7.5rem;
    transition: border-color 0.15s;
  }

  .unit-sel:focus {
    border-color: var(--accent);
  }

  /* ── results section ─────────────────────────────────────────────────────── */
  .results-section {
    padding: 0.875rem 1.125rem 1.25rem;
  }

  .results {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .result-row {
    display: grid;
    grid-template-columns: 1.375rem 1fr auto auto;
    align-items: baseline;
    column-gap: 0.625rem;
    padding: 0.625rem 0.875rem;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    transition: border-color 0.15s, background 0.15s;
  }

  .result-row:hover {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 4%, var(--bg-elevated));
  }

  .eq {
    color: var(--text-muted);
    font-size: 0.875rem;
    text-align: center;
    user-select: none;
  }

  .val {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text);
    font-variant-numeric: tabular-nums;
    word-break: break-all;
  }

  .sym {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--accent);
    white-space: nowrap;
  }

  .name {
    font-size: 0.8rem;
    color: var(--text-muted);
    white-space: nowrap;
  }

  /* ── hint ────────────────────────────────────────────────────────────────── */
  .hint {
    margin: 0;
    text-align: center;
    color: var(--text-muted);
    font-size: 0.875rem;
    padding: 2rem 0 1rem;
  }

  .hint-error {
    color: var(--error);
    padding: 1.5rem 0 0.75rem;
  }

  /* ── responsive ──────────────────────────────────────────────────────────── */
  @media (max-width: 480px) {
    .page-body {
      padding: 1.25rem 1rem 3rem;
      gap: 1.25rem;
    }

    .intro h2 {
      font-size: 1.4rem;
    }

    .input-row {
      flex-direction: column;
    }

    .unit-sel {
      min-width: unset;
    }

    .tab {
      font-size: 0.825rem;
      padding: 0.625rem 0.25rem;
    }

    .val {
      font-size: 0.9375rem;
    }
  }
</style>
