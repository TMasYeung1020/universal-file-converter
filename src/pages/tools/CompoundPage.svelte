<script lang="ts">
  type CompoundFrequency = 'yearly' | 'monthly' | 'daily';

  interface YearRow {
    year: number;
    totalInvested: number;
    balance: number;
    profit: number;
  }

  let principal = $state(100000);
  let monthlyDCA = $state(1000);
  let annualRate = $state(7);
  let years = $state(20);
  let frequency = $state<CompoundFrequency>('monthly');

  function calcRows(
    p: number,
    dca: number,
    rate: number,
    yrs: number,
    freq: CompoundFrequency
  ): YearRow[] {
    const rows: YearRow[] = [];
    let balance = p;
    const annualRateDec = rate / 100;

    for (let y = 1; y <= yrs; y++) {
      for (let m = 1; m <= 12; m++) {
        balance += dca;
        if (freq === 'monthly') {
          balance *= 1 + annualRateDec / 12;
        } else if (freq === 'daily') {
          // approximate: compound daily for ~30.4 days per month
          balance *= Math.pow(1 + annualRateDec / 365, 365 / 12);
        }
      }
      if (freq === 'yearly') {
        balance *= 1 + annualRateDec;
      }
      const totalInvested = p + dca * 12 * y;
      rows.push({
        year: y,
        totalInvested,
        balance,
        profit: balance - totalInvested,
      });
    }
    return rows;
  }

  const rows = $derived(calcRows(principal, monthlyDCA, annualRate, years, frequency));

  const finalBalance = $derived(rows.length > 0 ? rows[rows.length - 1].balance : 0);
  const totalInvested = $derived(rows.length > 0 ? rows[rows.length - 1].totalInvested : 0);
  const totalProfit = $derived(finalBalance - totalInvested);
  const roi = $derived(totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0);

  function fmtCN(n: number): string {
    const abs = Math.abs(n);
    const sign = n < 0 ? '-' : '';
    if (abs >= 1e8) return sign + (abs / 1e8).toFixed(2) + ' 亿';
    if (abs >= 1e4) return sign + (abs / 1e4).toFixed(2) + ' 万';
    return sign + abs.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
  }

  function fmtFull(n: number): string {
    return n.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
  }

  // SVG chart
  const SVG_W = 600;
  const SVG_H = 240;
  const PAD_L = 64;
  const PAD_R = 16;
  const PAD_T = 16;
  const PAD_B = 32;

  const chartWidth = $derived(SVG_W - PAD_L - PAD_R);
  const chartHeight = $derived(SVG_H - PAD_T - PAD_B);

  const maxVal = $derived(rows.length > 0 ? rows[rows.length - 1].balance * 1.05 : 1);

  function toX(year: number): number {
    if (rows.length <= 1) return PAD_L;
    return PAD_L + ((year - 1) / (rows.length - 1)) * chartWidth;
  }

  function toY(val: number): number {
    return PAD_T + chartHeight - (val / maxVal) * chartHeight;
  }

  const balancePath = $derived(
    rows
      .map((r, i) => `${i === 0 ? 'M' : 'L'}${toX(r.year).toFixed(1)},${toY(r.balance).toFixed(1)}`)
      .join(' ')
  );

  const investedPath = $derived(
    rows
      .map((r, i) => `${i === 0 ? 'M' : 'L'}${toX(r.year).toFixed(1)},${toY(r.totalInvested).toFixed(1)}`)
      .join(' ')
  );

  // Y-axis ticks: 5 steps
  const yTicks = $derived(
    Array.from({ length: 5 }, (_, i) => {
      const val = (maxVal / 4) * i;
      return { val, y: toY(val) };
    })
  );

  // X-axis ticks: every 5 years, or every year if <= 10
  const xTicks = $derived(
    rows
      .filter((r) => (rows.length <= 10 ? true : r.year % 5 === 0))
      .map((r) => ({ year: r.year, x: toX(r.year) }))
  );

  const frequencyOptions: { value: CompoundFrequency; label: string }[] = [
    { value: 'yearly', label: '每年' },
    { value: 'monthly', label: '每月' },
    { value: 'daily', label: '每日' },
  ];
