<script lang="ts">
  // ── Types ────────────────────────────────────────────────────────────────
  type Method = 'equal-installment' | 'equal-principal';

  interface MonthRow {
    month: number;
    payment: number;
    principal: number;
    interest: number;
    remaining: number;
  }

  // ── State ────────────────────────────────────────────────────────────────
  let totalPrice   = $state(3000000);
  let downPercent  = $state(30);
  let years        = $state(30);
  let annualRate   = $state(3.5);
  let method       = $state<Method>('equal-installment');

  // ── Core derived values ──────────────────────────────────────────────────
  const loanAmount = $derived(totalPrice * (1 - downPercent / 100));
  const downAmount = $derived(totalPrice * downPercent / 100);
  const n          = $derived(years * 12);
  const r          = $derived(annualRate / 12 / 100);

  // equal-installment monthly payment
  const eiMonthly = $derived(
    r === 0
      ? loanAmount / n
      : loanAmount * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1)
  );

  // equal-principal: all rows computed once, cached
  const epRows = $derived<MonthRow[]>(() => {
    const rows: MonthRow[] = [];
    const monthlyPrincipal = loanAmount / n;
    let remaining = loanAmount;
    for (let i = 1; i <= n; i++) {
      const interest = remaining * r;
      const payment  = monthlyPrincipal + interest;
      remaining     -= monthlyPrincipal;
      rows.push({ month: i, payment, principal: monthlyPrincipal, interest, remaining: Math.max(0, remaining) });
    }
    return rows;
  });

  // ── Summary metrics ──────────────────────────────────────────────────────
  const totalPayment = $derived(
    method === 'equal-installment'
      ? eiMonthly * n
      : epRows.reduce((s, row) => s + row.payment, 0)
  );
  const totalInterest  = $derived(totalPayment - loanAmount);
  const interestRatio  = $derived(totalPayment > 0 ? totalInterest / totalPayment * 100 : 0);
  const firstMonthly   = $derived(
    method === 'equal-installment' ? eiMonthly : (epRows[0]?.payment ?? 0)
  );
  const lastMonthly    = $derived(
    method === 'equal-principal' ? (epRows[epRows.length - 1]?.payment ?? 0) : 0
  );

  // ── Amortisation table rows to display ───────────────────────────────────
  const tableRows = $derived<MonthRow[]>(() => {
    if (method === 'equal-installment') {
      const rows: MonthRow[] = [];
      let remaining = loanAmount;
      for (let i = 1; i <= n; i++) {
        const interest  = remaining * r;
        const principal = eiMonthly - interest;
        remaining      -= principal;
        rows.push({ month: i, payment: eiMonthly, principal, interest, remaining: Math.max(0, remaining) });
      }
      return rows;
    }
    return epRows;
  });

  const displayRows = $derived<(MonthRow | 'ellipsis')[]>(() => {
    const rows = tableRows;
    if (rows.length <= 14) return rows;
    const head = rows.slice(0, 12) as (MonthRow | 'ellipsis')[];
    return [...head, 'ellipsis', rows[rows.length - 1]];
  });

  // ── SVG chart data (yearly aggregates) ───────────────────────────────────
  const chartData = $derived<{ year: number; principal: number; interest: number }[]>(() => {
    const rows = tableRows;
    const data: { year: number; principal: number; interest: number }[] = [];
    for (let y = 1; y <= years; y++) {
      const slice = rows.slice((y - 1) * 12, y * 12);
      data.push({
        year: y,
        principal: slice.reduce((s, r) => s + r.principal, 0),
        interest:  slice.reduce((s, r) => s + r.interest,  0),
      });
    }
    return data;
  });

  // ── Chart rendering constants ─────────────────────────────────────────────
  const SVG_W  = 600;
  const SVG_H  = 200;
  const PAD_L  = 48;
  const PAD_R  = 16;
  const PAD_T  = 12;
  const PAD_B  = 28;
  const PLOT_W = $derived(SVG_W - PAD_L - PAD_R);
  const PLOT_H = $derived(SVG_H - PAD_T - PAD_B);

  const maxStack = $derived(
    Math.max(...chartData.map(d => d.principal + d.interest), 1)
  );

  // stacked area paths
  const barWidth = $derived(chartData.length > 0 ? PLOT_W / chartData.length : 1);

  function xPos(i: number): number {
    return PAD_L + i * barWidth;
  }
  function yPos(val: number): number {
    return PAD_T + PLOT_H * (1 - val / maxStack);
  }

  const principalPath = $derived<string>(() => {
    if (chartData.length === 0) return '';
    const pts = chartData.map((d, i) =>
      `${xPos(i) + barWidth / 2},${yPos(d.principal)}`
    );
    const last = chartData.length - 1;
    return (
      `M ${xPos(0) + barWidth / 2},${yPos(0)} ` +
      pts.join(' L ') +
      ` L ${xPos(last) + barWidth / 2},${yPos(0) + PLOT_H}` +
      ` L ${xPos(0) + barWidth / 2},${yPos(0) + PLOT_H} Z`
    );
  });

  const stackPath = $derived<string>(() => {
    if (chartData.length === 0) return '';
    const ptsTop = chartData.map((d, i) =>
      `${xPos(i) + barWidth / 2},${yPos(d.principal + d.interest)}`
    );
    const ptsBot = chartData.map((d, i) =>
      `${xPos(i) + barWidth / 2},${yPos(d.principal)}`
    ).reverse();
    return `M ${ptsTop[0]} L ${ptsTop.join(' L ')} L ${ptsBot[0]} L ${ptsBot.join(' L ')} Z`;
  });

  // Y-axis ticks
  const yTicks = $derived([0, 0.25, 0.5, 0.75, 1].map(f => ({
    y: PAD_T + PLOT_H * (1 - f),
    label: fmtWan(maxStack * f),
  })));

  // ── Formatters ────────────────────────────────────────────────────────────
  function fmt(n: number, decimals = 2): string {
    return n.toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  function fmtWan(n: number): string {
    if (n >= 10000) return `${(n / 10000).toFixed(0)}万`;
    return n.toFixed(0);
  }
</script>

<div class="page-body">
  <!-- Intro -->
  <div class="intro">
    <h2>房贷试算</h2>
    <p class="lede">等额本息 · 等额本金 · 摊销明细 · 纯浏览器计算</p>
  </div>

  <!-- Inputs -->
  <div class="card">
    <div class="section-label">贷款参数</div>
    <div class="input-grid">

      <div class="field">
        <label class="field-label" for="total-price">房价总额（元）</label>
        <input id="total-price" class="num-input" type="number" min="0" step="10000"
          bind:value={totalPrice} />
      </div>

      <div class="field">
        <label class="field-label" for="down-pct">首付比例（%）</label>
        <div class="input-with-tag">
          <input id="down-pct" class="num-input" type="number" min="0" max="100" step="1"
            bind:value={downPercent} />
          <span class="input-tag">首付 {fmt(downAmount, 0)} 元</span>
        </div>
      </div>

      <div class="field">
        <label class="field-label" for="loan-years">贷款年限</label>
        <select id="loan-years" class="select-input" bind:value={years}>
          {#each [5, 10, 15, 20, 25, 30] as y}
            <option value={y}>{y} 年</option>
          {/each}
        </select>
      </div>

      <div class="field">
        <label class="field-label" for="annual-rate">年利率（%）</label>
        <input id="annual-rate" class="num-input" type="number" min="0" max="30" step="0.01"
          bind:value={annualRate} />
      </div>

      <div class="field field--full">
        <span class="field-label">还款方式</span>
        <div class="radio-group">
          <label class="radio-label" class:active={method === 'equal-installment'}>
            <input type="radio" bind:group={method} value="equal-installment" />
            等额本息
            <span class="radio-hint">每月还款固定</span>
          </label>
          <label class="radio-label" class:active={method === 'equal-principal'}>
            <input type="radio" bind:group={method} value="equal-principal" />
            等额本金
            <span class="radio-hint">每月本金固定，利息递减</span>
          </label>
        </div>
      </div>

    </div>
  </div>

  <!-- Key metrics -->
  <div class="metrics-grid">
    <div class="metric-card">
      <div class="metric-label">
        {method === 'equal-installment' ? '月供' : '首月月供'}
      </div>
      <div class="metric-value accent">{fmt(firstMonthly)} <span class="metric-unit">元</span></div>
    </div>

    {#if method === 'equal-principal'}
      <div class="metric-card">
        <div class="metric-label">末月月供</div>
        <div class="metric-value">{fmt(lastMonthly)} <span class="metric-unit">元</span></div>
      </div>
    {/if}

    <div class="metric-card">
      <div class="metric-label">贷款金额</div>
      <div class="metric-value">{fmt(loanAmount, 0)} <span class="metric-unit">元</span></div>
    </div>

    <div class="metric-card">
      <div class="metric-label">总利息</div>
      <div class="metric-value warn">{fmt(totalInterest, 0)} <span class="metric-unit">元</span></div>
    </div>

    <div class="metric-card">
      <div class="metric-label">还款总额</div>
      <div class="metric-value">{fmt(totalPayment, 0)} <span class="metric-unit">元</span></div>
    </div>

    <div class="metric-card">
      <div class="metric-label">利息占比</div>
      <div class="metric-value">{fmt(interestRatio, 1)}<span class="metric-unit">%</span></div>
    </div>
  </div>

  <!-- SVG Chart -->
  <div class="card">
    <div class="section-label">本金 vs 利息（按年）</div>
    <div class="chart-wrap">
      <svg viewBox="0 0 {SVG_W} {SVG_H}" preserveAspectRatio="xMidYMid meet" class="chart-svg">
        <defs>
          <linearGradient id="grad-principal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.85" />
            <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.4" />
          </linearGradient>
          <linearGradient id="grad-interest" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--error)" stop-opacity="0.75" />
            <stop offset="100%" stop-color="var(--error)" stop-opacity="0.3" />
          </linearGradient>
        </defs>

        <!-- grid lines + y-axis labels -->
        {#each yTicks as tick}
          <line x1={PAD_L} y1={tick.y} x2={SVG_W - PAD_R} y2={tick.y}
            stroke="var(--border)" stroke-width="0.5" />
          <text x={PAD_L - 4} y={tick.y + 4} text-anchor="end"
            font-size="9" fill="var(--text-muted)">{tick.label}</text>
        {/each}

        <!-- stacked areas: interest on top, principal on bottom -->
        <path d={stackPath}    fill="url(#grad-interest)"   />
        <path d={principalPath} fill="url(#grad-principal)" />

        <!-- x-axis year labels (every 5 years or every year if short) -->
        {#each chartData as d, i}
          {#if years <= 10 || (d.year % 5 === 0 || d.year === 1)}
            <text
              x={xPos(i) + barWidth / 2}
              y={PAD_T + PLOT_H + 16}
              text-anchor="middle"
              font-size="9"
              fill="var(--text-muted)"
            >{d.year}年</text>
          {/if}
        {/each}

        <!-- x-axis baseline -->
        <line x1={PAD_L} y1={PAD_T + PLOT_H} x2={SVG_W - PAD_R} y2={PAD_T + PLOT_H}
          stroke="var(--border)" stroke-width="1" />
      </svg>

      <div class="legend">
        <span class="legend-dot" style="background: var(--accent)"></span> 本金
        <span class="legend-dot" style="background: var(--error); margin-left:12px"></span> 利息
      </div>
    </div>
  </div>

  <!-- Amortisation table -->
  <div class="card">
    <div class="section-label">摊销明细（前12期 + 末期）</div>
    <div class="table-wrap">
      <table class="amort-table">
        <thead>
          <tr>
            <th>月份</th>
            <th>月供</th>
            <th>本金</th>
            <th>利息</th>
            <th>剩余本金</th>
          </tr>
        </thead>
        <tbody>
          {#each displayRows as row}
            {#if row === 'ellipsis'}
              <tr class="ellipsis-row">
                <td colspan="5">⋯</td>
              </tr>
            {:else}
              <tr>
                <td class="col-month">第 {row.month} 月</td>
                <td>{fmt(row.payment)}</td>
                <td class="col-principal">{fmt(row.principal)}</td>
                <td class="col-interest">{fmt(row.interest)}</td>
                <td class="col-remaining">{fmt(row.remaining, 0)}</td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>

<style>
  .page-body { display: flex; flex-direction: column; gap: 18px; }

  .intro { text-align: center; padding: 8px 0 4px; }
  .intro h2 { margin: 0 0 6px; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
  .lede { color: var(--text-muted); margin: 0; font-size: 14px; }

  /* ── Card ─────────────────────────────────────────────────────────────── */
  .card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 18px 20px;
    box-shadow: var(--shadow-sm);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .section-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
  }

  /* ── Input grid ───────────────────────────────────────────────────────── */
  .input-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 14px 20px;
  }

  .field { display: flex; flex-direction: column; gap: 6px; }
  .field--full { grid-column: 1 / -1; }

  .field-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    letter-spacing: 0.03em;
  }

  .num-input,
  .select-input {
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg-elevated);
    color: inherit;
    font-size: 14px;
    font-family: inherit;
    transition: border-color 0.15s;
    width: 100%;
    box-sizing: border-box;
  }
  .num-input:focus,
  .select-input:focus { outline: none; border-color: var(--accent); }

  .input-with-tag { display: flex; flex-direction: column; gap: 4px; }
  .input-tag { font-size: 11px; color: var(--text-muted); padding-left: 2px; }

  /* ── Radio group ─────────────────────────────────────────────────────── */
  .radio-group { display: flex; gap: 10px; flex-wrap: wrap; }

  .radio-label {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg-elevated);
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: border-color 0.15s, background 0.15s;
    user-select: none;
  }
  .radio-label.active {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    color: var(--accent);
  }
  .radio-label input[type="radio"] { width: 15px; height: 15px; accent-color: var(--accent); }
  .radio-hint { font-size: 12px; color: var(--text-muted); font-weight: 400; }
  .radio-label.active .radio-hint { color: color-mix(in srgb, var(--accent) 70%, var(--text-muted)); }

  /* ── Metrics grid ────────────────────────────────────────────────────── */
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
  }

  .metric-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 14px 16px;
    box-shadow: var(--shadow-sm);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .metric-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--text-muted);
  }

  .metric-value {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.1;
  }
  .metric-value.accent { color: var(--accent); }
  .metric-value.warn   { color: var(--error); }
  .metric-unit { font-size: 12px; font-weight: 500; opacity: 0.7; }

  /* ── Chart ───────────────────────────────────────────────────────────── */
  .chart-wrap { display: flex; flex-direction: column; gap: 8px; }

  .chart-svg {
    width: 100%;
    height: auto;
    display: block;
    border-radius: var(--radius-sm);
    overflow: visible;
  }

  .legend {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-muted);
  }
  .legend-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 2px;
    opacity: 0.85;
  }

  /* ── Amortisation table ──────────────────────────────────────────────── */
  .table-wrap { overflow-x: auto; }

  .amort-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .amort-table th,
  .amort-table td {
    padding: 8px 12px;
    text-align: right;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }

  .amort-table th {
    background: var(--bg-elevated);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    position: sticky;
    top: 0;
  }

  .amort-table th:first-child,
  .amort-table td:first-child { text-align: left; }

  .amort-table tbody tr:hover { background: color-mix(in srgb, var(--accent) 5%, transparent); }

  .col-month     { color: var(--text-muted); font-size: 12px; }
  .col-principal { color: var(--accent); }
  .col-interest  { color: var(--error); }
  .col-remaining { color: var(--text-muted); }

  .ellipsis-row td {
    text-align: center;
    color: var(--text-muted);
    font-size: 18px;
    letter-spacing: 4px;
    padding: 4px;
    border-bottom: 1px dashed var(--border);
  }

  /* ── Responsive ──────────────────────────────────────────────────────── */
  @media (max-width: 520px) {
    .metrics-grid { grid-template-columns: 1fr 1fr; }
    .input-grid   { grid-template-columns: 1fr; }
    .radio-group  { flex-direction: column; }
    .amort-table th,
    .amort-table td { padding: 6px 8px; font-size: 12px; }
  }
</style>
