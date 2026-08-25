<script lang="ts">
  import * as yaml from 'js-yaml';
  import Papa from 'papaparse';

  type Status = 'idle' | 'ok' | 'error' | 'working';

  let input = $state('');
  let output = $state('');
  let status = $state<Status>('idle');
  let errorMsg = $state('');
  let copyMsg = $state('');

  const statusLabel = $derived(status !== 'idle' ? status : null);

  $effect(() => {
    output;
    copyMsg = '';
  });

  function tryParse(): unknown {
    return JSON.parse(input.trim());
  }

  function succeed(result: string) {
    output = result;
    status = 'ok';
    errorMsg = '';
  }

  function fail(msg: string) {
    output = '';
    status = 'error';
    errorMsg = msg;
  }

  function handleFormat() {
    status = 'working';
    try {
      succeed(JSON.stringify(tryParse(), null, 2));
    } catch (e) {
      fail((e as Error).message);
    }
  }

  function handleMinify() {
    status = 'working';
    try {
      succeed(JSON.stringify(tryParse()));
    } catch (e) {
      fail((e as Error).message);
    }
  }

  function handleValidate() {
    status = 'working';
    try {
      tryParse();
      output = '✅ 有效的 JSON';
      status = 'ok';
      errorMsg = '';
    } catch (e) {
      output = '❌ 无效的 JSON';
      status = 'error';
      errorMsg = (e as Error).message;
    }
  }

  function handleToYaml() {
    status = 'working';
    try {
      succeed(yaml.dump(tryParse()));
    } catch (e) {
      fail((e as Error).message);
    }
  }

  function handleToCsv() {
    status = 'working';
    try {
      const parsed = tryParse();
      if (!Array.isArray(parsed)) {
        fail('顶层数据必须是数组才能转换为 CSV');
        return;
      }
      succeed(Papa.unparse(parsed as object[]));
    } catch (e) {
      fail((e as Error).message);
    }
  }

  function handleClear() {
    input = '';
    output = '';
    status = 'idle';
    errorMsg = '';
    copyMsg = '';
  }

  async function handleCopy() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      copyMsg = '已复制！';
      setTimeout(() => { copyMsg = ''; }, 2000);
    } catch {
      copyMsg = '复制失败';
    }
  }
</script>

<div class="page-body">
  <div class="intro">
    <h2>JSON 工具</h2>
    <p class="lede">格式化 · 压缩 · 校验 · 转 YAML / CSV · 纯浏览器处理</p>
  </div>

  <div class="toolbar">
    <button class="btn-primary" onclick={handleFormat}>格式化</button>
    <button class="btn-primary" onclick={handleMinify}>压缩</button>
    <button class="btn-primary" onclick={handleValidate}>校验</button>
    <button class="btn-primary" onclick={handleToYaml}>转 YAML</button>
    <button class="btn-primary" onclick={handleToCsv}>转 CSV</button>
    <button class="ghost" onclick={handleClear}>清空</button>
    <button class="ghost btn-copy" onclick={handleCopy}>{copyMsg || '复制结果'}</button>
    {#if statusLabel}
      <span class="badge badge--{statusLabel}">
        {statusLabel === 'ok' ? '✓' : statusLabel === 'error' ? '✗' : '…'}
      </span>
    {/if}
  </div>

  {#if status === 'error' && errorMsg}
    <p class="error-text">❌ {errorMsg}</p>
  {/if}

  <div class="panels">
    <div class="panel">
      <label class="panel-label" for="json-input">输入 JSON</label>
      <textarea
        id="json-input"
        class="code-area"
        bind:value={input}
        placeholder={'粘贴或输入 JSON，例如：\n{\n  "key": "value"\n}'}
        spellcheck="false"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
      ></textarea>
    </div>
    <div class="panel">
      <label class="panel-label" for="json-output">输出结果</label>
      <textarea
        id="json-output"
        class="code-area code-area--output"
        value={output}
        readonly
        placeholder="结果将显示在这里…"
        spellcheck="false"
      ></textarea>
    </div>
  </div>
</div>

<style>
  .page-body {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .intro { text-align: center; padding: 8px 0 4px; }
  .intro h2 { margin: 0 0 6px; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
  .lede { color: var(--text-muted); margin: 0; font-size: 14px; }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .toolbar button {
    padding: 6px 14px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid var(--border);
    transition: opacity 0.15s, border-color 0.15s, color 0.15s;
  }

  .btn-primary {
    background: var(--accent);
    color: #fff;
    border-color: var(--accent);
  }
  .btn-primary:hover { opacity: 0.82; }

  .ghost {
    background: var(--bg-card);
    color: var(--text-muted);
  }
  .ghost:hover { color: var(--text); border-color: var(--accent); }

  .btn-copy { min-width: 80px; text-align: center; }

  .badge {
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    border: 1px solid transparent;
  }
  .badge--ok {
    background: color-mix(in srgb, var(--success) 15%, transparent);
    color: var(--success);
    border-color: var(--success);
  }
  .badge--error {
    background: color-mix(in srgb, var(--error) 15%, transparent);
    color: var(--error);
    border-color: var(--error);
  }
  .badge--working {
    background: color-mix(in srgb, var(--accent) 15%, transparent);
    color: var(--accent);
    border-color: var(--accent);
  }

  .error-text { margin: 0; font-size: 13px; color: var(--error); }

  .panels {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .panel { display: flex; flex-direction: column; gap: 6px; }
  .panel-label { font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }

  .code-area {
    height: 420px;
    resize: vertical;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--bg-card);
    color: inherit;
    font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace;
    font-size: 13px;
    line-height: 1.65;
    padding: 12px;
    outline: none;
    transition: border-color 0.15s;
  }
  .code-area:focus { border-color: var(--accent); }
  .code-area--output { background: color-mix(in srgb, var(--bg-card) 60%, transparent); }

  @media (max-width: 640px) {
    .panels { grid-template-columns: 1fr; }
    .code-area { height: 260px; }
  }
</style>
