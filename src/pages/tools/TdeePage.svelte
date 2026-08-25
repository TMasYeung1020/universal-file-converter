<script lang="ts">
  // ── types ──────────────────────────────────────────────────────────────────
  type Gender = 'male' | 'female';
  type Goal   = 'cut'  | 'maintain' | 'bulk';

  interface ActivityOption {
    label:      string;  // short, used in stat-card note
    shortLabel: string;  // full, used in select + table
    multiplier: number;
  }

  // ── constants ──────────────────────────────────────────────────────────────
  const activityOptions: ActivityOption[] = [
    { label: '久坐',    shortLabel: '久坐 (几乎不运动)',          multiplier: 1.2   },
    { label: '轻度活动', shortLabel: '轻度活动 (每周 1–3 天)',    multiplier: 1.375 },
    { label: '中度活动', shortLabel: '中度活动 (每周 3–5 天)',    multiplier: 1.55  },
    { label: '高度活动', shortLabel: '高度活动 (每周 6–7 天)',    multiplier: 1.725 },
    { label: '极高活动', shortLabel: '极高活动 (体力劳动/运动员)', multiplier: 1.9   },
  ];

  // ── state ──────────────────────────────────────────────────────────────────
  let gender:        Gender  = $state('male');
  let age:           number  = $state(25);
  let height:        number  = $state(170);
  let weight:        number  = $state(65);
  let activityIndex: number  = $state(1);
  let goal:          Goal    = $state('maintain');

  // ── derived: core metrics ──────────────────────────────────────────────────
  /** Mifflin-St Jeor BMR */
  const bmr = $derived.by(() => {
    const base = 10 * weight + 6.25 * height - 5 * age;
    return Math.round(gender === 'male' ? base + 5 : base - 161);
  });

  const tdee = $derived(
    Math.round(bmr * activityOptions[activityIndex].multiplier)
  );

  const targetCalories = $derived.by(() => {
    if (goal === 'cut')  return Math.round(tdee - 500);
    if (goal === 'bulk') return Math.round(tdee + 300);
    return tdee;
  });

  // ── derived: macros ────────────────────────────────────────────────────────
  const macroRatios = $derived.by(() => {
    if (goal === 'cut')  return { protein: 0.35, carbs: 0.40, fat: 0.25 };
    if (goal === 'bulk') return { protein: 0.30, carbs: 0.45, fat: 0.25 };
    return                      { protein: 0.25, carbs: 0.50, fat: 0.25 };
  });

  const macros = $derived.by(() => {
    const cals = targetCalories;
    const r    = macroRatios;
    return {
      proteinG: Math.round((cals * r.protein) / 4),
      carbsG:   Math.round((cals * r.carbs)   / 4),
      fatG:     Math.round((cals * r.fat)      / 9),
    };
  });

  // ── derived: BMI ───────────────────────────────────────────────────────────
  const bmi = $derived.by(() => {
    const hm = height / 100;
    return +(weight / (hm * hm)).toFixed(1);
  });

  const bmiInfo = $derived.by((): { label: string; cls: string } => {
    if (bmi < 18.5) return { label: '偏瘦', cls: 'bmi-thin' };
    if (bmi < 24.0) return { label: '正常', cls: 'bmi-normal' };
    if (bmi < 28.0) return { label: '偏胖', cls: 'bmi-overweight' };
    return                  { label: '肥胖', cls: 'bmi-obese' };
  });

  // ── derived: display labels ────────────────────────────────────────────────
  const goalLabel = $derived(
    goal === 'cut' ? '减脂' : goal === 'bulk' ? '增肌' : '维持'
  );
  const goalNote = $derived(
    goal === 'cut'  ? 'TDEE − 500 kcal' :
    goal === 'bulk' ? 'TDEE + 300 kcal' :
                      '维持当前体重'
  );
</script>

