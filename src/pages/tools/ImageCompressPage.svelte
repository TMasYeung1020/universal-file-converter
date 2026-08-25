<script lang="ts">
  type OutputFormat = 'jpeg' | 'webp' | 'png';
  type AspectRatio = 'free' | '1:1' | '4:3' | '16:9';
  type ActiveTab = 'compress' | 'crop';

  // Upload state
  let originalFile = $state<File | null>(null);
  let originalDataUrl = $state<string>('');
  let originalWidth = $state(0);
  let originalHeight = $state(0);
  let originalSize = $state(0);
  let isDragging = $state(false);

  // Tab state
  let activeTab = $state<ActiveTab>('compress');

  // Compress state
  let quality = $state(85);
  let outputFormat = $state<OutputFormat>('jpeg');
  let compressedDataUrl = $state<string>('');
  let compressedSize = $state(0);

  // Crop state
  let cropX = $state(0);
  let cropY = $state(0);
  let cropWidth = $state(0);
  let cropHeight = $state(0);
  let aspectRatio = $state<AspectRatio>('free');
  let croppedDataUrl = $state<string>('');
  let croppedSize = $state(0);

  // Derived
  let compressionRatio = $derived.by(() => {
    if (!originalSize || !compressedSize) return 0;
    return Math.round((1 - compressedSize / originalSize) * 100);
  });

  let cropOverlayStyle = $derived.by(() => {
    if (!originalWidth || !originalHeight) return '';
    return `left:${cropX}px;top:${cropY}px;width:${cropWidth}px;height:${cropHeight}px;`;
  });

  // Image container display size (max 600px wide)
  let displayWidth = $derived.by(() => {
    if (!originalWidth) return 0;
    return Math.min(originalWidth, 600);
  });
  let displayHeight = $derived.by(() => {
    if (!originalWidth || !originalHeight) return 0;
    return Math.round((displayWidth / originalWidth) * originalHeight);
  });
  let scaleRatio = $derived.by(() => {
    if (!originalWidth) return 1;
    return displayWidth / originalWidth;
  });

  let scaledCropX = $derived(Math.round(cropX * scaleRatio));
  let scaledCropY = $derived(Math.round(cropY * scaleRatio));
  let scaledCropWidth = $derived(Math.round(cropWidth * scaleRatio));
  let scaledCropHeight = $derived(Math.round(cropHeight * scaleRatio));

  let scaledOverlayStyle = $derived(
    `left:${scaledCropX}px;top:${scaledCropY}px;width:${scaledCropWidth}px;height:${scaledCropHeight}px;`
  );

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function loadFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    originalFile = file;
    originalSize = file.size;

    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      originalDataUrl = url;

      const img = new Image();
      img.onload = () => {
        originalWidth = img.naturalWidth;
        originalHeight = img.naturalHeight;
        cropX = 0;
        cropY = 0;
        cropWidth = img.naturalWidth;
        cropHeight = img.naturalHeight;
        compressedDataUrl = '';
        compressedSize = 0;
        croppedDataUrl = '';
        croppedSize = 0;
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  }

  function onDropZoneClick() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp,image/gif';
    input.onchange = () => {
      if (input.files?.[0]) loadFile(input.files[0]);
    };
    input.click();
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function onDragLeave() {
    isDragging = false;
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    const file = e.dataTransfer?.files[0];
    if (file) loadFile(file);
  }

  function getImageElement(): Promise<HTMLImageElement> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = originalDataUrl;
    });
  }

  async function runCompress() {
    if (!originalDataUrl) return;
    const img = await getImageElement();
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    const mimeType = outputFormat === 'jpeg'
      ? 'image/jpeg'
      : outputFormat === 'webp'
        ? 'image/webp'
        : 'image/png';

    const q = outputFormat === 'png' ? undefined : quality / 100;

    canvas.toBlob((blob) => {
      if (!blob) return;
      compressedSize = blob.size;
      const reader = new FileReader();
      reader.onload = (ev) => {
        compressedDataUrl = ev.target?.result as string;
      };
      reader.readAsDataURL(blob);
    }, mimeType, q);
  }

  async function runCrop() {
    if (!originalDataUrl) return;
    const img = await getImageElement();
    const canvas = document.createElement('canvas');
    const cw = Math.min(cropWidth, originalWidth - cropX);
    const ch = Math.min(cropHeight, originalHeight - cropY);
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, cropX, cropY, cw, ch, 0, 0, cw, ch);

    canvas.toBlob((blob) => {
      if (!blob) return;
      croppedSize = blob.size;
      const reader = new FileReader();
      reader.onload = (ev) => {
        croppedDataUrl = ev.target?.result as string;
      };
      reader.readAsDataURL(blob);
    }, 'image/png');
  }

  function downloadDataUrl(dataUrl: string, filename: string) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }

  function downloadCompressed() {
    if (!compressedDataUrl) return;
    const ext = outputFormat === 'jpeg' ? 'jpg' : outputFormat;
    const base = originalFile?.name.replace(/\.[^.]+$/, '') ?? 'image';
    downloadDataUrl(compressedDataUrl, `${base}_compressed.${ext}`);
  }

  function downloadCropped() {
    if (!croppedDataUrl) return;
    const base = originalFile?.name.replace(/\.[^.]+$/, '') ?? 'image';
    downloadDataUrl(croppedDataUrl, `${base}_cropped.png`);
  }

  function applyAspectRatio() {
    if (aspectRatio === 'free') return;
    let targetRatio: number;
    if (aspectRatio === '1:1') targetRatio = 1;
    else if (aspectRatio === '4:3') targetRatio = 4 / 3;
    else targetRatio = 16 / 9;

    // Adjust height to match ratio
    let newHeight = Math.round(cropWidth / targetRatio);
    if (cropY + newHeight > originalHeight) {
      newHeight = originalHeight - cropY;
      cropWidth = Math.round(newHeight * targetRatio);
    }
    cropHeight = newHeight;
  }

  function onCropXInput(e: Event) {
    const v = parseInt((e.target as HTMLInputElement).value) || 0;
    cropX = Math.max(0, Math.min(v, originalWidth - cropWidth));
  }

  function onCropYInput(e: Event) {
    const v = parseInt((e.target as HTMLInputElement).value) || 0;
    cropY = Math.max(0, Math.min(v, originalHeight - cropHeight));
  }

  function onCropWidthInput(e: Event) {
    const v = parseInt((e.target as HTMLInputElement).value) || 1;
    cropWidth = Math.max(1, Math.min(v, originalWidth - cropX));
    if (aspectRatio !== 'free') applyAspectRatio();
  }

  function onCropHeightInput(e: Event) {
    const v = parseInt((e.target as HTMLInputElement).value) || 1;
    if (aspectRatio === 'free') {
      cropHeight = Math.max(1, Math.min(v, originalHeight - cropY));
    }
  }

  function onAspectRatioChange(e: Event) {
    aspectRatio = (e.target as HTMLSelectElement).value as AspectRatio;
    if (aspectRatio !== 'free') applyAspectRatio();
  }

  function onQualityInput(e: Event) {
    quality = parseInt((e.target as HTMLInputElement).value);
  }

  function onFormatChange(e: Event) {
    outputFormat = (e.target as HTMLSelectElement).value as OutputFormat;
  }

  $effect(() => {
    if (originalDataUrl && activeTab === 'compress') {
      runCompress();
    }
  });

  $effect(() => {
    // Re-run compress when quality or format changes
    void quality;
    void outputFormat;
    if (originalDataUrl && activeTab === 'compress') {
      runCompress();
    }
  });
