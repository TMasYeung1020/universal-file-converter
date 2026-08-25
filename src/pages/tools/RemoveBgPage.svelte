<script lang="ts">
  // ── state ──────────────────────────────────────────────────────────────────
  let file = $state<File | null>(null);
  let originalImageData = $state<ImageData | null>(null);
  let originalDataUrl = $state<string>('');
  let resultDataUrl = $state<string>('');

  let mode = $state<'picker' | 'preset'>('picker');
  let pickedColor = $state<{ r: number; g: number; b: number } | null>(null);
  let pickedHex = $state<string>('');

  let tolerance = $state(30);
  let feather = $state(1);
  let outputBg = $state<'transparent' | '#ffffff' | '#000000' | 'custom'>('transparent');
  let customBgColor = $state('#ff00ff');

  let showAfter = $state(true); // false = show "before"
  let isDragging = $state(false);
  let processing = $state(false);
  let error = $state('');

  // refs
  let previewCanvas = $state<HTMLCanvasElement | null>(null);
  let fileInput = $state<HTMLInputElement | null>(null);

  // ── derived ────────────────────────────────────────────────────────────────
  let hasImage = $derived(!!originalImageData);
  let hasResult = $derived(!!resultDataUrl);
  let canProcess = $derived(hasImage && (pickedColor !== null || mode === 'preset'));

  let effectiveBg = $derived(
    outputBg === 'custom' ? customBgColor : outputBg
  );

  // ── helpers ────────────────────────────────────────────────────────────────
  function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const clean = hex.replace('#', '');
    return {
      r: parseInt(clean.substring(0, 2), 16),
      g: parseInt(clean.substring(2, 4), 16),
      b: parseInt(clean.substring(4, 6), 16),
    };
  }

  function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  function removeBackground(
    src: ImageData,
    targetR: number,
    targetG: number,
    targetB: number,
    tol: number,
    feath: number,
    bg: string
  ): ImageData {
    const clone = new ImageData(
      new Uint8ClampedArray(src.data),
      src.width,
      src.height
    );
    const data = clone.data;
    const maxDist = Math.sqrt(3 * 255 * 255);
    const normalizedTol = (tol / 100) * maxDist;

    // If bg is not transparent, parse it
    let bgR = 255, bgG = 255, bgB = 255;
    if (bg !== 'transparent') {
      const parsed = hexToRgb(bg);
      bgR = parsed.r; bgG = parsed.g; bgB = parsed.b;
    }

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const dist = Math.sqrt(
        (r - targetR) ** 2 + (g - targetG) ** 2 + (b - targetB) ** 2
      );

      if (dist <= normalizedTol) {
        if (bg === 'transparent') {
          data[i + 3] = 0;
        } else {
          data[i] = bgR; data[i + 1] = bgG; data[i + 2] = bgB;
          data[i + 3] = 255;
        }
      } else if (feath > 0 && dist <= normalizedTol + feath * 10) {
        const t = (dist - normalizedTol) / (feath * 10);
        const alpha = Math.floor(255 * t);
        if (bg === 'transparent') {
          data[i + 3] = alpha;
        } else {
          // Blend pixel with bg
          const blend = (a: number, bv: number) =>
            Math.round(a * t + bv * (1 - t));
          data[i] = blend(r, bgR);
          data[i + 1] = blend(g, bgG);
          data[i + 2] = blend(b, bgB);
          data[i + 3] = 255;
        }
      }
    }
    return clone;
  }

  function imageDataToDataUrl(imgData: ImageData, mimeType = 'image/png'): string {
    const cvs = document.createElement('canvas');
    cvs.width = imgData.width;
    cvs.height = imgData.height;
    const ctx = cvs.getContext('2d')!;
    ctx.putImageData(imgData, 0, 0);
    return cvs.toDataURL(mimeType);
  }

  function loadFile(f: File) {
    if (!f.type.startsWith('image/')) {
      error = '请上传图片文件 (PNG / JPG / WebP)';
      return;
    }
    error = '';
    file = f;
    pickedColor = null;
    pickedHex = '';
    resultDataUrl = '';

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      originalDataUrl = src;
      const img = new Image();
      img.onload = () => {
        const cvs = document.createElement('canvas');
        cvs.width = img.naturalWidth;
        cvs.height = img.naturalHeight;
        const ctx = cvs.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        originalImageData = ctx.getImageData(0, 0, cvs.width, cvs.height);
        drawPreview();
      };
      img.src = src;
    };
    reader.readAsDataURL(f);
  }

  function drawPreview() {
    if (!previewCanvas || !originalImageData) return;
    const cvs = previewCanvas;
    const maxW = cvs.parentElement?.clientWidth ?? 600;
    const maxH = 400;
    const scale = Math.min(
      maxW / originalImageData.width,
      maxH / originalImageData.height,
      1
    );
    cvs.width = Math.round(originalImageData.width * scale);
    cvs.height = Math.round(originalImageData.height * scale);
    const ctx = cvs.getContext('2d')!;

    if (showAfter && hasResult) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, cvs.width, cvs.height);
      img.src = resultDataUrl;
    } else {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, cvs.width, cvs.height);
      img.src = originalDataUrl;
    }
  }

  function processImage(targetR: number, targetG: number, targetB: number) {
    if (!originalImageData) return;
    processing = true;
    // Use requestAnimationFrame to avoid blocking UI
    requestAnimationFrame(() => {
      try {
        const result = removeBackground(
          originalImageData!,
          targetR, targetG, targetB,
          tolerance, feather, effectiveBg
        );
        resultDataUrl = imageDataToDataUrl(result);
        showAfter = true;
        drawPreview();
      } catch (err) {
        error = '处理失败，请重试';
      } finally {
        processing = false;
      }
    });
  }

  function applyPreset(hex: string) {
    const { r, g, b } = hexToRgb(hex);
    pickedColor = { r, g, b };
    pickedHex = hex;
    processImage(r, g, b);
  }

  function onCanvasClick(e: MouseEvent) {
    if (mode !== 'picker' || !previewCanvas || !originalImageData) return;
    const cvs = previewCanvas;
    const rect = cvs.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) * (cvs.width / rect.width));
    const y = Math.round((e.clientY - rect.top) * (cvs.height / rect.height));

    // Sample from the original image at proportional coords
    const origX = Math.round(x * (originalImageData.width / cvs.width));
    const origY = Math.round(y * (originalImageData.height / cvs.height));

    const tempCvs = document.createElement('canvas');
    tempCvs.width = originalImageData.width;
    tempCvs.height = originalImageData.height;
    const ctx = tempCvs.getContext('2d')!;
    ctx.putImageData(originalImageData, 0, 0);
    const px = ctx.getImageData(origX, origY, 1, 1).data;

    pickedColor = { r: px[0], g: px[1], b: px[2] };
    pickedHex = rgbToHex(px[0], px[1], px[2]);
    processImage(px[0], px[1], px[2]);
  }

  function reprocess() {
    if (!pickedColor) return;
    processImage(pickedColor.r, pickedColor.g, pickedColor.b);
  }

  function download() {
    if (!resultDataUrl) return;
    const a = document.createElement('a');
    a.href = resultDataUrl;
    a.download = (file?.name.replace(/\.[^.]+$/, '') ?? 'image') + '-nobg.png';
    a.click();
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    const f = e.dataTransfer?.files[0];
    if (f) loadFile(f);
  }

  function onFileChange(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) loadFile(f);
  }

  // Re-draw preview whenever showAfter or resultDataUrl changes
  $effect(() => {
    if (originalImageData) drawPreview();
  });

  // Re-process when tolerance/feather/outputBg change and we have a picked color
  $effect(() => {
    // track reactive deps
    const _t = tolerance;
    const _f = feather;
    const _bg = effectiveBg;
    if (pickedColor && originalImageData) {
      processImage(pickedColor.r, pickedColor.g, pickedColor.b);
    }
  });