<div class="page-body">
  <!-- ── intro ──────────────────────────────────────────────────────────────── -->
  <div class="intro">
    <h2>TDEE 卡路里计算</h2>
    <p class="lede">
      基于 Mifflin-St Jeor 公式精确计算基础代谢率（BMR）与每日总能量消耗（TDEE），并按减脂、维持或增肌目标推算宏量营养素配比。
    </p>
  </div>

  <!-- ── two-column layout ──────────────────────────────────────────────────── -->
  <div class="calc-layout">

    <!-- ── input form ── -->
    <div class="card form-panel">
      <div class="form-grid">

        <!-- gender -->
        <div class="field">
          <span class="field-label">性别</span>
          <div class="radio-group">
            <label class="radio-opt">
              <input type="radio" name="tdee-gender" value="male" bind:group={gender} />
              <span class="radio-btn">男</span>
            </label>
            <label class="radio-opt">
              <input type="radio" name="tdee-gender" value="female" bind:group={gender} />
              <span class="radio-btn">女</span>
            </label>
          </div>
        </div>

        <!-- age -->
        <div class="field">
          <label class="field-label" for="tdee-age">年龄</label>
          <div class="input-wrap">
            <input id="tdee-age" type="number" min="10" max="100" bind:value={age} />
            <span class="unit">岁</span>
          </div>
        </div>

        <!-- height -->
        <div class="field">
          <label class="field-label" for="tdee-height">身高</label>
          <div class="input-wrap">
            <input id="tdee-height" type="number" min="100" max="250" bind:value={height} />
            <span class="unit">cm</span>
          </div>
        </div>

        <!-- weight -->
        <div class="field">
          <label class="field-label" for="tdee-weight">体重</label>
          <div class="input-wrap">
            <input id="tdee-weight" type="number" min="20" max="300" step="0.1" bind:value={weight} />
            <span class="unit">kg</span>
          </div>
        </div>

        <!-- activity -->
        <div class="field field-full">
          <label class="field-label" for="tdee-activity">活动水平</label>
          <div class="select-wrap">
            <select id="tdee-activity" bind:value={activityIndex}>
              {#each activityOptions as opt, i}
                <option value={i}>{opt.shortLabel}</option>
              {/each}
            </select>
          </div>
        </div>

        <!-- goal -->
        <div class="field field-full">
          <label class="field-label" for="tdee-goal">目标</label>
          <div class="select-wrap">
            <select id="tdee-goal" bind:value={goal}>
              <option value="cut">减脂</option>
              <option value="maintain">维持</option>
              <option value="bulk">增肌</option>
            </select>
          </div>
        </div>

      </div><!-- /form-grid -->
    </div><!-- /form-panel -->

    <!-- ── results ── -->
    <div class="results-panel">

      <!-- BMI row -->
      <div class="card bmi-row">
        <div class="bmi-main">
          <span class="bmi-title">BMI</span>
          <span class="bmi-val">{bmi}</span>
          <span class="bmi-badge {bmiInfo.cls}">{bmiInfo.label}</span>
        </div>
        <span class="bmi-formula">
          {weight} kg ÷ ({(height / 100).toFixed(2)} m)²
        </span>
      </div>

      <!-- Stat cards: BMR / TDEE / Target -->
      <div class="stat-grid">

        <div class="stat-card">
          <span class="stat-label">基础代谢率 BMR</span>
          <span class="stat-value">{bmr.toLocaleString('zh-CN')}</span>
          <span class="stat-unit">千卡 / 天</span>
          <span class="stat-note">完全静息状态</span>
        </div>

        <div class="stat-card stat-card--tdee">
          <span class="stat-label">每日总消耗 TDEE</span>
          <span class="stat-value">{tdee.toLocaleString('zh-CN')}</span>
          <span class="stat-unit">千卡 / 天</span>
          <span class="stat-note">{activityOptions[activityIndex].label}</span>
        </div>

        <div class="stat-card stat-card--goal">
          <span class="stat-label">目标热量（{goalLabel}）</span>
          <span class="stat-value">{targetCalories.toLocaleString('zh-CN')}</span>
          <span class="stat-unit">千卡 / 天</span>
          <span class="stat-note">{goalNote}</span>
        </div>

      </div>

      <!-- Macro breakdown -->
      <div class="card section-card">
        <h3 class="section-title">宏量营养素分配</h3>
        <div class="macro-list">

          <div class="macro-row">
            <span class="dot dot--protein"></span>
            <span class="macro-name">蛋白质</span>
            <div class="bar-track">
              <div class="bar-fill bar-fill--protein"
                   style="width:{macroRatios.protein * 100}%"></div>
            </div>
            <span class="macro-pct">{Math.round(macroRatios.protein * 100)}%</span>
            <span class="macro-g">{macros.proteinG} g</span>
          </div>

          <div class="macro-row">
            <span class="dot dot--carbs"></span>
            <span class="macro-name">碳水化合物</span>
            <div class="bar-track">
              <div class="bar-fill bar-fill--carbs"
                   style="width:{macroRatios.carbs * 100}%"></div>
            </div>
            <span class="macro-pct">{Math.round(macroRatios.carbs * 100)}%</span>
            <span class="macro-g">{macros.carbsG} g</span>
          </div>

          <div class="macro-row">
            <span class="dot dot--fat"></span>
            <span class="macro-name">脂肪</span>
            <div class="bar-track">
              <div class="bar-fill bar-fill--fat"
                   style="width:{macroRatios.fat * 100}%"></div>
            </div>
            <span class="macro-pct">{Math.round(macroRatios.fat * 100)}%</span>
            <span class="macro-g">{macros.fatG} g</span>
          </div>

        </div>
      </div>

      <!-- Reference table -->
      <div class="card section-card">
        <h3 class="section-title">各活动水平 TDEE 对照表</h3>
        <table class="ref-table">
          <thead>
            <tr>
              <th>活动水平</th>
              <th class="num-col">倍数</th>
              <th class="num-col">TDEE（千卡）</th>
            </tr>
          </thead>
          <tbody>
            {#each activityOptions as opt, i}
              <tr class:active-row={i === activityIndex}>
                <td>{opt.shortLabel}</td>
                <td class="num-col">×{opt.multiplier}</td>
                <td class="num-col">
                  {Math.round(bmr * opt.multiplier).toLocaleString('zh-CN')}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

    </div><!-- /results-panel -->
  </div><!-- /calc-layout -->
</div>

<style>
  /* ── page shell ───────────────────────────────────────────────────────────── */
  .page-body {
    max-width: 980px;
    margin: 0 auto;
    padding: 2rem 1.25rem 4rem;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
  }

  /* ── intro ────────────────────────────────────────────────────────────────── */
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

  /* ── shared card base ─────────────────────────────────────────────────────── */
  .card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
  }

  /* ── two-column layout ────────────────────────────────────────────────────── */
  .calc-layout {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 1.5rem;
    align-items: start;
  }

  @media (max-width: 720px) {
    .calc-layout {
      grid-template-columns: 1fr;
    }
  }

  /* ── form panel ───────────────────────────────────────────────────────────── */
  .form-panel {
    padding: 1.35rem;
    position: sticky;
    top: 1rem;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .field-full {
    grid-column: 1 / -1;
  }

  .field-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  /* number inputs */
  .input-wrap {
    display: flex;
    align-items: stretch;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg-elevated);
    overflow: hidden;
  }

  .input-wrap input {
    flex: 1;
    min-width: 0;
    padding: 0.42rem 0.6rem;
    background: transparent;
    border: none;
    outline: none;
    font-size: 0.92rem;
    color: var(--text);
    font-family: inherit;
  }

  .input-wrap input:focus {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
    border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  }

  .unit {
    padding: 0 0.55rem;
    font-size: 0.78rem;
    color: var(--text-muted);
    border-left: 1px solid var(--border);
    display: flex;
    align-items: center;
    white-space: nowrap;
    background: var(--bg-elevated);
  }

  /* select */
  .select-wrap {
    position: relative;
  }

  .select-wrap::after {
    content: '';
    position: absolute;
    right: 0.7rem;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 5px solid var(--text-muted);
    pointer-events: none;
  }

  select {
    appearance: none;
    width: 100%;
    padding: 0.42rem 2rem 0.42rem 0.65rem;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-size: 0.9rem;
    font-family: inherit;
    cursor: pointer;
    outline: none;
  }

  select:focus {
    border-color: var(--accent);
  }

  /* radio pills */
  .radio-group {
    display: flex;
    gap: 0.45rem;
  }

  .radio-opt {
    flex: 1;
    cursor: pointer;
  }

  .radio-opt input[type='radio'] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  .radio-btn {
    display: block;
    text-align: center;
    padding: 0.38rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg-elevated);
    font-size: 0.92rem;
    color: var(--text-muted);
    transition: background 0.15s, color 0.15s, border-color 0.15s;
    cursor: pointer;
  }

  .radio-opt input[type='radio']:checked + .radio-btn {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
    font-weight: 600;
  }

  /* ── results panel ────────────────────────────────────────────────────────── */
  .results-panel {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* BMI row */
  .bmi-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.6rem;
    padding: 0.85rem 1.1rem;
  }

  .bmi-main {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .bmi-title {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--text-muted);
  }

  .bmi-val {
    font-size: 1.6rem;
    font-weight: 800;
    color: var(--text);
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  .bmi-badge {
    padding: 0.18rem 0.65rem;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .bmi-thin       { background: color-mix(in srgb, var(--accent)  15%, transparent); color: var(--accent); }
  .bmi-normal     { background: color-mix(in srgb, var(--success) 15%, transparent); color: var(--success); }
  .bmi-overweight { background: #fef3c7; color: #d97706; }
  .bmi-obese      { background: color-mix(in srgb, var(--error)   15%, transparent); color: var(--error); }

  .bmi-formula {
    font-size: 0.76rem;
    color: var(--text-muted);
    font-family: ui-monospace, 'Cascadia Code', monospace;
  }

  /* stat cards */
  .stat-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.875rem;
  }

  @media (max-width: 520px) {
    .stat-grid { grid-template-columns: 1fr; }
  }

  .stat-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    padding: 1rem 0.9rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.15rem;
    transition: box-shadow 0.15s;
  }

  .stat-card:hover {
    box-shadow: var(--shadow-sm), 0 0 0 1px var(--border);
  }

  .stat-card--tdee {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 5%, var(--bg-card));
  }

  .stat-card--goal {
    border-color: var(--success);
    background: color-mix(in srgb, var(--success) 5%, var(--bg-card));
  }

  .stat-label {
    font-size: 0.72rem;
    color: var(--text-muted);
    font-weight: 500;
    line-height: 1.35;
  }

  .stat-value {
    font-size: 1.875rem;
    font-weight: 700;
    color: var(--text);
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
    margin-top: 0.2rem;
  }

  .stat-card--tdee .stat-value { color: var(--accent); }
  .stat-card--goal .stat-value { color: var(--success); }

  .stat-unit {
    font-size: 0.7rem;
    color: var(--text-muted);
  }

  .stat-note {
    font-size: 0.7rem;
    color: var(--text-muted);
    font-style: italic;
    margin-top: 0.2rem;
  }

  /* section cards */
  .section-card {
    padding: 1.1rem 1.2rem;
  }

  .section-title {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--text-muted);
    margin: 0 0 0.9rem;
  }

  /* macro bars */
  .macro-list {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }

  .macro-row {
    display: grid;
    grid-template-columns: 10px auto 1fr 3rem 4.5rem;
    align-items: center;
    gap: 0.55rem;
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .dot--protein { background: #6366f1; }
  .dot--carbs   { background: #f59e0b; }
  .dot--fat     { background: #10b981; }

  .macro-name {
    font-size: 0.87rem;
    color: var(--text);
    white-space: nowrap;
  }

  .bar-track {
    height: 7px;
    background: var(--bg-elevated);
    border-radius: 4px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.35s ease;
  }

  .bar-fill--protein { background: #6366f1; }
  .bar-fill--carbs   { background: #f59e0b; }
  .bar-fill--fat     { background: #10b981; }

  .macro-pct {
    font-size: 0.77rem;
    color: var(--text-muted);
    text-align: right;
  }

  .macro-g {
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--text);
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  /* reference table */
  .ref-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }

  .ref-table th {
    text-align: left;
    padding: 0.35rem 0.55rem;
    font-size: 0.73rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid var(--border);
  }

  .ref-table td {
    padding: 0.42rem 0.55rem;
    color: var(--text);
    border-bottom: 1px solid var(--border);
    transition: background 0.15s;
  }

  .ref-table tbody tr:last-child td {
    border-bottom: none;
  }

  .ref-table tbody tr.active-row td {
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    font-weight: 600;
  }

  .ref-table tbody tr.active-row td:first-child {
    border-left: 3px solid var(--accent);
    padding-left: calc(0.55rem - 3px);
  }

  .num-col {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .ref-table th.num-col {
    text-align: right;
  }

  /* ── responsive tweaks ────────────────────────────────────────────────────── */
  @media (max-width: 480px) {
    .page-body {
      padding: 1.25rem 1rem 3rem;
      gap: 1.25rem;
    }

    .intro h2 {
      font-size: 1.4rem;
    }

    .macro-row {
      grid-template-columns: 10px auto 1fr 2.5rem 4rem;
    }
  }
</style>
