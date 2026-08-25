<script lang="ts">
  type Tab = 'text' | 'file' | 'url';
  let activeTab = $state<Tab>('text');

  // ── Text encode/decode ────────────────────────────────────────────────────
  let textInput = $state('');
  let textOutput = $state('');
  let textMode = $state<'encode' | 'decode'>('encode');
  let textError = $state('');
  let textCopy = $state('');

  function runText() {
    textError = '';
    textOutput = '';
    try {
      if (textMode === 'encode') {
        textOutput = btoa(unescape(encodeURIComponent(textInput)));
      } else {
        textOutput = decodeURIComponent(escape(atob(textInput.trim())));
      }
    } catch (e) {
      textError = (e as Error).message;
    }
  }

  async function copyText() {
    if (!textOutput) return;
    await navigator.clipboard.writeText(textOutput);
    textCopy = '已复制！';
    setTimeout(() => { textCopy = ''; }, 2000);
  }

  function swapTextMode() {
    textMode = textMode === 'encode' ? 'decode' : 'encode';
    [textInput, textOutput] = [textOutput, textInput];
    textError = '';
  }

  // ── File encode ───────────────────────────────────────────────────────────
  let fileName = $state('');
  let fileBase64 = $state('');
  let fileError = $state('');
  let fileCopy = $state('');
  let fileDragOver = $state(false);

  async function handleFileInput(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    if (input.files?.[0]) await encodeFile(input.files[0]);
  }

  async function handleFileDrop(e: DragEvent) {
    e.preventDefault();
    fileDragOver = false;
    if (e.dataTransfer?.files[0]) await encodeFile(e.dataTransfer.files[0]);
  }

  async function encodeFile(file: File) {
    fileError = '';
    fileBase64 = '';
    fileName = file.name;
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      fileBase64 = btoa(binary);
    } catch (e) {
      fileError = (e as Error).message;
    }
  }

  async function copyFile() {
    if (!fileBase64) return;
    await navigator.clipboard.writeText(fileBase64);
    fileCopy = '已复制！';
    setTimeout(() => { fileCopy = ''; }, 2000);
  }

  // ── URL encode/decode ─────────────────────────────────────────────────────
  let urlInput = $state('');
  let urlOutput = $state('');
  let urlMode = $state<'encode' | 'decode'>('encode');
  let urlError = $state('');
  let urlCopy = $state('');

  function runUrl() {
    urlError = '';
    urlOutput = '';
    try {
      if (urlMode === 'encode') {
        urlOutput = encodeURIComponent(urlInput);
      } else {
        urlOutput = decodeURIComponent(urlInput);
      }
    } catch (e) {
      urlError = (e as Error).message;
    }
  }

  async function copyUrl() {
    if (!urlOutput) return;
    await navigator.clipboard.writeText(urlOutput);
    urlCopy = '已复制！';
    setTimeout(() => { urlCopy = ''; }, 2000);
  }
</script>

