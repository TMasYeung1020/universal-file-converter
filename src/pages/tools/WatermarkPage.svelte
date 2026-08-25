<script lang="ts">
  // Svelte 5 runes are compiler builtins — no import needed.

  // --- state ---
  let baseFile = $state<File | null>(null);
  let baseDataUrl = $state<string | null>(null);
  let baseImage = $state<HTMLImageElement | null>(null);

  let mode = $state<'text' | 'image'>('text');

  // text watermark
  let wmText = $state('© 版权所有');
  let wmFontSize = $state(36);
  let wmColor = $state('#ffffff');
  let wmOpacity = $state(50);
  let wmFontFamily = $state('default');
  let wmPosition = $state('center');
  let wmRotation = $state(0);

  // image watermark
  let wmImageFile = $state<File | null>(null);
  let wmImageDataUrl = $state<string | null>(null);
  let wmImage = $state<HTMLImageElement | null>(null);
  let wmScale = $state(20);
  let wmImgOpacity = $state(70);
  let wmImgPosition = $state('center');

  // UI
  let isDragging = $state(false);
  let previewCanvas = $state<HTMLCanvasElement | null>(null);
  let outputMessage = $state('');

  const MAX_PREVIEW = 500;

  function fontFamilyString(f: string): string {
    if (f === 'mono') return '"Courier New", Courier, monospace';
    if (f === 'serif') return 'Georgia, "Times New Roman", serif';
    return 'Arial, sans-serif';
  }

  function hexToRgba(hex: string, opacity: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${opacity / 100})`;
  }

  function getPositionXY(
    pos: string,
    cw: number,
    ch: number,
    ww: number,
    wh: number,
    padding = 20
  ): { x: number; y: number } {
    switch (pos) {
      case 'top-left':     return { x: padding + ww / 2, y: padding + wh / 2 };
      case 'top-right':    return { x: cw - padding - ww / 2, y: padding + wh / 2 };
      case 'bottom-left':  return { x: padding + ww / 2, y: ch - padding - wh / 2 };
      case 'bottom-right': return { x: cw - padding - ww / 2, y: ch - padding - wh / 2 };
      default:             return { x: cw / 2, y: ch / 2 };
    }
  }

  function drawWatermark(ctx: CanvasRenderingContext2D, cw: number, ch: number, scale = 1) {
    ctx.save();

    if (mode === 'text') {
      const fs = wmFontSize * scale;
      ctx.font = `${fs}px ${fontFamilyString(wmFontFamily)}`;
      ctx.fillStyle = hexToRgba(wmColor, wmOpacity);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const metrics = ctx.measureText(wmText);
      const tw = metrics.width;
      const th = fs * 1.2;

      if (wmPosition === 'tile') {
        const stepX = tw * 2;
        const stepY = th * 3;
        for (let y = 0; y < ch + stepY; y += stepY) {
          for (let x = -stepX / 2; x < cw + stepX; x += stepX) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate((wmRotation * Math.PI) / 180);
            ctx.fillText(wmText, 0, 0);
            ctx.restore();
          }
        }
      } else {
        const { x, y } = getPositionXY(wmPosition, cw, ch, tw, th);
        ctx.translate(x, y);
        ctx.rotate((wmRotation * Math.PI) / 180);
        ctx.fillText(wmText, 0, 0);
      }
    } else if (mode === 'image' && wmImage) {
      const drawW = (cw / scale) * (wmScale / 100) * scale;
      const ratio = wmImage.naturalHeight / wmImage.naturalWidth;
      const drawH = drawW * ratio;

      ctx.globalAlpha = wmImgOpacity / 100;

      if (wmImgPosition === 'tile') {
        const stepX = drawW * 1.5;
        const stepY = drawH * 1.5;
        for (let y = 0; y < ch + stepY; y += stepY) {
          for (let x = 0; x < cw + stepX; x += stepX) {
            ctx.drawImage(wmImage, x - drawW / 2, y - drawH / 2, drawW, drawH);
          }
        }
      } else {
        const { x, y } = getPositionXY(wmImgPosition, cw, ch, drawW, drawH);
        ctx.drawImage(wmImage, x - drawW / 2, y - drawH / 2, drawW, drawH);
      }
    }

    ctx.restore();
  }

  function renderPreview() {
    if (!previewCanvas || !baseImage) return;
    const nw = baseImage.naturalWidth;
    const nh = baseImage.naturalHeight;
    const scale = Math.min(1, MAX_PREVIEW / nw);
    const pw = Math.round(nw * scale);
    const ph = Math.round(nh * scale);
    previewCanvas.width = pw;
    previewCanvas.height = ph;
    const ctx = previewCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, pw, ph);
    ctx.drawImage(baseImage, 0, 0, pw, ph);
    drawWatermark(ctx, pw, ph, scale);
  }

  $effect(() => {
    // re-render whenever relevant state changes
    const _ = [
      baseImage, mode,
      wmText, wmFontSize, wmColor, wmOpacity, wmFontFamily, wmPosition, wmRotation,
      wmImage, wmScale, wmImgOpacity, wmImgPosition,
      previewCanvas
    ];
    renderPreview();
  });

  function loadFile(file: File, setter: (url: string, img: HTMLImageElement) => void) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      const img = new Image();
      img.onload = () => setter(url, img);
      img.src = url;
    };
    reader.readAsDataURL(file);
  }

  function handleBaseFile(file: File) {
    if (!file.type.match(/image\/(png|jpeg|webp)/)) return;
    baseFile = file;
    loadFile(file, (url, img) => {
      baseDataUrl = url;
      baseImage = img;
    });
  }

  function handleWmImageFile(file: File) {
    if (!file.type.match(/image\//)) return;
    wmImageFile = file;
    loadFile(file, (url, img) => {
      wmImageDataUrl = url;
      wmImage = img;
    });
  }

  function onDropBase(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    const file = e.dataTransfer?.files[0];
    if (file) handleBaseFile(file);
  }

  function onBaseInput(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) handleBaseFile(file);
  }

  function onWmInput(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) handleWmImageFile(file);
  }

  function download() {
    if (!baseImage) return;
    const nw = baseImage.naturalWidth;
    const nh = baseImage.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = nw;
    canvas.height = nh;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(baseImage, 0, 0);
    drawWatermark(ctx, nw, nh, 1);
    const link = document.createElement('a');
    link.download = 'watermarked.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    outputMessage = '已下载！';
    setTimeout(() => (outputMessage = ''), 2000);
  }
</script>

<div class="page-body">
  <div class="intro">
    <h2>浮水印添加器</h2>
    <p class="lede">为图片添加文字或图片水印，在浏览器本地处理，不上传服务器。</p>
  </div>

  <!-- Base image upload -->
  <div
    class="drop-zone"
    class:active={isDragging}
    class:has-image={!!baseImage}
    role="button"
    tabindex="0"
    ondragover={(e) => { e.preventDefault(); isDragging = true; }}
    ondragleave={() => { isDragging = false; }}
    ondrop={onDropBase}
    onclick={() => document.getElementById('base-input')?.click()}
    onkeydown={(e) => e.key === 'Enter' && document.getElementById('base-input')?.click()}
  >
    {#if baseImage}
      <span class="drop-label">已选择：{baseFile?.name}（点击更换）</span>
    {:else}
      <span class="drop-label">拖放图片到此处，或点击选择（PNG / JPG / WebP）</span>
    {/if}
    <input id="base-input" type="file" accept="image/png,image/jpeg,image/webp" style="display:none" oninput={onBaseInput} />
  </div>

  {#if baseImage}
  <div class="workspace">
    <!-- Controls -->
    <div class="controls-panel">
      <!-- Mode tabs -->
      <div class="tabs">
        <button class="tab" class:active={mode === 'text'} onclick={() => (mode = 'text')}>文字水印</button>
        <button class="tab" class:active={mode === 'image'} onclick={() => (mode = 'image')}>图片水印</button>
      </div>

      {#if mode === 'text'}
      <div class="control-group">
        <label>水印文字</label>
        <input type="text" bind:value={wmText} placeholder="© 版权所有" />
      </div>

      <div class="control-group">
        <label>字体大小：{wmFontSize}px</label>
        <input type="range" min="12" max="120" bind:value={wmFontSize} />
      </div>

      <div class="control-group">
        <label>字体颜色</label>
        <input type="color" bind:value={wmColor} />
      </div>

      <div class="control-group">
        <label>不透明度：{wmOpacity}%</label>
        <input type="range" min="0" max="100" bind:value={wmOpacity} />
      </div>

      <div class="control-group">
        <label>字体</label>
        <select bind:value={wmFontFamily}>
          <option value="default">默认（无衬线）</option>
          <option value="mono">等宽</option>
          <option value="serif">衬线</option>
        </select>
      </div>

      <div class="control-group">
        <label>位置</label>
        <select bind:value={wmPosition}>
          <option value="top-left">左上</option>
          <option value="top-right">右上</option>
          <option value="bottom-left">左下</option>
          <option value="bottom-right">右下</option>
          <option value="center">居中</option>
          <option value="tile">平铺</option>
        </select>
      </div>

      <div class="control-group">
        <label>旋转角度：{wmRotation}°</label>
        <input type="range" min="-45" max="45" bind:value={wmRotation} />
      </div>

      {:else}
      <!-- image watermark -->
      <div class="control-group">
        <label>水印图片</label>
        <button class="upload-btn" onclick={() => document.getElementById('wm-input')?.click()}>
          {wmImage ? wmImageFile?.name : '选择图片'}
        </button>
        <input id="wm-input" type="file" accept="image/*" style="display:none" oninput={onWmInput} />
      </div>

      <div class="control-group">
        <label>缩放比例：{wmScale}%</label>
        <input type="range" min="5" max="100" bind:value={wmScale} />
      </div>

      <div class="control-group">
        <label>不透明度：{wmImgOpacity}%</label>
        <input type="range" min="0" max="100" bind:value={wmImgOpacity} />
      </div>

      <div class="control-group">
        <label>位置</label>
        <select bind:value={wmImgPosition}>
          <option value="top-left">左上</option>
          <option value="top-right">右上</option>
          <option value="bottom-left">左下</option>
          <option value="bottom-right">右下</option>
          <option value="center">居中</option>
          <option value="tile">平铺</option>
        </select>
      </div>
      {/if}

      <button class="download-btn" onclick={download}>下载带水印图片</button>
      {#if outputMessage}<p class="success-msg">{outputMessage}</p>{/if}
    </div>

    <!-- Preview -->
    <div class="preview-panel">
      <p class="preview-label">预览（缩略图，最大 {MAX_PREVIEW}px）</p>
      <div class="canvas-wrap">
        <canvas bind:this={previewCanvas}></canvas>
      </div>
    </div>
  </div>
  {/if}
</div>

<style>
  .page-body {
    max-width: 960px;
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
    margin: 0 0 0.5rem;
  }

  .lede {
    color: var(--text-muted);
    font-size: 1rem;
    margin: 0;
  }

  /* Drop zone */
  .drop-zone {
    border: 2px dashed var(--border);
    border-radius: var(--radius-md);
    padding: 2.5rem 1rem;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
    background: var(--bg-card);
    margin-bottom: 1.5rem;
    color: var(--text-muted);
    user-select: none;
  }

  .drop-zone:hover,
  .drop-zone.active {
    border-color: var(--accent);
    background: var(--bg-elevated);
  }

  .drop-zone.has-image {
    border-style: solid;
    border-color: var(--accent);
    color: var(--text);
  }

  .drop-label {
    font-size: 0.95rem;
  }

  /* Workspace */
  .workspace {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 1.5rem;
    align-items: start;
  }

  @media (max-width: 680px) {
    .workspace {
      grid-template-columns: 1fr;
    }
  }

  /* Controls panel */
  .controls-panel {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    box-shadow: var(--shadow-sm);
  }

  .tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .tab {
    flex: 1;
    padding: 0.4rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg);
    color: var(--text-muted);
    font-size: 0.85rem;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }

  .tab.active {
    background: var(--accent);
    color: #fff;
    border-color: var(--accent);
  }

  .control-group {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .control-group label {
    font-size: 0.8rem;
    color: var(--text-muted);
    font-weight: 500;
  }

  .control-group input[type='text'],
  .control-group select {
    width: 100%;
    padding: 0.4rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg);
    color: var(--text);
    font-size: 0.9rem;
    box-sizing: border-box;
  }

  .control-group input[type='range'] {
    width: 100%;
    accent-color: var(--accent);
  }

  .control-group input[type='color'] {
    width: 2.5rem;
    height: 2rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: none;
    cursor: pointer;
    padding: 0;
  }

  .upload-btn {
    padding: 0.4rem 0.75rem;
    border: 1px dashed var(--accent);
    border-radius: var(--radius-sm);
    background: var(--bg);
    color: var(--accent);
    font-size: 0.85rem;
    cursor: pointer;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .upload-btn:hover {
    background: var(--bg-elevated);
  }

  .download-btn {
    margin-top: 0.5rem;
    padding: 0.6rem 1rem;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: var(--radius-sm);
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .download-btn:hover {
    opacity: 0.88;
  }

  .success-msg {
    font-size: 0.85rem;
    color: var(--success);
    margin: 0;
    text-align: center;
  }

  /* Preview */
  .preview-panel {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .preview-label {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin: 0;
  }

  .canvas-wrap {
    background: repeating-conic-gradient(#888 0% 25%, transparent 0% 50%) 0 0 / 16px 16px;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    overflow: hidden;
    display: inline-block;
    max-width: 100%;
  }

  .canvas-wrap canvas {
    display: block;
    max-width: 100%;
    height: auto;
  }
</style>