</script>

<div class="page-body">
  <div class="intro">
    <h2>复利 & 定投计算器</h2>
    <p class="lede">输入初始本金、月定投额和年利率，查看复利增长曲线与最终收益。</p>
  </div>

  <div class="tool-layout">
    <!-- Inputs -->
    <section class="inputs-panel">
      <div class="field-group">
        <label for="principal">初始本金（元）</label>
        <input
          id="principal"
          type="number"
          min="0"
          step="1000"
          bind:value={principal}
        />
      </div>

      <div class="field-group">
        <label for="monthly-dca">月定投金额（元）</label>
        <input
          id="monthly-dca"
          type="number"
          min="0"
          step="100"
          bind:value={monthlyDCA}
        />
      </div>

      <div class="field-group">
        <label for="annual-rate">年利率（%）</label>
        <input
          id="annual-rate"
          type="number"
          min="0"
          max="100"
          step="0.1"
          bind:value={annualRate}
        />
      </div>

      <div class="field-group">
        <label for="years">投资年限（年）</label>
        <input
          id="years"
          type="number"
          min="1"
          max="50"
          step="1"
          bind:value={years}
        />
      </div>

      <div class="field-group">
        <label for="frequency">复利频率</label>
        <select id="frequency" bind:value={frequency}>
          {#each frequencyOptions as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </div>
    </section>

    <!-- Summary cards -->
    <section class="summary-cards">
      <div class="card card--accent">
        <span class="card-label">最终资产</span>
        <span class="card-value">{fmtCN(finalBalance)}</span>
        <span class="card-sub">¥ {fmtFull(finalBalance)}</span>
      </div>
      <div class="card">
        <span class="card-label">投入总额</span>
        <span class="card-value">{fmtCN(totalInvested)}</span>
        <span class="card-sub">¥ {fmtFull(totalInvested)}</span>
      </div>
      <div class="card card--success">
        <span class="card-label">总收益</span>
        <span class="card-value">{fmtCN(totalProfit)}</span>
        <span class="card-sub">¥ {fmtFull(totalProfit)}</span>
      </div>
      <div class="card card--roi">
        <span class="card-label">投资回报率</span>
        <span class="card-value">{roi.toFixed(1)}%</span>
        <span class="card-sub">本金翻 {(finalBalance / (principal || 1)).toFixed(1)} 倍</span>
      </div>
    </section>

    <!-- Chart -->
    <section class="chart-section">
      <h3 class="section-title">增长曲线</h3>
      <div class="chart-wrap">
        <svg
          viewBox="0 0 {SVG_W} {SVG_H}"
          preserveAspectRatio="xMidYMid meet"
          aria-label="资产增长曲线图"
          role="img"
        >
          <!-- Grid lines -->
          {#each yTicks as tick}
            <line
              x1={PAD_L}
              y1={tick.y}
              x2={SVG_W - PAD_R}
              y2={tick.y}
              stroke="var(--border)"
              stroke-width="1"
              stroke-dasharray="4 4"
            />
            <text
              x={PAD_L - 6}
              y={tick.y + 4}
              text-anchor="end"
              font-size="10"
              fill="var(--text-muted)"
            >{fmtCN(tick.val)}</text>
          {/each}

          <!-- X-axis labels -->
          {#each xTicks as tick}
            <text
              x={tick.x}
              y={SVG_H - PAD_B + 16}
              text-anchor="middle"
              font-size="10"
              fill="var(--text-muted)"
            >{tick.year}年</text>
          {/each}

          <!-- Axes -->
          <line
            x1={PAD_L}
            y1={PAD_T}
            x2={PAD_L}
            y2={SVG_H - PAD_B}
            stroke="var(--border)"
            stroke-width="1"
          />
          <line
            x1={PAD_L}
            y1={SVG_H - PAD_B}
            x2={SVG_W - PAD_R}
            y2={SVG_H - PAD_B}
            stroke="var(--border)"
            stroke-width="1"
          />

          <!-- Invested path -->
          {#if investedPath}
            <path
              d={investedPath}
              fill="none"
              stroke="var(--text-muted)"
              stroke-width="1.5"
              stroke-dasharray="5 3"
              opacity="0.7"
            />
          {/if}

          <!-- Balance path -->
          {#if balancePath}
            <path
              d={balancePath}
              fill="none"
              stroke="var(--accent)"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          {/if}
        </svg>

        <div class="legend">
          <span class="legend-item legend-item--accent">
            <span class="legend-line"></span>资产总值
          </span>
          <span class="legend-item legend-item--muted">
            <span class="legend-line legend-line--dashed"></span>投入总额
          </span>
        </div>
      </div>
    </section>

    <!-- Table -->
    <section class="table-section">
      <h3 class="section-title">逐年明细</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>年份</th>
              <th>投入总额</th>
              <th>资产总值</th>
              <th>收益</th>
            </tr>
          </thead>
          <tbody>
            {#each rows as row}
              <tr>
                <td class="year-cell">第 {row.year} 年</td>
                <td>¥ {fmtFull(row.totalInvested)}</td>
                <td class="balance-cell">¥ {fmtFull(row.balance)}</td>
                <td class="profit-cell">+ ¥ {fmtFull(row.profit)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  </div>
</div>

<style>
  .page-body {
    padding: 2rem 1rem 4rem;
    max-width: 860px;
    margin: 0 auto;
  }

  .intro {
    text-align: center;
    margin-bottom: 2.5rem;
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

  .tool-layout {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  /* Inputs */
  .inputs-panel {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 1rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 1.25rem;
    box-shadow: var(--shadow-sm);
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .field-group label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .field-group input,
  .field-group select {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-size: 0.95rem;
    padding: 0.45rem 0.6rem;
    width: 100%;
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.15s;
  }

  .field-group input:focus,
  .field-group select:focus {
    border-color: var(--accent);
  }

  /* Summary cards */
  .summary-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1rem;
  }

  .card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 1.1rem 1.2rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    box-shadow: var(--shadow-sm);
  }

  .card--accent {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, var(--bg-card));
  }

  .card--success {
    border-color: var(--success);
    background: color-mix(in srgb, var(--success) 8%, var(--bg-card));
  }

  .card--roi {
    border-color: var(--text-muted);
  }

  .card-label {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .card-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text);
    line-height: 1.2;
  }

  .card--accent .card-value {
    color: var(--accent);
  }

  .card--success .card-value {
    color: var(--success);
  }

  .card-sub {
    font-size: 0.75rem;
    color: var(--text-muted);
    word-break: break-all;
  }

  /* Chart */
  .chart-section {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 1.25rem;
    box-shadow: var(--shadow-sm);
  }

  .section-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text);
    margin: 0 0 1rem;
  }

  .chart-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .chart-wrap svg {
    width: 100%;
    height: auto;
    display: block;
    overflow: visible;
  }

  .legend {
    display: flex;
    gap: 1.5rem;
    justify-content: center;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.82rem;
    color: var(--text-muted);
  }

  .legend-line {
    display: inline-block;
    width: 28px;
    height: 2.5px;
    border-radius: 2px;
    background: var(--accent);
  }

  .legend-item--muted .legend-line {
    background: none;
    border-top: 2px dashed var(--text-muted);
  }

  /* Table */
  .table-section {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 1.25rem;
    box-shadow: var(--shadow-sm);
  }

  .table-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
    min-width: 440px;
  }

  thead th {
    text-align: right;
    padding: 0.5rem 0.75rem;
    font-weight: 600;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    border-bottom: 1px solid var(--border);
  }

  thead th:first-child {
    text-align: left;
  }

  tbody tr {
    border-bottom: 1px solid var(--border);
    transition: background 0.1s;
  }

  tbody tr:last-child {
    border-bottom: none;
  }

  tbody tr:hover {
    background: var(--bg-elevated);
  }

  tbody td {
    padding: 0.5rem 0.75rem;
    text-align: right;
    color: var(--text);
    white-space: nowrap;
  }

  tbody td:first-child {
    text-align: left;
    color: var(--text-muted);
  }

  .balance-cell {
    font-weight: 600;
    color: var(--accent) !important;
  }

  .profit-cell {
    color: var(--success) !important;
  }

  .year-cell {
    font-variant-numeric: tabular-nums;
  }
</style>