</script>

<div class="page-body">
  <div class="intro">
    <h2>圖片壓縮 &amp; 裁切</h2>
    <p class="lede">在瀏覽器中壓縮或裁切圖片，不上傳伺服器，保護隱私。支援 PNG / JPG / WebP / GIF。</p>
  </div>

  <!-- Drop Zone -->
  {#if !originalDataUrl}
    <div
      class="drop-zone"
      class:dragging={isDragging}
      onclick={onDropZoneClick}
      ondragover={onDragOver}
      ondragleave={onDragLeave}
      ondrop={onDrop}
      role="button"
      tabindex="0"
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') onDropZoneClick(); }}
    >
      <div class="drop-icon">🖼️</div>
      <p class="drop-hint">點擊或拖放圖片到此處</p>
      <p class="drop-hint-sub">支援 PNG · JPG · WebP · GIF</p>
    </div>
  {:else}
    <!-- Main workspace -->
    <div class="workspace">
      <!-- Original info bar -->
      <div class="info-bar">
        <div class="info-item">
          <span class="info-label">原始尺寸</span>
          <span class="info-val">{originalWidth} × {originalHeight} px</span>
        </div>
        <div class="info-item">
          <span class="info-label">原始大小</span>
          <span class="info-val">{formatBytes(originalSize)}</span>
        </div>
        <button
          class="btn-secondary btn-sm"
          onclick={() => {
            originalDataUrl = '';
            originalFile = null;
            compressedDataUrl = '';
            croppedDataUrl = '';
          }}
        >重新選擇</button>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button
          class="tab-btn"
          class:active={activeTab === 'compress'}
          onclick={() => { activeTab = 'compress'; }}
        >壓縮</button>
        <button
          class="tab-btn"
          class:active={activeTab === 'crop'}
          onclick={() => { activeTab = 'crop'; }}
        >裁切</button>
      </div>

      <!-- Compress Tab -->
      {#if activeTab === 'compress'}
        <div class="tab-content">
          <div class="controls-row">
            <div class="control-group">
              <label for="format-select">輸出格式</label>
              <select id="format-select" value={outputFormat} onchange={onFormatChange}>
                <option value="jpeg">JPEG</option>
                <option value="webp">WebP</option>
                <option value="png">PNG (無損)</option>
              </select>
            </div>
            {#if outputFormat !== 'png'}
              <div class="control-group quality-group">
                <label for="quality-range">品質 <span class="quality-val">{quality}</span></label>
                <input
                  id="quality-range"
                  type="range"
                  min="1"
                  max="100"
                  value={quality}
                  oninput={onQualityInput}
                  class="quality-slider"
                />
              </div>
            {/if}
            <button class="btn-primary" onclick={runCompress}>重新壓縮</button>
          </div>

          <div class="preview-row">
            <div class="preview-card">
              <div class="preview-label">原圖</div>
              <img src={originalDataUrl} alt="原圖預覽" class="preview-img" />
              <div class="preview-meta">{formatBytes(originalSize)}</div>
            </div>
            <div class="arrow">→</div>
            <div class="preview-card">
              <div class="preview-label">壓縮後</div>
              {#if compressedDataUrl}
                <img src={compressedDataUrl} alt="壓縮後預覽" class="preview-img" />
                <div class="preview-meta">
                  {formatBytes(compressedSize)}
                  {#if compressionRatio > 0}
                    <span class="badge-success">-{compressionRatio}%</span>
                  {:else if compressionRatio < 0}
                    <span class="badge-warn">+{Math.abs(compressionRatio)}%</span>
                  {/if}
                </div>
                <button class="btn-primary btn-dl" onclick={downloadCompressed}>下載</button>
              {:else}
                <div class="placeholder">處理中…</div>
              {/if}
            </div>
          </div>
        </div>
      {/if}

      <!-- Crop Tab -->
      {#if activeTab === 'crop'}
        <div class="tab-content">
          <div class="controls-row wrap">
            <div class="control-group">
              <label for="crop-x">X (px)</label>
              <input id="crop-x" type="number" min="0" max={originalWidth - 1} value={cropX} oninput={onCropXInput} class="num-input" />
            </div>
            <div class="control-group">
              <label for="crop-y">Y (px)</label>
              <input id="crop-y" type="number" min="0" max={originalHeight - 1} value={cropY} oninput={onCropYInput} class="num-input" />
            </div>
            <div class="control-group">
              <label for="crop-w">寬度 (px)</label>
              <input id="crop-w" type="number" min="1" max={originalWidth} value={cropWidth} oninput={onCropWidthInput} class="num-input" />
            </div>
            <div class="control-group">
              <label for="crop-h">高度 (px)</label>
              <input id="crop-h" type="number" min="1" max={originalHeight} value={cropHeight} oninput={onCropHeightInput} class="num-input" />
            </div>
            <div class="control-group">
              <label for="aspect-select">寬高比</label>
              <select id="aspect-select" value={aspectRatio} onchange={onAspectRatioChange}>
                <option value="free">自由</option>
                <option value="1:1">1:1</option>
                <option value="4:3">4:3</option>
                <option value="16:9">16:9</option>
              </select>
            </div>
            <button class="btn-primary" onclick={runCrop}>裁切預覽</button>
          </div>

          <!-- Image with overlay -->
          <div class="crop-workspace">
            <div class="crop-image-wrap" style="width:{displayWidth}px;height:{displayHeight}px;">
              <img src={originalDataUrl} alt="裁切預覽" style="width:{displayWidth}px;height:{displayHeight}px;" />
              <div
                class="crop-overlay"
                style={scaledOverlayStyle}
              >
                <div class="crop-handle tl"></div>
                <div class="crop-handle tr"></div>
                <div class="crop-handle bl"></div>
                <div class="crop-handle br"></div>
              </div>
              <!-- Dimming outside crop -->
              <div class="crop-dim top"    style="left:0;top:0;width:100%;height:{scaledCropY}px;"></div>
              <div class="crop-dim bottom" style="left:0;top:{scaledCropY + scaledCropHeight}px;width:100%;height:{displayHeight - scaledCropY - scaledCropHeight}px;"></div>
              <div class="crop-dim left"   style="left:0;top:{scaledCropY}px;width:{scaledCropX}px;height:{scaledCropHeight}px;"></div>
              <div class="crop-dim right"  style="left:{scaledCropX + scaledCropWidth}px;top:{scaledCropY}px;width:{displayWidth - scaledCropX - scaledCropWidth}px;height:{scaledCropHeight}px;"></div>
            </div>

            {#if croppedDataUrl}
              <div class="crop-result">
                <div class="preview-label">裁切結果</div>
                <img src={croppedDataUrl} alt="裁切結果" class="crop-result-img" />
                <div class="preview-meta">{cropWidth} × {cropHeight} px · {formatBytes(croppedSize)}</div>
                <button class="btn-primary btn-dl" onclick={downloadCropped}>下載 PNG</button>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .page-body {
    max-width: 860px;
    margin: 0 auto;
    padding: 2rem 1rem 4rem;
  }

  .intro {
    text-align: center;
    margin-bottom: 2rem;
  }

  .intro h2 {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 0.5rem;
  }

  .lede {
    color: var(--text-muted);
    font-size: 1rem;
    max-width: 520px;
    margin: 0 auto;
  }

  /* Drop Zone */
  .drop-zone {
    border: 2px dashed var(--border);
    border-radius: var(--radius-lg);
    padding: 4rem 2rem;
    text-align: center;
    cursor: pointer;
    background: var(--bg-card);
    transition: border-color 0.2s, background 0.2s;
    outline: none;
  }

  .drop-zone:hover,
  .drop-zone:focus-visible {
    border-color: var(--accent);
    background: var(--bg-elevated);
  }

  .drop-zone.dragging {
    border-color: var(--accent);
    background: var(--bg-elevated);
  }

  .drop-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .drop-hint {
    font-size: 1.1rem;
    color: var(--text);
    margin: 0 0 0.25rem;
  }

  .drop-hint-sub {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin: 0;
  }

  /* Workspace */
  .workspace {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .info-bar {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 0.75rem 1rem;
    background: var(--bg-card);
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
    flex-wrap: wrap;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .info-label {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .info-val {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text);
  }

  /* Tabs */
  .tabs {
    display: flex;
    gap: 0.25rem;
    border-bottom: 2px solid var(--border);
  }

  .tab-btn {
    padding: 0.5rem 1.25rem;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    cursor: pointer;
    font-size: 0.95rem;
    color: var(--text-muted);
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
    transition: color 0.15s;
  }

  .tab-btn:hover {
    color: var(--text);
  }

  .tab-btn.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
    font-weight: 600;
  }

  /* Tab Content */
  .tab-content {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  /* Controls */
  .controls-row {
    display: flex;
    align-items: flex-end;
    gap: 1rem;
    flex-wrap: wrap;
    padding: 1rem;
    background: var(--bg-card);
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
  }

  .controls-row.wrap {
    flex-wrap: wrap;
  }

  .control-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 80px;
  }

  .control-group label {
    font-size: 0.8rem;
    color: var(--text-muted);
    font-weight: 500;
  }

  .control-group select,
  .control-group input[type="number"] {
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg);
    color: var(--text);
    font-size: 0.9rem;
    outline: none;
  }

  .control-group select:focus,
  .control-group input[type="number"]:focus {
    border-color: var(--accent);
  }

  .num-input {
    width: 90px;
  }

  .quality-group {
    flex: 1;
    min-width: 180px;
  }

  .quality-val {
    font-weight: 700;
    color: var(--accent);
    margin-left: 0.25rem;
  }

  .quality-slider {
    width: 100%;
    accent-color: var(--accent);
  }

  /* Buttons */
  .btn-primary {
    padding: 0.5rem 1.25rem;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    transition: opacity 0.15s;
    white-space: nowrap;
  }

  .btn-primary:hover {
    opacity: 0.88;
  }

  .btn-secondary {
    padding: 0.4rem 0.9rem;
    background: var(--bg-elevated);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 0.85rem;
    transition: background 0.15s;
    white-space: nowrap;
  }

  .btn-secondary:hover {
    background: var(--bg-card);
  }

  .btn-sm {
    margin-left: auto;
  }

  .btn-dl {
    margin-top: 0.5rem;
    width: 100%;
  }

  /* Preview Row (Compress) */
  .preview-row {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .arrow {
    font-size: 1.5rem;
    color: var(--text-muted);
    align-self: center;
    flex-shrink: 0;
  }

  .preview-card {
    flex: 1;
    min-width: 200px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    box-shadow: var(--shadow-sm);
  }

  .preview-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    align-self: flex-start;
  }

  .preview-img {
    max-width: 100%;
    max-height: 300px;
    object-fit: contain;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
  }

  .preview-meta {
    font-size: 0.875rem;
    color: var(--text);
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .badge-success {
    display: inline-block;
    padding: 0.1em 0.5em;
    background: var(--success);
    color: #fff;
    border-radius: var(--radius-sm);
    font-size: 0.78rem;
    font-weight: 700;
  }

  .badge-warn {
    display: inline-block;
    padding: 0.1em 0.5em;
    background: var(--error);
    color: #fff;
    border-radius: var(--radius-sm);
    font-size: 0.78rem;
    font-weight: 700;
  }

  .placeholder {
    padding: 2rem 1rem;
    color: var(--text-muted);
    font-size: 0.9rem;
    text-align: center;
  }

  /* Crop Workspace */
  .crop-workspace {
    display: flex;
    gap: 1.5rem;
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .crop-image-wrap {
    position: relative;
    overflow: hidden;
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-sm);
    flex-shrink: 0;
    max-width: 100%;
  }

  .crop-image-wrap img {
    display: block;
  }

  .crop-overlay {
    position: absolute;
    border: 2px dashed var(--accent);
    box-sizing: border-box;
    pointer-events: none;
    z-index: 10;
  }

  .crop-handle {
    position: absolute;
    width: 10px;
    height: 10px;
    background: var(--accent);
    border-radius: 2px;
  }

  .crop-handle.tl { top: -5px; left: -5px; }
  .crop-handle.tr { top: -5px; right: -5px; }
  .crop-handle.bl { bottom: -5px; left: -5px; }
  .crop-handle.br { bottom: -5px; right: -5px; }

  .crop-dim {
    position: absolute;
    background: rgba(0, 0, 0, 0.45);
    pointer-events: none;
    z-index: 5;
  }

  .crop-result {
    flex: 1;
    min-width: 200px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    box-shadow: var(--shadow-sm);
  }

  .crop-result-img {
    max-width: 100%;
    max-height: 300px;
    object-fit: contain;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
  }

  @media (max-width: 600px) {
    .preview-row {
      flex-direction: column;
    }
    .arrow {
      transform: rotate(90deg);
      align-self: center;
    }
    .crop-workspace {
      flex-direction: column;
    }
    .info-bar {
      gap: 0.75rem;
    }
  }
</style>
