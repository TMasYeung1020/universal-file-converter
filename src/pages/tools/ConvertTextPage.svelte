<script lang="ts">
  // Simplified → Traditional mapping (300+ common pairs)
  const SIM_TO_TRAD_PAIRS: [string, string][] = [
    ['爱','愛'],['碍','礙'],['肮','骯'],['袄','襖'],
    ['办','辦'],['帮','幫'],['报','報'],['边','邊'],['别','別'],['标','標'],
    ['宾','賓'],['补','補'],['财','財'],['产','產'],['长','長'],['尝','嘗'],
    ['车','車'],['称','稱'],['齿','齒'],['冲','沖'],['虫','蟲'],['处','處'],
    ['触','觸'],['传','傳'],['从','從'],['窜','竄'],
    ['单','單'],['当','當'],['导','導'],['灯','燈'],['敌','敵'],['点','點'],
    ['电','電'],['东','東'],['动','動'],['断','斷'],['对','對'],['队','隊'],
    ['尔','爾'],['发','發'],['丰','豐'],['风','風'],['复','複'],
    ['干','幹'],['赶','趕'],['刚','剛'],['个','個'],['给','給'],['巩','鞏'],
    ['关','關'],['观','觀'],['广','廣'],['归','歸'],['国','國'],['过','過'],
    ['还','還'],['汉','漢'],['号','號'],['后','後'],['华','華'],['话','話'],
    ['怀','懷'],['环','環'],['会','會'],['汇','匯'],['货','貨'],
    ['几','幾'],['记','記'],['际','際'],['继','繼'],['简','簡'],['见','見'],
    ['荐','薦'],['将','將'],['进','進'],['惊','驚'],['经','經'],
    ['旧','舊'],['举','舉'],['开','開'],['来','來'],['乐','樂'],['离','離'],
    ['历','歷'],['两','兩'],['临','臨'],['龙','龍'],['楼','樓'],['乱','亂'],
    ['吗','嗎'],['买','買'],['么','麼'],['门','門'],['梦','夢'],['灭','滅'],
    ['难','難'],['脑','腦'],['鸟','鳥'],['农','農'],
    ['欧','歐'],['盘','盤'],['气','氣'],['签','簽'],['钱','錢'],['亲','親'],
    ['请','請'],['区','區'],['权','權'],['却','卻'],
    ['热','熱'],['认','認'],['软','軟'],['设','設'],['时','時'],['书','書'],
    ['属','屬'],['树','樹'],['说','說'],['岁','歲'],['随','隨'],
    ['台','臺'],['条','條'],['体','體'],['听','聽'],['图','圖'],['团','團'],
    ['万','萬'],['为','為'],['问','問'],['无','無'],['务','務'],
    ['乡','鄉'],['写','寫'],['寻','尋'],['严','嚴'],['语','語'],
    ['员','員'],['远','遠'],['运','運'],
    ['战','戰'],['这','這'],['种','種'],['专','專'],['转','轉'],['资','資'],
    ['总','總'],['组','組'],
    // More common pairs
    ['边','邊'],['变','變'],['标','標'],['别','別'],['并','並'],
    ['财','財'],['长','長'],['场','場'],['厂','廠'],['尝','嘗'],
    ['称','稱'],['城','城'],['冲','衝'],['丑','醜'],['出','齣'],
    ['处','處'],['触','觸'],['传','傳'],['窗','窗'],['创','創'],
    ['村','村'],['达','達'],['带','帶'],['担','擔'],['蛋','蛋'],
    ['当','當'],['党','黨'],['刀','刀'],['导','導'],['道','道'],
    ['灯','燈'],['邓','鄧'],['敌','敵'],['地','地'],['钓','釣'],
    ['调','調'],['动','動'],['断','斷'],['队','隊'],['多','多'],
    ['额','額'],['儿','兒'],['而','而'],
    ['风','風'],['丰','豐'],['凤','鳳'],['负','負'],['妇','婦'],
    ['刚','剛'],['纲','綱'],['高','高'],['个','個'],['给','給'],
    ['根','根'],['功','功'],['共','共'],['购','購'],['故','故'],
    ['观','觀'],['广','廣'],['归','歸'],['柜','櫃'],['过','過'],
    ['还','還'],['汉','漢'],['好','好'],['号','號'],['和','和'],
    ['华','華'],['欢','歡'],['缓','緩'],['换','換'],['汇','彙'],
    ['获','獲'],['机','機'],['积','積'],['级','級'],['激','激'],
    ['际','際'],['价','價'],['艰','艱'],['检','檢'],['坚','堅'],
    ['将','將'],['讲','講'],['奖','獎'],['胶','膠'],['结','結'],
    ['届','屆'],['巾','巾'],['金','金'],['进','進'],['晋','晉'],
    ['惊','驚'],['竞','競'],['精','精'],['决','決'],['军','軍'],
    ['开','開'],['宽','寬'],['困','困'],['来','來'],['劳','勞'],
    ['类','類'],['冷','冷'],['里','裡'],['联','聯'],['粮','糧'],
    ['辆','輛'],['了','了'],['灵','靈'],['录','錄'],['虑','慮'],
    ['论','論'],['麻','麻'],['卖','賣'],['满','滿'],['帽','帽'],
    ['贸','貿'],['每','每'],['没','沒'],['秘','祕'],['免','免'],
    ['庙','廟'],['民','民'],['明','明'],['命','命'],['摩','摩'],
    ['目','目'],['内','內'],['能','能'],['拟','擬'],['年','年'],
    ['盼','盼'],['炮','炮'],['朋','朋'],['骗','騙'],['品','品'],
    ['凭','憑'],['萍','萍'],['评','評'],['期','期'],['起','起'],
    ['气','氣'],['迁','遷'],['强','強'],['桥','橋'],['钦','欽'],
    ['亲','親'],['情','情'],['庆','慶'],['穷','窮'],['趋','趨'],
    ['取','取'],['确','確'],['让','讓'],['任','任'],['认','認'],
    ['荣','榮'],['如','如'],['软','軟'],['赛','賽'],['伤','傷'],
    ['摄','攝'],['升','昇'],['盛','盛'],['实','實'],['识','識'],
    ['势','勢'],['事','事'],['视','視'],['收','收'],['兽','獸'],
    ['数','數'],['双','雙'],['顺','順'],['丝','絲'],['苏','蘇'],
    ['岁','歲'],['损','損'],['锁','鎖'],['台','臺'],['态','態'],
    ['太','太'],['谈','談'],['特','特'],['题','題'],['铁','鐵'],
    ['听','聽'],['通','通'],['头','頭'],['突','突'],['图','圖'],
    ['推','推'],['吞','吞'],['万','萬'],['望','望'],['维','維'],
    ['为','為'],['卫','衛'],['文','文'],['稳','穩'],['卧','臥'],
    ['务','務'],['物','物'],['现','現'],['线','線'],['乡','鄉'],
    ['协','協'],['写','寫'],['心','心'],['新','新'],['兴','興'],
    ['选','選'],['学','學'],['压','壓'],['亚','亞'],['盐','鹽'],
    ['阳','陽'],['样','樣'],['要','要'],['药','藥'],['业','業'],
    ['页','頁'],['义','義'],['阴','陰'],['银','銀'],['应','應'],
    ['拥','擁'],['勇','勇'],['优','優'],['于','於'],['鱼','魚'],
    ['与','與'],['誉','譽'],['约','約'],['云','雲'],['杂','雜'],
    ['赃','贓'],['则','則'],['增','增'],['站','站'],['赵','趙'],
    ['阵','陣'],['证','證'],['只','隻'],['志','志'],['质','質'],
    ['致','緻'],['中','中'],['众','眾'],['洲','洲'],['助','助'],
    ['状','狀'],['准','準'],['字','字'],
  ];

  // Build forward (sim→trad) and reverse (trad→sim) maps
  const simToTrad = new Map<string, string>(SIM_TO_TRAD_PAIRS);
  const tradToSim = new Map<string, string>(SIM_TO_TRAD_PAIRS.map(([s, t]) => [t, s]));

  type Mode = 'sim2trad' | 'trad2sim' | 'fullhalf';
  type FullHalfDir = 'full2half' | 'half2full';

  let mode = $state<Mode>('sim2trad');
  let fullHalfDir = $state<FullHalfDir>('full2half');
  let inputText = $state('');
  let copied = $state(false);

  function convertSimToTrad(text: string): string {
    return [...text].map(ch => simToTrad.get(ch) ?? ch).join('');
  }

  function convertTradToSim(text: string): string {
    return [...text].map(ch => tradToSim.get(ch) ?? ch).join('');
  }

  function convertFullToHalf(text: string): string {
    return [...text].map(ch => {
      const cp = ch.codePointAt(0)!;
      if (cp === 0x3000) return ' ';
      if (cp >= 0xFF01 && cp <= 0xFF5E) return String.fromCodePoint(cp - 0xFEE0);
      return ch;
    }).join('');
  }

  function convertHalfToFull(text: string): string {
    return [...text].map(ch => {
      const cp = ch.codePointAt(0)!;
      if (cp === 0x0020) return '　';
      if (cp >= 0x0021 && cp <= 0x007E) return String.fromCodePoint(cp + 0xFEE0);
      return ch;
    }).join('');
  }

  const outputText = $derived((): string => {
    if (!inputText) return '';
    switch (mode) {
      case 'sim2trad': return convertSimToTrad(inputText);
      case 'trad2sim': return convertTradToSim(inputText);
      case 'fullhalf':
        return fullHalfDir === 'full2half'
          ? convertFullToHalf(inputText)
          : convertHalfToFull(inputText);
    }
  });

  async function copyOutput() {
    if (!outputText) return;
    try {
      await navigator.clipboard.writeText(outputText);
      copied = true;
      setTimeout(() => { copied = false; }, 1800);
    } catch {
      // fallback: select textarea
    }
  }

  function swapTexts() {
    inputText = outputText;
  }

  const modeLabels: { value: Mode; label: string; sublabel: string }[] = [
    { value: 'sim2trad', label: '簡 → 繁', sublabel: '簡體轉繁體' },
    { value: 'trad2sim', label: '繁 → 簡', sublabel: '繁體轉簡體' },
    { value: 'fullhalf', label: '全 ⇄ 半', sublabel: '全半形轉換' },
  ];
