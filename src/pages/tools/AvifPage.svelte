<script lang="ts">
  import JSZip from 'jszip';

  type ImageFormat = 'webp' | 'avif' | 'png' | 'jpeg';

  interface FileItem {
    id: number;
    file: File;
    thumbUrl: string;
    originalFormat: string;
    originalSize: number;
    status: 'idle' | 'converting' | 'done' | 'error';
    resultBlob: Blob | null;
    resultSize: number;
    savings: number;
    errorMsg: string;
  }

  let items = $state<FileItem[]>([]);
  let targetFormat = $state<ImageFormat>('webp');
  let quality = $state(85);
  let maxDim = $state(0);
  let dragOver = $state(false);
  let avifSupported = $state<boolean | null>(null);
  let isPackaging = $state(false);
  let nextId = $state(0);

  const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif'];

  $effect(() => {
    checkAvifSupport().then(v => { avifSupported = v; });
  });

  async function checkAvifSupport(): Promise<boolean> {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1; canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      ctx.fillRect(0, 0, 1, 1);
      return await new Promise<boolean>(resolve => {
        canvas.toBlob(blob => resolve(blob !== null && blob.size > 0), 'image/avif', 0.5);
      });
    } catch {
      return false;
    }
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { resolve(img); URL.revokeObjectURL(url); };
      img.onerror = () => { reject(new Error('图片加载失败')); URL.revokeObjectURL(url); };
      img.src = url;
    });
  }

  async function convertImage(file: File, format: ImageFormat, qual: number, maxD: number): Promise<Blob> {
    const img = await loadImage(file);
    const canvas = document.createElement('canvas');
    let w = img.naturalWidth, h = img.naturalHeight;
    if (maxD > 0 && (w > maxD || h > maxD)) {
      const ratio = Math.min(maxD / w, maxD / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, w, h);
    const mimeType = format === 'webp' ? 'image/webp'
      : format === 'avif' ? 'image/avif'
      : format === 'png' ? 'image/png'
      : 'image/jpeg';
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('转换失败，浏览器可能不支持该格式'));
      }, mimeType, qual / 100);
    });
  }

  function addFiles(files: FileList | File[]) {
    const arr = [...files].filter(f => ACCEPTED_TYPES.includes(f.type));
    const remaining = 20 - items.length;
    const toAdd = arr.slice(0, remaining);
    const newItems: FileItem[] = toAdd.map(file => ({
      id: nextId++,
      file,
      thumbUrl: URL.createObjectURL(file),
      originalFormat: file.type.replace('image/', '').toUpperCase(),
      originalSize: file.size,
      status: 'idle',
      resultBlob: null,
      resultSize: 0,
      savings: 0,
      errorMsg: '',
    }));
    items = [...items, ...newItems];
  }

  function handleInput(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    if (input.files) { addFiles(input.files); input.value = ''; }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    if (e.dataTransfer?.files) addFiles(e.dataTransfer.files);
  }

  function removeItem(id: number) {
    const item = items.find(i => i.id === id);
    if (item) URL.revokeObjectURL(item.thumbUrl);
    items = items.filter(i => i.id !== id);
  }

  function clearAll() {
    items.forEach(i => URL.revokeObjectURL(i.thumbUrl));
    items = [];
  }

  async function convertAll() {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.status === 'converting') continue;
      items[i] = { ...items[i], status: 'converting', errorMsg: '' };
      // Trigger reactivity by reassigning the array
      items = [...items];
      try {
        const effectiveQuality = targetFormat === 'png' ? 100 : quality;
        const blob = await convertImage(item.file, targetFormat, effectiveQuality, maxDim);
        const savings = ((item.originalSize - blob.size) / item.originalSize) * 100;
        items[i] = { ...items[i], status: 'done', resultBlob: blob, resultSize: blob.size, savings };
        items = [...items];
      } catch (err: unknown) {
        items[i] = { ...items[i], status: 'error', errorMsg: err instanceof Error ? err.message : String(err) };
        items = [...items];
      }
    }
  }

  function getOutputFilename(item: FileItem): string {
    const basename = item.file.name.replace(/\.[^.]+$/, '');
    const ext = targetFormat === 'jpeg' ? 'jpg' : targetFormat;
    return `${basename}.${ext}`;
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadAll() {
    const done = items.filter(i => i.status === 'done' && i.resultBlob);
    if (done.length === 0) return;
    if (done.length === 1) {
      downloadBlob(done[0].resultBlob!, getOutputFilename(done[0]));
      return;
    }
    isPackaging = true;
    try {
      const zip = new JSZip();
      for (const item of done) {
        zip.file(getOutputFilename(item), item.resultBlob!);
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(blob, `images_${targetFormat}.zip`);
    } finally {
      isPackaging = false;
    }
  }

  const doneCount = $derived(items.filter(i => i.status === 'done').length);
  const anyConverting = $derived(items.some(i => i.status === 'converting'));
</script>

<div class="page-body">
  <div class="intro">
    <h2>图片格式转换</h2>
    <p class="lede">PNG · JPG · WebP · AVIF 互转 · Canvas 纯浏览器处理，文件不上传任何服务器</p>
  </div>

  {#if targetFormat === 'avif' && avifSupported === false}
    <div class="avif-warning">
      当前浏览器不支持 AVIF 编码（需要 Chrome 94+ 或 Firefox 113+），转换可能失败。
    </div>
  {/if}

  <!-- Settings bar -->
  <div class="settings-card">
    <div class="settings-row">
      <div class="setting-group">
        <span class="setting-label">目标格式</span>
        <div class="format-pills">
          {#each (['webp', 'avif', 'png', 'jpeg'] as ImageFormat[]) as fmt}
            <button
              class="format-pill"
              class:active={targetFormat === fmt}
              onclick={() => { targetFormat = fmt; }}
            >
              {fmt.toUpperCase()}
              {#if fmt === 'avif' && avifSupported === false}
                <span class="warn-dot" title="浏览器不支持"></span>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      <div class="setting-group">
        <label class="setting-label" for="quality-slider">
          质量
          <span class="quality-val">{targetFormat === 'png' ? '无损' : quality}</span>
        </label>
        <input
          id="quality-slider"
          type="range"
          min="1"
          max="100"
          disabled={targetFormat === 'png'}
          bind:value={quality}
        />
      </div>

      <div class="setting-group">
        <label class="setting-label" for="max-dim">
          最大边长 <span class="quality-val">{maxDim > 0 ? `${maxDim}px` : '不限'}</span>
        </label>
        <input
          id="max-dim"
          type="number"
          min="0"
          max="8192"
          placeholder="0 = 不限"
          bind:value={maxDim}
        />
      </div>
    </div>
  </div>

  <!-- Drop zone -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="dropzone"
    class:over={dragOver}
    ondragover={(e) => { e.preventDefault(); dragOver = true; }}
    ondragleave={() => { dragOver = false; }}
    ondrop={handleDrop}
  >
    <span class="drop-icon">🖼️</span>
    <span class="drop-label">拖拽图片到此处，或</span>
    <label class="file-btn">
      点击选择图片（最多 20 张）
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
        multiple
        onchange={handleInput}
      />
    </label>
    <span class="drop-hint">支持 PNG · JPG · WebP · AVIF · GIF</span>
  </div>

  <!-- File list -->
  {#if items.length > 0}
    <div class="list-head">
      <span class="list-meta">{items.length} 张图片{doneCount > 0 ? `，已转换 ${doneCount} 张` : ''}</span>
      <button class="ghost" onclick={clearAll}>清空全部</button>
    </div>

    <div class="file-grid">
      {#each items as item (item.id)}
        <div class="file-card" class:card-done={item.status === 'done'} class:card-error={item.status === 'error'}>
          <div class="card-thumb-wrap">
            <img src={item.thumbUrl} alt={item.file.name} class="card-thumb" />
            {#if item.status === 'converting'}
              <div class="thumb-overlay">
                <span class="spinner"></span>
              </div>
            {/if}
          </div>

          <div class="card-info">
            <div class="card-name" title={item.file.name}>{item.file.name}</div>
            <div class="card-meta">
              <span class="format-tag">{item.originalFormat}</span>
              <span class="size-text">{formatSize(item.originalSize)}</span>
            </div>

            {#if item.status === 'done'}
              <div class="card-result">
                <span class="arrow">→</span>
                <span class="result-size">{formatSize(item.resultSize)}</span>
                <span class="savings" class:savings-neg={item.savings < 0}>
                  {item.savings >= 0 ? `↓ ${item.savings.toFixed(1)}%` : `↑ ${Math.abs(item.savings).toFixed(1)}%`}
                </span>
              </div>
            {:else if item.status === 'error'}
              <div class="card-error-msg" title={item.errorMsg}>
                {item.errorMsg.length > 40 ? item.errorMsg.slice(0, 40) + '…' : item.errorMsg}
              </div>
            {:else if item.status === 'converting'}
              <div class="card-converting">转换中…</div>
            {/if}
          </div>

          <button class="rm-btn" aria-label="删除" onclick={() => removeItem(item.id)}>×</button>
        </div>
      {/each}
    </div>

    <!-- Action buttons -->
    <div class="actions-row">
      <button
        class="primary-btn"
        disabled={anyConverting || items.length === 0}
        onclick={convertAll}
      >
        {#if anyConverting}
          <span class="spinner spinner--btn"></span> 转换中…
        {:else}
          转换全部
        {/if}
      </button>

      <button
        class="primary-btn primary-btn--outline"
        disabled={doneCount === 0 || isPackaging}
        onclick={downloadAll}
      >
        {#if isPackaging}
          <span class="spinner spinner--btn spinner--dark"></span> 打包中…
        {:else}
          打包下载 {doneCount > 0 ? `(${doneCount})` : ''}
        {/if}
      </button>
    </div>
  {/if}
</div>

<style>
  .page-body { display: flex; flex-direction: column; gap: 20px; }

  .intro { text-align: center; padding: 8px 0 4px; }
  .intro h2 { margin: 0 0 6px; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
  .lede { color: var(--text-muted); margin: 0; font-size: 14px; }

  /* AVIF warning */
  .avif-warning {
    padding: 10px 14px;
    background: color-mix(in srgb, #f59e0b 12%, transparent);
    color: #b45309;
    border: 1px solid #fbbf24;
    border-radius: var(--radius-sm);
    font-size: 13px;
  }

  /* Settings card */
  .settings-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 16px 20px;
  }
  .settings-row {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    align-items: flex-start;
  }
  .setting-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    min-width: 140px;
  }
  .setting-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .quality-val {
    font-weight: 700;
    color: var(--accent);
    text-transform: none;
    letter-spacing: 0;
  }

  .format-pills {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .format-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 5px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg-elevated);
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }
  .format-pill:hover { color: var(--text); border-color: var(--accent); }
  .format-pill.active {
    border-color: var(--accent);
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
  }
  .warn-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #f59e0b;
    flex-shrink: 0;
  }

  input[type='range'] {
    width: 100%;
    accent-color: var(--accent);
    cursor: pointer;
  }
  input[type='range']:disabled { opacity: 0.4; cursor: not-allowed; }

  input[type='number'] {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 6px 10px;
    font-size: 13px;
    background: var(--bg-elevated);
    color: inherit;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.15s;
    -moz-appearance: textfield;
  }
  input[type='number']:focus { border-color: var(--accent); }
  input[type='number']::-webkit-outer-spin-button,
  input[type='number']::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

  /* Drop zone */
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
    cursor: default;
  }
  .dropzone.over {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 6%, transparent);
  }
  .drop-icon { font-size: 36px; }
  .drop-label { font-size: 14px; color: var(--text-muted); }
  .drop-hint { font-size: 12px; color: var(--text-muted); opacity: 0.7; }

  .file-btn {
    display: inline-flex;
    padding: 7px 18px;
    background: var(--accent);
    color: #fff;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .file-btn:hover { opacity: 0.88; }
  .file-btn input { display: none; }

  /* List header */
  .list-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .list-meta { font-size: 13px; color: var(--text-muted); }

  /* File grid */
  .file-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
  }

  .file-card {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 12px;
    position: relative;
    transition: border-color 0.15s;
    box-shadow: var(--shadow-sm);
  }
  .file-card.card-done { border-color: color-mix(in srgb, var(--success) 40%, var(--border)); }
  .file-card.card-error { border-color: color-mix(in srgb, var(--error) 40%, var(--border)); }

  .card-thumb-wrap {
    position: relative;
    width: 64px;
    height: 64px;
    flex-shrink: 0;
    border-radius: var(--radius-sm);
    overflow: hidden;
    background: var(--bg);
    border: 1px solid var(--border);
  }
  .card-thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .thumb-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
  }

  .card-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .card-name {
    font-size: 13px;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding-right: 20px;
  }
  .card-meta {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .format-tag {
    display: inline-flex;
    padding: 1px 6px;
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    color: var(--accent);
    border-radius: 3px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }
  .size-text { font-size: 12px; color: var(--text-muted); }

  .card-result {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
  }
  .arrow { color: var(--text-muted); }
  .result-size { color: var(--text); font-weight: 600; }
  .savings {
    font-weight: 700;
    color: var(--success);
    font-size: 11px;
  }
  .savings.savings-neg { color: var(--error); }

  .card-error-msg {
    font-size: 11px;
    color: var(--error);
    word-break: break-all;
  }
  .card-converting {
    font-size: 12px;
    color: var(--text-muted);
    font-style: italic;
  }

  .rm-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    background: transparent;
    border: none;
    font-size: 18px;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0;
    line-height: 1;
    transition: color 0.15s;
  }
  .rm-btn:hover { color: var(--error); }

  /* Actions */
  .actions-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .primary-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 24px;
    background: var(--accent);
    color: #fff;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .primary-btn:hover:not(:disabled) { opacity: 0.88; }
  .primary-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .primary-btn--outline {
    background: transparent;
    color: var(--accent);
    border-color: var(--accent);
  }
  .primary-btn--outline:hover:not(:disabled) {
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    opacity: 1;
  }

  .ghost {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-muted);
    padding: 5px 12px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }
  .ghost:hover { color: var(--text); border-color: var(--accent); }

  /* Spinner */
  .spinner {
    display: inline-block;
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255,255,255,0.35);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }
  .spinner--btn {
    width: 14px;
    height: 14px;
  }
  .spinner--dark {
    border-color: color-mix(in srgb, var(--accent) 30%, transparent);
    border-top-color: var(--accent);
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 600px) {
    .settings-row { flex-direction: column; gap: 14px; }
    .file-grid { grid-template-columns: 1fr; }
    .format-pills { gap: 4px; }
  }
</style>
