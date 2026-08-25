<script lang="ts">
  import { FFmpeg } from '@ffmpeg/ffmpeg';
  import { fetchFile, toBlobURL } from '@ffmpeg/util';

  type LoadState = 'idle' | 'loading' | 'ready' | 'error';
  type StitchState = 'idle' | 'running' | 'done' | 'error';
  type OutputFormat = 'mp4' | 'webm';
  type Quality = 'low' | 'medium' | 'high';

  interface VideoItem {
    id: number;
    file: File;
    thumbUrl: string;
    duration: number;
    durationStr: string;
  }

  const BASE = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

  const FORMAT_OPTIONS: Array<{ value: OutputFormat; label: string }> = [
    { value: 'mp4', label: 'MP4' },
    { value: 'webm', label: 'WebM' },
  ];

  const QUALITY_OPTIONS: Array<{ value: Quality; label: string; hint: string }> = [
    { value: 'low', label: '低', hint: '檔案較小，畫質較低' },
    { value: 'medium', label: '中', hint: '平衡品質與大小' },
    { value: 'high', label: '高', hint: '最佳畫質，檔案較大' },
  ];

  let items = $state<VideoItem[]>([]);
  let dragOver = $state(false);
  let nextId = $state(0);

  let ffmpegInst = $state<FFmpeg | null>(null);
  let loadState = $state<LoadState>('idle');
  let stitchState = $state<StitchState>('idle');
  let progress = $state(0);
  let logs = $state<string[]>([]);
  let resultUrl = $state<string | null>(null);
  let resultSize = $state(0);

  let outputFormat = $state<OutputFormat>('mp4');
  let quality = $state<Quality>('medium');

  const canStitch = $derived(
    loadState === 'ready' && items.length >= 2 && stitchState !== 'running'
  );
  const canLoad = $derived(loadState === 'idle' || loadState === 'error');

  function formatDuration(secs: number): string {
    if (!isFinite(secs) || secs <= 0) return '--:--';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function getVideoDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        const dur = video.duration;
        URL.revokeObjectURL(url);
        resolve(isFinite(dur) ? dur : 0);
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(0);
      };
      video.src = url;
    });
  }

  async function addFiles(files: FileList | File[]) {
    const ACCEPTED_EXTS = ['mp4', 'webm', 'mov', 'avi'];
    const arr = [...files].filter((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
      const type = f.type.toLowerCase();
      return (
        ACCEPTED_EXTS.includes(ext) ||
        type.startsWith('video/')
      );
    });
    const remaining = 10 - items.length;
    const toAdd = arr.slice(0, remaining);

    for (const file of toAdd) {
      const thumbUrl = URL.createObjectURL(file);
      const duration = await getVideoDuration(file);
      const item: VideoItem = {
        id: nextId++,
        file,
        thumbUrl,
        duration,
        durationStr: formatDuration(duration),
      };
      items = [...items, item];
    }
  }

  function handleInput(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    if (input.files) {
      addFiles(input.files);
      input.value = '';
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    if (e.dataTransfer?.files) addFiles(e.dataTransfer.files);
  }

  function removeItem(id: number) {
    const item = items.find((i) => i.id === id);
    if (item) URL.revokeObjectURL(item.thumbUrl);
    items = items.filter((i) => i.id !== id);
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const arr = [...items];
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    items = arr;
  }

  function moveDown(index: number) {
    if (index === items.length - 1) return;
    const arr = [...items];
    [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
    items = arr;
  }

  function clearAll() {
    items.forEach((i) => URL.revokeObjectURL(i.thumbUrl));
    items = [];
  }

  async function loadFFmpeg() {
    if (!canLoad) return;
    loadState = 'loading';
    logs = ['正在載入 FFmpeg WebAssembly（約 30 MB），請稍候…'];
    try {
      const ff = new FFmpeg();
      ff.on('log', ({ message }) => {
        logs = [...logs, message];
      });
      ff.on('progress', ({ progress: p }) => {
        progress = Math.round(p * 100);
      });
      await ff.load({
        coreURL: await toBlobURL(`${BASE}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${BASE}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      ffmpegInst = ff;
      loadState = 'ready';
      logs = [...logs, '✓ FFmpeg 載入完成，可以開始拼接影片'];
    } catch (err: unknown) {
      loadState = 'error';
      logs = [...logs, `✗ 載入失敗：${err instanceof Error ? err.message : String(err)}`];
    }
  }

  async function startStitch() {
    if (!ffmpegInst || !canStitch) return;
    const ff = ffmpegInst;

    stitchState = 'running';
    progress = 0;
    logs = ['開始拼接影片…'];

    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
      resultUrl = null;
      resultSize = 0;
    }

    try {
      // Write concat list file
      const concatContent = items.map((_, i) => `file 'input${i}'`).join('\n');
      await ff.writeFile('concat.txt', concatContent);

      // Write each input file
      for (let i = 0; i < items.length; i++) {
        logs = [...logs, `正在寫入第 ${i + 1} 個檔案：${items[i].file.name}`];
        await ff.writeFile(`input${i}`, await fetchFile(items[i].file));
      }

      const outputName = `output.${outputFormat}`;
      logs = [...logs, `開始拼接（格式：${outputFormat.toUpperCase()}）…`];

      // Concatenate using concat demuxer — copy streams for speed and compatibility
      await ff.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', 'concat.txt',
        '-c', 'copy',
        outputName,
      ]);

      logs = [...logs, '正在讀取輸出檔案…'];
      const data = await ff.readFile(outputName);

      const mimeType = outputFormat === 'mp4' ? 'video/mp4' : 'video/webm';
      const blob = new Blob([(data as Uint8Array).buffer], { type: mimeType });
      resultSize = blob.size;
      resultUrl = URL.createObjectURL(blob);
      stitchState = 'done';
      progress = 100;
      logs = [...logs, `✓ 拼接完成！輸出大小：${formatSize(blob.size)}`];
    } catch (err: unknown) {
      stitchState = 'error';
      logs = [
        ...logs,
        `✗ 拼接失敗：${err instanceof Error ? err.message : String(err)}`,
      ];
    }
  }

  function downloadResult() {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `stitched_video.${outputFormat}`;
    a.click();
  }

  const totalDuration = $derived(items.reduce((sum, i) => sum + i.duration, 0));
</script>

<div class="page-body">
  <div class="intro">
    <h2>影片拼接</h2>
    <p class="lede">將多個影片依序合併為單一檔案 · 純瀏覽器處理，不上傳任何伺服器</p>
  </div>

  <!-- Privacy / size notice -->
  <div class="info-banner">
    <span class="info-icon">🔒</span>
    <span>
      影片在瀏覽器本地處理，不上傳任何伺服器。
      首次點擊「載入 FFmpeg」時需下載約 <strong>30 MB</strong> 的 WebAssembly 引擎，請確認網路連線。
    </span>
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
    <span class="drop-icon">🎬</span>
    <span class="drop-label">拖拽影片檔案到此處，或</span>
    <label class="file-btn">
      點擊選擇影片（最多 10 個）
      <input
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,.mp4,.webm,.mov,.avi"
        multiple
        onchange={handleInput}
      />
    </label>
    <span class="drop-hint">支援 MP4 · WebM · MOV · AVI</span>
  </div>

  <!-- File list -->
  {#if items.length > 0}
    <div class="list-head">
      <span class="list-meta">
        {items.length} 個影片
        {#if items.length >= 2}
          · 合計時長 {formatDuration(totalDuration)}
        {:else}
          （至少需要 2 個才能拼接）
        {/if}
      </span>
      <button class="ghost" onclick={clearAll}>清空全部</button>
    </div>

    <div class="file-list">
      {#each items as item, index (item.id)}
        <div class="file-card">
          <div class="card-order">{index + 1}</div>

          <div class="card-thumb-wrap">
            <!-- Video thumbnail: first frame via native video element -->
            <video
              src={item.thumbUrl}
              class="card-thumb"
              muted
              preload="metadata"
              aria-label={item.file.name}
            ></video>
          </div>

          <div class="card-info">
            <div class="card-name" title={item.file.name}>{item.file.name}</div>
            <div class="card-meta">
              <span class="meta-tag">
                {item.file.name.split('.').pop()?.toUpperCase() ?? 'VIDEO'}
              </span>
              <span class="meta-text">{formatSize(item.file.size)}</span>
              <span class="meta-text">⏱ {item.durationStr}</span>
            </div>
          </div>

          <div class="card-actions">
            <button
              class="order-btn"
              disabled={index === 0}
              onclick={() => moveUp(index)}
              aria-label="上移"
              title="上移"
            >↑</button>
            <button
              class="order-btn"
              disabled={index === items.length - 1}
              onclick={() => moveDown(index)}
              aria-label="下移"
              title="下移"
            >↓</button>
            <button
              class="rm-btn"
              onclick={() => removeItem(item.id)}
              aria-label="刪除"
              title="刪除"
            >×</button>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Settings card -->
  <div class="settings-card">
    <div class="settings-row">
      <div class="setting-group">
        <span class="setting-label">輸出格式</span>
        <div class="format-pills">
          {#each FORMAT_OPTIONS as opt (opt.value)}
            <button
              class="format-pill"
              class:active={outputFormat === opt.value}
              onclick={() => { outputFormat = opt.value; }}
            >
              {opt.label}
            </button>
          {/each}
        </div>
      </div>

      <div class="setting-group">
        <span class="setting-label">輸出品質</span>
        <div class="format-pills">
          {#each QUALITY_OPTIONS as opt (opt.value)}
            <button
              class="format-pill"
              class:active={quality === opt.value}
              onclick={() => { quality = opt.value; }}
              title={opt.hint}
            >
              {opt.label}
            </button>
          {/each}
        </div>
        <span class="setting-hint">
          {QUALITY_OPTIONS.find((o) => o.value === quality)?.hint ?? ''}
        </span>
      </div>
    </div>
  </div>

  <!-- Action buttons -->
  <div class="actions-row">
    {#if canLoad}
      <button
        class="primary-btn"
        onclick={loadFFmpeg}
        disabled={loadState === 'loading'}
      >
        {#if loadState === 'loading'}
          <span class="spinner spinner--btn"></span>
          載入中…
        {:else if loadState === 'error'}
          重新載入 FFmpeg
        {:else}
          載入 FFmpeg
        {/if}
      </button>
    {/if}

    {#if loadState === 'ready'}
      <div class="ffmpeg-ready-badge">✓ FFmpeg 已就緒</div>
      <button
        class="primary-btn"
        disabled={!canStitch}
        onclick={startStitch}
      >
        {#if stitchState === 'running'}
          <span class="spinner spinner--btn"></span>
          拼接中…
        {:else}
          開始拼接
        {/if}
      </button>
    {/if}

    {#if loadState === 'loading'}
      <span class="status-muted">正在下載 FFmpeg 引擎，請稍候…</span>
    {/if}
  </div>

  <!-- Progress bar + log -->
  {#if logs.length > 0}
    <div class="progress-section">
      {#if stitchState === 'running' || (stitchState === 'done' && progress > 0)}
        <div class="progress-header">
          <span class="progress-label-text">拼接進度</span>
          <span class="progress-pct">{progress}%</span>
        </div>
        <div class="progress-bar-wrap">
          <div
            class="progress-bar"
            class:done={stitchState === 'done'}
            style="width: {progress}%"
          ></div>
        </div>
      {/if}

      <div class="log-box" role="log" aria-live="polite" aria-label="處理日誌">
        {#each logs as line, i (i)}
          <div class="log-line" class:log-success={line.startsWith('✓')} class:log-error={line.startsWith('✗')}>
            {line}
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Download result -->
  {#if stitchState === 'done' && resultUrl}
    <div class="result-section">
      <div class="result-icon">✓</div>
      <div class="result-info">
        <div class="result-title">拼接完成！</div>
        <div class="result-meta">
          {outputFormat.toUpperCase()} · {formatSize(resultSize)} · {items.length} 個片段合併
        </div>
      </div>
      <button class="primary-btn primary-btn--outline" onclick={downloadResult}>
        下載 {outputFormat.toUpperCase()} 檔案
      </button>
    </div>
  {:else if stitchState === 'error'}
    <div class="error-section">
      <span class="error-icon">✗</span>
      <span>拼接失敗，請確認影片格式相容後重試。詳細錯誤請見上方日誌。</span>
    </div>
  {/if}
</div>

<style>
  .page-body {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* ── Header ── */
  .intro { text-align: center; padding: 8px 0 4px; }
  .intro h2 {
    margin: 0 0 6px;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .lede { color: var(--text-muted); margin: 0; font-size: 14px; }

  /* ── Info banner ── */
  .info-banner {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 11px 16px;
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 28%, var(--border));
    border-radius: var(--radius-md);
    font-size: 13px;
    color: var(--text);
    line-height: 1.5;
  }
  .info-icon { font-size: 15px; flex-shrink: 0; margin-top: 1px; }

  /* ── Drop zone ── */
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
    user-select: none;
  }
  .file-btn:hover { opacity: 0.88; }
  .file-btn input { display: none; }

  /* ── List header ── */
  .list-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .list-meta { font-size: 13px; color: var(--text-muted); }

  /* ── File list ── */
  .file-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .file-card {
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 10px 14px;
    box-shadow: var(--shadow-sm);
    transition: border-color 0.15s;
  }
  .file-card:hover { border-color: color-mix(in srgb, var(--accent) 40%, var(--border)); }

  .card-order {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-muted);
    min-width: 18px;
    text-align: center;
    flex-shrink: 0;
  }

  .card-thumb-wrap {
    width: 90px;
    height: 54px;
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
    color: var(--text);
  }
  .card-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .meta-tag {
    display: inline-flex;
    padding: 1px 6px;
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    color: var(--accent);
    border-radius: 3px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }
  .meta-text { font-size: 12px; color: var(--text-muted); }

  .card-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  .order-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    font-size: 13px;
    cursor: pointer;
    color: var(--text-muted);
    transition: color 0.15s, border-color 0.15s;
    flex-shrink: 0;
  }
  .order-btn:hover:not(:disabled) {
    color: var(--accent);
    border-color: var(--accent);
  }
  .order-btn:disabled { opacity: 0.28; cursor: not-allowed; }

  .rm-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    font-size: 17px;
    line-height: 1;
    color: var(--text-muted);
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
    flex-shrink: 0;
  }
  .rm-btn:hover { color: var(--error); border-color: var(--error); }

  /* ── Settings card ── */
  .settings-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 16px 20px;
  }
  .settings-row {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
    align-items: flex-start;
  }
  .setting-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    min-width: 120px;
  }
  .setting-label {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.07em;
  }
  .setting-hint {
    font-size: 11px;
    color: var(--text-muted);
    opacity: 0.7;
    min-height: 1em;
  }
  .format-pills { display: flex; gap: 6px; flex-wrap: wrap; }
  .format-pill {
    padding: 5px 14px;
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

  /* ── Actions row ── */
  .actions-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .ffmpeg-ready-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background: color-mix(in srgb, var(--success) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--success) 35%, var(--border));
    border-radius: var(--radius-sm);
    font-size: 12px;
    font-weight: 600;
    color: var(--success);
  }

  .status-muted {
    font-size: 13px;
    color: var(--text-muted);
    font-style: italic;
  }

  /* ── Buttons ── */
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
    white-space: nowrap;
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

  /* ── Progress ── */
  .progress-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .progress-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .progress-label-text {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .progress-pct {
    font-size: 12px;
    font-weight: 700;
    color: var(--accent);
  }
  .progress-bar-wrap {
    height: 6px;
    background: var(--border);
    border-radius: 3px;
    overflow: hidden;
  }
  .progress-bar {
    height: 100%;
    background: var(--accent);
    border-radius: 3px;
    transition: width 0.35s ease;
  }
  .progress-bar.done { background: var(--success); }

  .log-box {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 10px 14px;
    max-height: 220px;
    overflow-y: auto;
    font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
    font-size: 12px;
    color: var(--text-muted);
    display: flex;
    flex-direction: column;
    gap: 2px;
    scroll-behavior: smooth;
  }
  .log-line {
    word-break: break-all;
    line-height: 1.6;
  }
  .log-line.log-success { color: var(--success); font-weight: 600; }
  .log-line.log-error   { color: var(--error);   font-weight: 600; }

  /* ── Result ── */
  .result-section {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px 20px;
    background: color-mix(in srgb, var(--success) 7%, transparent);
    border: 1px solid color-mix(in srgb, var(--success) 35%, var(--border));
    border-radius: var(--radius-md);
    flex-wrap: wrap;
  }
  .result-icon {
    font-size: 22px;
    color: var(--success);
    font-weight: 700;
    flex-shrink: 0;
  }
  .result-info { flex: 1; min-width: 0; }
  .result-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 2px;
  }
  .result-meta { font-size: 12px; color: var(--text-muted); }

  .error-section {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: color-mix(in srgb, var(--error) 7%, transparent);
    border: 1px solid color-mix(in srgb, var(--error) 30%, var(--border));
    border-radius: var(--radius-md);
    font-size: 13px;
    color: var(--text);
  }
  .error-icon { color: var(--error); font-weight: 700; font-size: 16px; flex-shrink: 0; }

  /* ── Spinner ── */
  .spinner {
    display: inline-block;
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }
  .spinner--btn { width: 14px; height: 14px; }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Responsive ── */
  @media (max-width: 600px) {
    .settings-row { flex-direction: column; gap: 16px; }
    .card-thumb-wrap { width: 64px; height: 40px; }
    .file-card { gap: 8px; padding: 8px 10px; }
    .result-section { flex-direction: column; align-items: flex-start; }
  }
</style>