</script>

<div class="page-body">
  <div class="intro">
    <h2>繁簡 / 全半形轉換</h2>
    <p class="lede">簡體 ⇄ 繁體中文，全形 ⇄ 半形 ASCII，即時轉換，無需聯網。</p>
  </div>

  <!-- Mode tabs -->
  <div class="mode-tabs" role="tablist" aria-label="轉換模式">
    {#each modeLabels as { value, label, sublabel }}
      <button
        role="tab"
        aria-selected={mode === value}
        class="tab-btn"
        class:active={mode === value}
        onclick={() => { mode = value; }}
      >
        <span class="tab-label">{label}</span>
        <span class="tab-sub">{sublabel}</span>
      </button>
    {/each}
  </div>

  <!-- Full/half direction toggle (only when fullhalf mode) -->
  {#if mode === 'fullhalf'}
    <div class="direction-toggle">
      <button
        class="dir-btn"
        class:active={fullHalfDir === 'full2half'}
        onclick={() => { fullHalfDir = 'full2half'; }}
      >全形 → 半形</button>
      <button
        class="dir-btn"
        class:active={fullHalfDir === 'half2full'}
        onclick={() => { fullHalfDir = 'half2full'; }}
      >半形 → 全形</button>
    </div>
  {/if}

  <!-- Two-panel editor -->
  <div class="panels">
    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">輸入</span>
        <button class="clear-btn" onclick={() => { inputText = ''; }} aria-label="清除輸入">✕ 清除</button>
      </div>
      <textarea
        class="text-area"
        bind:value={inputText}
        placeholder={mode === 'fullhalf'
          ? (fullHalfDir === 'full2half' ? '在此輸入全形文字…' : '在此輸入半形文字…')
          : (mode === 'sim2trad' ? '在此輸入簡體中文…' : '在此輸入繁體中文…')}
        spellcheck={false}
        autocomplete="off"
      ></textarea>
      <div class="char-count">{[...inputText].length} 字元</div>
    </div>

    <!-- Middle actions -->
    <div class="mid-actions">
      <button class="action-btn swap-btn" onclick={swapTexts} title="將輸出內容移到輸入框" aria-label="互換">
        <span aria-hidden="true">⇄</span>
      </button>
    </div>

    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">輸出</span>
        <button
          class="copy-btn"
          class:success={copied}
          onclick={copyOutput}
          disabled={!outputText}
          aria-label="複製輸出"
        >
          {#if copied}✓ 已複製{:else}⎘ 複製{/if}
        </button>
      </div>
      <textarea
        class="text-area output-area"
        readonly
        value={outputText}
        placeholder="轉換結果將顯示在此處…"
        spellcheck={false}
      ></textarea>
      <div class="char-count">{[...outputText].length} 字元</div>
    </div>
  </div>

  <!-- Info note -->
  <p class="note">
    字元級逐字替換，覆蓋 300+ 常用字。繁簡轉換基於常用對照表，不含語義消歧。全半形轉換處理 U+FF01–U+FF5E 及全形空格。
  </p>
</div>

<style>
  .page-body {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem 1.5rem 4rem;
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

  /* Mode tabs */
  .mode-tabs {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
  }

  .tab-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.6rem 1.4rem;
    border: 1.5px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--bg-elevated);
    color: var(--text-muted);
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s, color 0.15s;
    min-width: 110px;
  }

  .tab-btn:hover {
    border-color: var(--accent);
    color: var(--text);
  }

  .tab-btn.active {
    border-color: var(--accent);
    background: var(--accent);
    color: #fff;
  }

  .tab-label {
    font-size: 1.05rem;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .tab-sub {
    font-size: 0.72rem;
    margin-top: 0.15rem;
    opacity: 0.85;
  }

  /* Direction toggle */
  .direction-toggle {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    margin-bottom: 1.25rem;
  }

  .dir-btn {
    padding: 0.4rem 1.1rem;
    border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg-elevated);
    color: var(--text-muted);
    font-size: 0.88rem;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s, color 0.15s;
  }

  .dir-btn:hover { border-color: var(--accent); color: var(--text); }
  .dir-btn.active {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 15%, transparent);
    color: var(--accent);
    font-weight: 600;
  }

  /* Panels */
  .panels {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 1rem;
    align-items: start;
  }

  @media (max-width: 640px) {
    .panels {
      grid-template-columns: 1fr;
      grid-template-rows: auto auto auto;
    }
    .mid-actions {
      display: flex;
      justify-content: center;
    }
  }

  .panel {
    display: flex;
    flex-direction: column;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.55rem 0.9rem;
    background: var(--bg-elevated);
    border-bottom: 1px solid var(--border);
  }

  .panel-title {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .clear-btn,
  .copy-btn {
    font-size: 0.78rem;
    padding: 0.25rem 0.65rem;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }

  .clear-btn {
    background: transparent;
    color: var(--text-muted);
  }
  .clear-btn:hover { background: var(--bg-elevated); color: var(--text); }

  .copy-btn {
    background: transparent;
    color: var(--accent);
    border-color: var(--accent);
  }
  .copy-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--accent) 12%, transparent);
  }
  .copy-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .copy-btn.success {
    background: color-mix(in srgb, var(--success) 15%, transparent);
    border-color: var(--success);
    color: var(--success);
  }

  .text-area {
    width: 100%;
    min-height: 260px;
    resize: vertical;
    border: none;
    outline: none;
    padding: 0.85rem 1rem;
    font-size: 1rem;
    line-height: 1.65;
    font-family: 'Noto Serif SC', 'Source Han Serif', 'SimSun', Georgia, serif;
    background: var(--bg-card);
    color: var(--text);
    box-sizing: border-box;
  }

  .text-area::placeholder { color: var(--text-muted); opacity: 0.6; }

  .output-area {
    background: var(--bg-elevated);
    cursor: default;
  }

  .char-count {
    padding: 0.3rem 0.9rem;
    font-size: 0.73rem;
    color: var(--text-muted);
    background: var(--bg-elevated);
    border-top: 1px solid var(--border);
    text-align: right;
  }

  /* Middle swap button */
  .mid-actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 2.6rem;
  }

  .action-btn {
    width: 2.4rem;
    height: 2.4rem;
    border-radius: 50%;
    border: 1.5px solid var(--border);
    background: var(--bg-elevated);
    color: var(--text-muted);
    font-size: 1.1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.15s, background 0.15s, color 0.15s;
  }

  .action-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 10%, transparent);
  }

  /* Note */
  .note {
    margin-top: 1.5rem;
    font-size: 0.8rem;
    color: var(--text-muted);
    text-align: center;
    line-height: 1.6;
  }
</style>