<div class="page-body">
  <div class="intro">
    <h2>Base64 / URL 编解码</h2>
    <p class="lede">文字或文件 ↔ Base64 · URL 编解码 · 纯浏览器处理，无需上传</p>
  </div>

  <div class="tabs" role="tablist">
    <button role="tab" class:active={activeTab === 'text'} onclick={() => { activeTab = 'text'; }}>文字 Base64</button>
    <button role="tab" class:active={activeTab === 'file'} onclick={() => { activeTab = 'file'; }}>文件 Base64</button>
    <button role="tab" class:active={activeTab === 'url'} onclick={() => { activeTab = 'url'; }}>URL 编解码</button>
  </div>

  <!-- Text tab -->
  {#if activeTab === 'text'}
    <div class="tab-panel">
      <div class="mode-row">
        <span class="mode-label">{textMode === 'encode' ? '编码 (Text → Base64)' : '解码 (Base64 → Text)'}</span>
        <button class="ghost" onclick={swapTextMode}>⇄ 互换</button>
      </div>
      <div class="panels">
        <div class="panel">
          <label class="panel-label" for="text-in">{textMode === 'encode' ? '原文' : 'Base64'}</label>
          <textarea
            id="text-in"
            class="code-area"
            bind:value={textInput}
            placeholder={textMode === 'encode' ? '输入要编码的文字…' : '输入 Base64 字符串…'}
            spellcheck="false"
          ></textarea>
        </div>
        <div class="panel">
          <label class="panel-label" for="text-out">{textMode === 'encode' ? 'Base64' : '原文'}</label>
          <textarea
            id="text-out"
            class="code-area code-area--out"
            value={textOutput}
            readonly
            placeholder="结果将显示在这里…"
            spellcheck="false"
          ></textarea>
        </div>
      </div>
      {#if textError}<p class="error">{textError}</p>{/if}
      <div class="actions">
        <button class="btn-primary" onclick={runText}>{textMode === 'encode' ? '编码' : '解码'}</button>
        <button class="ghost" onclick={copyText}>{textCopy || '复制结果'}</button>
        <button class="ghost" onclick={() => { textInput = ''; textOutput = ''; textError = ''; }}>清空</button>
      </div>
    </div>
  {/if}

  <!-- File tab -->
  {#if activeTab === 'file'}
    <div class="tab-panel">
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="dropzone"
        class:over={fileDragOver}
        ondragover={(e) => { e.preventDefault(); fileDragOver = true; }}
        ondragleave={() => { fileDragOver = false; }}
        ondrop={handleFileDrop}
      >
        <span class="drop-icon">📎</span>
        <span class="drop-label">拖拽任意文件到此处，或</span>
        <label class="file-btn">
          点击选择文件
          <input type="file" onchange={handleFileInput} />
        </label>
      </div>
      {#if fileName}
        <p class="file-info-text">文件：<strong>{fileName}</strong></p>
      {/if}
      {#if fileBase64}
        <div class="panel">
          <label class="panel-label" for="file-out">Base64 输出</label>
          <textarea id="file-out" class="code-area code-area--out" value={fileBase64} readonly spellcheck="false"></textarea>
        </div>
        <div class="actions">
          <button class="ghost" onclick={copyFile}>{fileCopy || '复制 Base64'}</button>
        </div>
      {/if}
      {#if fileError}<p class="error">{fileError}</p>{/if}
    </div>
  {/if}

  <!-- URL tab -->
  {#if activeTab === 'url'}
    <div class="tab-panel">
      <div class="mode-row">
        <span class="mode-label">{urlMode === 'encode' ? 'URL 编码' : 'URL 解码'}</span>
        <button class="ghost" onclick={() => { urlMode = urlMode === 'encode' ? 'decode' : 'encode'; [urlInput, urlOutput] = [urlOutput, urlInput]; urlError = ''; }}>⇄ 互换</button>
      </div>
      <div class="panels">
        <div class="panel">
          <label class="panel-label" for="url-in">{urlMode === 'encode' ? '原文' : '已编码'}</label>
          <textarea
            id="url-in"
            class="code-area"
            bind:value={urlInput}
            placeholder={urlMode === 'encode' ? '例：https://example.com/路径?参数=值' : '例：https%3A%2F%2Fexample.com'}
            spellcheck="false"
          ></textarea>
        </div>
        <div class="panel">
          <label class="panel-label" for="url-out">{urlMode === 'encode' ? '已编码' : '原文'}</label>
          <textarea id="url-out" class="code-area code-area--out" value={urlOutput} readonly spellcheck="false" placeholder="结果…"></textarea>
        </div>
      </div>
      {#if urlError}<p class="error">{urlError}</p>{/if}
      <div class="actions">
        <button class="btn-primary" onclick={runUrl}>{urlMode === 'encode' ? '编码' : '解码'}</button>
        <button class="ghost" onclick={copyUrl}>{urlCopy || '复制结果'}</button>
        <button class="ghost" onclick={() => { urlInput = ''; urlOutput = ''; urlError = ''; }}>清空</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .page-body { display: flex; flex-direction: column; gap: 20px; }
  .intro { text-align: center; padding: 8px 0 4px; }
  .intro h2 { margin: 0 0 6px; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
  .lede { color: var(--text-muted); margin: 0; font-size: 14px; }

  .tabs {
    display: flex;
    gap: 4px;
    border-bottom: 2px solid var(--border);
    padding-bottom: 0;
  }
  .tabs button {
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    padding: 8px 18px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-muted);
    cursor: pointer;
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
    transition: color 0.15s, border-color 0.15s;
  }
  .tabs button:hover { color: var(--text); }
  .tabs button.active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }

  .tab-panel { display: flex; flex-direction: column; gap: 16px; }

  .mode-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .mode-label { font-size: 13px; font-weight: 600; color: var(--text-muted); }

  .panels { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .panel { display: flex; flex-direction: column; gap: 6px; }
  .panel-label { font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }

  .code-area {
    height: 280px;
    resize: vertical;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--bg-card);
    color: inherit;
    font-family: 'Cascadia Code', Consolas, monospace;
    font-size: 13px;
    line-height: 1.6;
    padding: 12px;
    outline: none;
    transition: border-color 0.15s;
  }
  .code-area:focus { border-color: var(--accent); }
  .code-area--out { background: color-mix(in srgb, var(--bg-card) 60%, transparent); }

  .actions { display: flex; gap: 8px; flex-wrap: wrap; }

  .btn-primary {
    padding: 7px 18px;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .btn-primary:hover { opacity: 0.82; }

  .ghost {
    padding: 7px 14px;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    font-size: 13px;
    color: var(--text-muted);
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }
  .ghost:hover { color: var(--text); border-color: var(--accent); }

  .dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    border: 2px dashed var(--border);
    border-radius: var(--radius-lg);
    padding: 40px 24px;
    background: var(--bg-card);
    transition: border-color 0.15s, background 0.15s;
  }
  .dropzone.over {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 6%, transparent);
  }
  .drop-icon { font-size: 32px; }
  .drop-label { font-size: 14px; color: var(--text-muted); }

  .file-btn {
    display: inline-flex;
    padding: 6px 16px;
    background: var(--accent);
    color: #fff;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
  }
  .file-btn input[type='file'] { display: none; }

  .file-info-text { margin: 0; font-size: 13px; color: var(--text-muted); }

  .error {
    margin: 0;
    padding: 10px 14px;
    background: color-mix(in srgb, var(--error) 10%, transparent);
    color: var(--error);
    border-radius: var(--radius-sm);
    font-size: 13px;
  }

  @media (max-width: 640px) {
    .panels { grid-template-columns: 1fr; }
    .code-area { height: 200px; }
  }
</style>