</script>

<div class="page-body">
  <div class="intro">
    <h2>纯色 / 绿幕去背</h2>
    <p class="lede">上传图片，点击取样背景色或选择预设色，一键去除纯色背景，支持透明 PNG 输出。</p>
  </div>

  <!-- Upload zone -->
  {#if !hasImage}
    <div
      class="upload-zone"
      class:dragging={isDragging}
      ondragover={(e) => { e.preventDefault(); isDragging = true; }}
      ondragleave={() => { isDragging = false; }}
      ondrop={onDrop}
      onclick={() => fileInput?.click()}
      role="button"
      tabindex="0"
      onkeydown={(e) => e.key === 'Enter' && fileInput?.click()}
    >
      <div class="upload-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      </div>
      <p class="upload-label">点击或拖拽上传图片</p>
      <p class="upload-hint">支持 PNG、JPG、WebP</p>
      <input
        bind:this={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onchange={onFileChange}
        class="file-input"
      />
    </div>
  {/if}

  {#if error}
    <div class="error-banner">{error}</div>
  {/if}

  {#if hasImage}
    <div class="tool-layout">
      <!-- Left: preview -->
      <div class="preview-section">
        <div class="preview-toolbar">
          <span class="preview-label">
            {mode === 'picker' ? '点击图片取样背景色' : '预览'}
          </span>
          {#if hasResult}
            <div class="toggle-group">
              <button
                class="toggle-btn"
                class:active={!showAfter}
                onclick={() => { showAfter = false; drawPreview(); }}
              >原图</button>
              <button
                class="toggle-btn"
                class:active={showAfter}
                onclick={() => { showAfter = true; drawPreview(); }}
              >去背后</button>
            </div>
          {/if}
          <button class="btn-ghost btn-sm" onclick={() => { file = null; originalImageData = null; originalDataUrl = ''; resultDataUrl = ''; pickedColor = null; error = ''; }}>
            重新上传
          </button>
        </div>

        <div class="canvas-wrap" class:picker-mode={mode === 'picker'}>
          <canvas
            bind:this={previewCanvas}
            onclick={onCanvasClick}
          ></canvas>
          {#if processing}
            <div class="processing-overlay">
              <div class="spinner"></div>
              <span>处理中…</span>
            </div>
          {/if}
        </div>

        {#if pickedColor}
          <div class="sampled-color-row">
            <span class="sampled-swatch" style="background:{pickedHex}"></span>
            <span class="sampled-label">已取样：<code>{pickedHex}</code></span>
          </div>
        {/if}
      </div>

      <!-- Right: controls -->
      <div class="controls-section">
        <!-- Mode tabs -->
        <div class="tab-row">
          <button
            class="tab-btn"
            class:active={mode === 'picker'}
            onclick={() => { mode = 'picker'; }}
          >颜色取样</button>
          <button
            class="tab-btn"
            class:active={mode === 'preset'}
            onclick={() => { mode = 'preset'; }}
          >预设颜色</button>
        </div>

        {#if mode === 'picker'}
          <div class="panel">
            <p class="panel-hint">在左侧预览图上点击背景区域，自动取样并去除该颜色。</p>
            {#if !pickedColor}
              <div class="no-pick-notice">尚未取样 — 点击图片中的背景色</div>
            {/if}
          </div>
        {:else}
          <div class="panel">
            <p class="panel-hint">选择预设颜色快速去除：</p>
            <div class="preset-grid">
              <button
                class="preset-btn green"
                onclick={() => applyPreset('#00ff00')}
              >
                <span class="preset-swatch" style="background:#00ff00"></span>
                绿幕
              </button>
              <button
                class="preset-btn blue"
                onclick={() => applyPreset('#0000ff')}
              >
                <span class="preset-swatch" style="background:#0000ff"></span>
                蓝幕
              </button>
              <button
                class="preset-btn white"
                onclick={() => applyPreset('#ffffff')}
              >
                <span class="preset-swatch" style="background:#ffffff;border:1px solid var(--border)"></span>
                白色背景
              </button>
              <button
                class="preset-btn black"
                onclick={() => applyPreset('#000000')}
              >
                <span class="preset-swatch" style="background:#000000"></span>
                黑色背景
              </button>
            </div>
          </div>
        {/if}

        <!-- Tolerance -->
        <div class="control-group">
          <div class="control-header">
            <label class="control-label">容差</label>
            <span class="control-value">{tolerance}</span>
          </div>
          <input
            type="range" min="0" max="100" step="1"
            bind:value={tolerance}
            class="slider"
          />
          <div class="slider-hints"><span>精确</span><span>宽松</span></div>
        </div>

        <!-- Feather -->
        <div class="control-group">
          <div class="control-header">
            <label class="control-label">边缘羽化</label>
            <span class="control-value">{feather} px</span>
          </div>
          <input
            type="range" min="0" max="5" step="1"
            bind:value={feather}
            class="slider"
          />
          <div class="slider-hints"><span>硬边</span><span>柔边</span></div>
        </div>

        <!-- Output BG -->
        <div class="control-group">
          <label class="control-label">输出背景</label>
          <div class="output-bg-row">
            {#each [
              { value: 'transparent', label: '透明 (PNG)' },
              { value: '#ffffff', label: '白色' },
              { value: '#000000', label: '黑色' },
              { value: 'custom', label: '自定义' }
            ] as opt}
              <button
                class="bg-option"
                class:active={outputBg === opt.value}
                onclick={() => { outputBg = opt.value as typeof outputBg; }}
              >
                {#if opt.value === 'transparent'}
                  <span class="checkered-swatch"></span>
                {:else if opt.value === 'custom'}
                  <span class="custom-swatch-wrap">
                    <span class="custom-swatch" style="background:{customBgColor}"></span>
                  </span>
                {:else}
                  <span class="color-swatch" style="background:{opt.value}; {opt.value === '#ffffff' ? 'border:1px solid var(--border)' : ''}"></span>
                {/if}
                <span>{opt.label}</span>
              </button>
            {/each}
          </div>
          {#if outputBg === 'custom'}
            <div class="custom-color-row">
              <label class="control-label-sm">颜色：</label>
              <input type="color" bind:value={customBgColor} class="color-picker-input" />
              <span class="control-value">{customBgColor}</span>
            </div>
          {/if}
        </div>

        <!-- Actions -->
        <div class="action-row">
          {#if canProcess}
            <button
              class="btn-primary"
              onclick={reprocess}
              disabled={processing}
            >
              {processing ? '处理中…' : '重新处理'}
            </button>
          {/if}
          {#if hasResult}
            <button class="btn-success" onclick={download}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              下载 PNG
            </button>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .page-body {
    max-width: 1100px;
    margin: 0 auto;
    padding: 2rem 1.5rem 4rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .intro {
    text-align: center;
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

  /* Upload zone */
  .upload-zone {
    border: 2px dashed var(--border);
    border-radius: var(--radius-lg);
    padding: 3rem 2rem;
    text-align: center;
    cursor: pointer;
    background: var(--bg-elevated);
    transition: border-color 0.2s, background 0.2s;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .upload-zone:hover,
  .upload-zone.dragging {
    border-color: var(--accent);
    background: var(--bg-card);
  }

  .upload-icon {
    color: var(--text-muted);
    margin-bottom: 0.5rem;
  }

  .upload-label {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text);
    margin: 0;
  }

  .upload-hint {
    font-size: 0.85rem;
    color: var(--text-muted);
    margin: 0;
  }

  .file-input {
    display: none;
  }

  .error-banner {
    background: color-mix(in srgb, var(--error) 15%, transparent);
    color: var(--error);
    border: 1px solid color-mix(in srgb, var(--error) 30%, transparent);
    border-radius: var(--radius-md);
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
  }

  /* Layout */
  .tool-layout {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 1.5rem;
    align-items: start;
  }

  @media (max-width: 760px) {
    .tool-layout {
      grid-template-columns: 1fr;
    }
  }

  /* Preview */
  .preview-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .preview-toolbar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .preview-label {
    font-size: 0.85rem;
    color: var(--text-muted);
    flex: 1;
  }

  .toggle-group {
    display: flex;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .toggle-btn {
    padding: 0.3rem 0.75rem;
    font-size: 0.8rem;
    background: var(--bg-elevated);
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    transition: background 0.15s, color 0.15s;
  }

  .toggle-btn.active {
    background: var(--accent);
    color: #fff;
  }

  .canvas-wrap {
    position: relative;
    background: repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 16px 16px;
    border-radius: var(--radius-md);
    overflow: hidden;
    border: 1px solid var(--border);
    min-height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .canvas-wrap.picker-mode canvas {
    cursor: crosshair;
  }

  .canvas-wrap canvas {
    display: block;
    max-width: 100%;
  }

  .processing-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    color: #fff;
    font-size: 0.9rem;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .sampled-color-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .sampled-swatch {
    width: 20px;
    height: 20px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    flex-shrink: 0;
  }

  .sampled-label code {
    font-family: monospace;
    color: var(--text);
  }

  /* Controls */
  .controls-section {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .tab-row {
    display: flex;
    border-bottom: 2px solid var(--border);
  }

  .tab-btn {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    cursor: pointer;
    color: var(--text-muted);
    transition: color 0.15s, border-color 0.15s;
  }

  .tab-btn.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
    font-weight: 600;
  }

  .panel {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .panel-hint {
    font-size: 0.85rem;
    color: var(--text-muted);
    margin: 0;
  }

  .no-pick-notice {
    background: var(--bg-elevated);
    border: 1px dashed var(--border);
    border-radius: var(--radius-md);
    padding: 0.75rem 1rem;
    font-size: 0.85rem;
    color: var(--text-muted);
    text-align: center;
  }

  .preset-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .preset-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--bg-elevated);
    cursor: pointer;
    font-size: 0.85rem;
    color: var(--text);
    transition: border-color 0.15s, background 0.15s;
  }

  .preset-btn:hover {
    border-color: var(--accent);
    background: var(--bg-card);
  }

  .preset-swatch {
    width: 18px;
    height: 18px;
    border-radius: 3px;
    flex-shrink: 0;
  }

  /* Sliders */
  .control-group {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .control-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .control-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text);
  }

  .control-value {
    font-size: 0.85rem;
    color: var(--accent);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: var(--border);
    outline: none;
    cursor: pointer;
  }

  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--accent);
    cursor: pointer;
    box-shadow: var(--shadow-sm);
  }

  .slider::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--accent);
    cursor: pointer;
    border: none;
    box-shadow: var(--shadow-sm);
  }

  .slider-hints {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  /* Output BG */
  .output-bg-row {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.4rem;
  }

  .bg-option {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg-elevated);
    cursor: pointer;
    font-size: 0.8rem;
    color: var(--text);
    transition: border-color 0.15s;
  }

  .bg-option.active {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 10%, transparent);
    color: var(--accent);
    font-weight: 600;
  }

  .color-swatch {
    width: 16px;
    height: 16px;
    border-radius: 3px;
    flex-shrink: 0;
  }

  .checkered-swatch {
    width: 16px;
    height: 16px;
    border-radius: 3px;
    flex-shrink: 0;
    background: repeating-conic-gradient(#aaa 0% 25%, #fff 0% 50%) 0 0 / 8px 8px;
    border: 1px solid var(--border);
  }

  .custom-swatch-wrap {
    display: flex;
  }

  .custom-swatch {
    width: 16px;
    height: 16px;
    border-radius: 3px;
    flex-shrink: 0;
    border: 1px solid var(--border);
  }

  .custom-color-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.25rem;
  }

  .control-label-sm {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .color-picker-input {
    width: 36px;
    height: 28px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 2px;
    cursor: pointer;
    background: var(--bg-elevated);
  }

  /* Buttons */
  .btn-ghost {
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    cursor: pointer;
    font-size: 0.8rem;
    padding: 0.3rem 0.6rem;
    transition: color 0.15s, border-color 0.15s;
  }

  .btn-ghost:hover {
    color: var(--text);
    border-color: var(--text-muted);
  }

  .btn-sm {
    padding: 0.25rem 0.6rem;
    font-size: 0.8rem;
  }

  .action-row {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .btn-primary {
    flex: 1;
    padding: 0.65rem 1rem;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: var(--radius-md);
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary:not(:disabled):hover {
    opacity: 0.88;
  }

  .btn-success {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.65rem 1rem;
    background: var(--success);
    color: #fff;
    border: none;
    border-radius: var(--radius-md);
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .btn-success:hover {
    opacity: 0.88;
  }
</style>
