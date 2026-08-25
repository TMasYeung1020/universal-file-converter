<script lang="ts">
  import { PDFDocument, degrees } from 'pdf-lib';
  import JSZip from 'jszip';

  type Tab = 'merge' | 'split' | 'rotate';
  let activeTab = $state<Tab>('merge');

  function download(bytes: Uint8Array, filename: string) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function readFileBytes(file: File): Promise<Uint8Array> {
    return new Uint8Array(await file.arrayBuffer());
  }

  function parseRanges(raw: string, totalPages: number): number[] {
    const indices = new Set<number>();
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
    for (const part of parts) {
      if (part.includes('-')) {
        const [a, b] = part.split('-').map(Number);
        if (isNaN(a) || isNaN(b)) throw new Error(`无效范围: "${part}"`);
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        if (lo < 1 || hi > totalPages) throw new Error(`页码超出范围 (共 ${totalPages} 页): "${part}"`);
        for (let i = lo; i <= hi; i++) indices.add(i - 1);
      } else {
        const n = Number(part);
        if (isNaN(n)) throw new Error(`无效页码: "${part}"`);
        if (n < 1 || n > totalPages) throw new Error(`页码超出范围 (共 ${totalPages} 页): "${part}"`);
        indices.add(n - 1);
      }
    }
    return [...indices].sort((a, b) => a - b);
  }

  // ── Merge ─────────────────────────────────────────────────────────────────
  let mergeFiles = $state<File[]>([]);
  let mergeLoading = $state(false);
  let mergeError = $state('');
  let mergeDragOver = $state(false);
  let mergeDragSrcIdx = $state<number | null>(null);

  function handleMergeInput(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    if (input.files) {
      const valid = [...input.files].filter(f => f.name.toLowerCase().endsWith('.pdf'));
      mergeFiles = [...mergeFiles, ...valid];
      input.value = '';
    }
  }

  function handleMergeDrop(e: DragEvent) {
    e.preventDefault();
    mergeDragOver = false;
    if (!e.dataTransfer) return;
    const dropped = [...e.dataTransfer.files].filter(f => f.name.toLowerCase().endsWith('.pdf'));
    mergeFiles = [...mergeFiles, ...dropped];
  }

  function removeMergeFile(idx: number) {
    mergeFiles = mergeFiles.filter((_, i) => i !== idx);
  }

  function onMergeDragStart(idx: number) { mergeDragSrcIdx = idx; }
  function onMergeDragOverItem(e: DragEvent, idx: number) {
    e.preventDefault();
    if (mergeDragSrcIdx === null || mergeDragSrcIdx === idx) return;
    const arr = [...mergeFiles];
    const [moved] = arr.splice(mergeDragSrcIdx, 1);
    arr.splice(idx, 0, moved);
    mergeFiles = arr;
    mergeDragSrcIdx = idx;
  }
  function onMergeDragEnd() { mergeDragSrcIdx = null; }

  async function doMerge() {
    mergeError = '';
    if (mergeFiles.length < 2) { mergeError = '请至少上传 2 个 PDF 文件。'; return; }
    mergeLoading = true;
    try {
      const dest = await PDFDocument.create();
      for (const file of mergeFiles) {
        const bytes = await readFileBytes(file);
        const src = await PDFDocument.load(bytes);
        const copied = await dest.copyPages(src, src.getPageIndices());
        copied.forEach(p => dest.addPage(p));
      }
      download(await dest.save(), 'merged.pdf');
    } catch (err: unknown) {
      mergeError = err instanceof Error ? err.message : String(err);
    } finally {
      mergeLoading = false;
    }
  }

  // ── Split ─────────────────────────────────────────────────────────────────
  let splitFile = $state<File | null>(null);
  let splitTotalPages = $state(0);
  let splitRangeInput = $state('');
  let splitLoading = $state(false);
  let splitError = $state('');
  let splitDragOver = $state(false);

  async function handleSplitInput(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    if (input.files?.[0]) { await loadSplitFile(input.files[0]); input.value = ''; }
  }

  async function handleSplitDrop(e: DragEvent) {
    e.preventDefault();
    splitDragOver = false;
    const f = [...(e.dataTransfer?.files ?? [])].find(f => f.name.toLowerCase().endsWith('.pdf'));
    if (f) await loadSplitFile(f);
  }

  async function loadSplitFile(file: File) {
    splitError = ''; splitFile = file; splitTotalPages = 0;
    try {
      const doc = await PDFDocument.load(await readFileBytes(file));
      splitTotalPages = doc.getPageCount();
    } catch (err: unknown) {
      splitError = err instanceof Error ? err.message : String(err);
      splitFile = null;
    }
  }

  async function doSplit() {
    splitError = '';
    if (!splitFile) { splitError = '请先上传 PDF 文件。'; return; }
    if (!splitRangeInput.trim()) { splitError = '请输入页码范围，例如 1-3,5,7-9。'; return; }
    splitLoading = true;
    try {
      const src = await PDFDocument.load(await readFileBytes(splitFile));
      const segments = splitRangeInput.split(';').map(s => s.trim()).filter(Boolean);
      const groups: number[][] = segments.map(seg => parseRanges(seg, splitTotalPages));

      if (groups.length === 1) {
        const out = await PDFDocument.create();
        const pages = await out.copyPages(src, groups[0]);
        pages.forEach(p => out.addPage(p));
        download(await out.save(), 'split.pdf');
      } else {
        const zip = new JSZip();
        for (let gi = 0; gi < groups.length; gi++) {
          const out = await PDFDocument.create();
          const pages = await out.copyPages(src, groups[gi]);
          pages.forEach(p => out.addPage(p));
          zip.file(`split_part${gi + 1}.pdf`, await out.save());
        }
        downloadBlob(await zip.generateAsync({ type: 'blob' }), 'split_parts.zip');
      }
    } catch (err: unknown) {
      splitError = err instanceof Error ? err.message : String(err);
    } finally {
      splitLoading = false;
    }
  }

  // ── Rotate ────────────────────────────────────────────────────────────────
  let rotateFile = $state<File | null>(null);
  let rotateTotalPages = $state(0);
  let rotatePagesInput = $state('all');
  let rotateAngle = $state<90 | 180 | 270>(90);
  let rotateLoading = $state(false);
  let rotateError = $state('');
  let rotateDragOver = $state(false);

  async function handleRotateInput(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    if (input.files?.[0]) { await loadRotateFile(input.files[0]); input.value = ''; }
  }

  async function handleRotateDrop(e: DragEvent) {
    e.preventDefault();
    rotateDragOver = false;
    const f = [...(e.dataTransfer?.files ?? [])].find(f => f.name.toLowerCase().endsWith('.pdf'));
    if (f) await loadRotateFile(f);
  }

  async function loadRotateFile(file: File) {
    rotateError = ''; rotateFile = file; rotateTotalPages = 0;
    try {
      const doc = await PDFDocument.load(await readFileBytes(file));
      rotateTotalPages = doc.getPageCount();
    } catch (err: unknown) {
      rotateError = err instanceof Error ? err.message : String(err);
      rotateFile = null;
    }
  }

  async function doRotate() {
    rotateError = '';
    if (!rotateFile) { rotateError = '请先上传 PDF 文件。'; return; }
    rotateLoading = true;
    try {
      const doc = await PDFDocument.load(await readFileBytes(rotateFile));
      const total = doc.getPageCount();
      const targetIndices: Set<number> = rotatePagesInput.trim().toLowerCase() === 'all'
        ? new Set(Array.from({ length: total }, (_, i) => i))
        : new Set(parseRanges(rotatePagesInput, total));
      const pages = doc.getPages();
      for (let i = 0; i < pages.length; i++) {
        if (targetIndices.has(i)) {
          const current = pages[i].getRotation().angle;
          pages[i].setRotation(degrees((current + rotateAngle) % 360));
        }
      }
      download(await doc.save(), 'rotated.pdf');
    } catch (err: unknown) {
      rotateError = err instanceof Error ? err.message : String(err);
    } finally {
      rotateLoading = false;
    }
  }
</script>

<div class="page-body">
  <div class="intro">
    <h2>PDF 工具</h2>
    <p class="lede">合并 · 拆分 · 旋转 · 纯浏览器处理，文件不上传任何服务器</p>
  </div>

  <div class="tabs" role="tablist">
    <button role="tab" class:active={activeTab === 'merge'} onclick={() => { activeTab = 'merge'; }}>合并 PDF</button>
    <button role="tab" class:active={activeTab === 'split'} onclick={() => { activeTab = 'split'; }}>拆分 PDF</button>
    <button role="tab" class:active={activeTab === 'rotate'} onclick={() => { activeTab = 'rotate'; }}>旋转页面</button>
  </div>

  <!-- Merge -->
  {#if activeTab === 'merge'}
    <div class="tab-panel">
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="dropzone" class:over={mergeDragOver}
        ondragover={(e) => { e.preventDefault(); mergeDragOver = true; }}
        ondragleave={() => { mergeDragOver = false; }}
        ondrop={handleMergeDrop}
      >
        <span class="drop-icon">📄</span>
        <span class="drop-label">拖拽 PDF 文件到此处，或</span>
        <label class="file-btn">
          点击选择文件（支持多选）
          <input type="file" accept=".pdf" multiple onchange={handleMergeInput} />
        </label>
      </div>

      {#if mergeFiles.length > 0}
        <div class="list-head">
          <span class="list-meta">已添加 {mergeFiles.length} 个文件（拖拽可排序）</span>
          <button class="ghost" onclick={() => { mergeFiles = []; }}>清空</button>
        </div>
        <ul class="file-list">
          {#each mergeFiles as f, i (f.name + i)}
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <li class="file-item" draggable="true"
              ondragstart={() => onMergeDragStart(i)}
              ondragover={(e) => onMergeDragOverItem(e, i)}
              ondragend={onMergeDragEnd}
            >
              <span class="drag-handle">⠿</span>
              <span class="file-name">{f.name}</span>
              <span class="file-size">{(f.size / 1024).toFixed(1)} KB</span>
              <button class="rm-btn" aria-label="删除" onclick={() => removeMergeFile(i)}>×</button>
            </li>
          {/each}
        </ul>
      {/if}

      {#if mergeError}<p class="error">{mergeError}</p>{/if}
      <button class="primary-btn" disabled={mergeLoading || mergeFiles.length < 2} onclick={doMerge}>
        {#if mergeLoading}<span class="spinner"></span> 处理中…{:else}合并并下载{/if}
      </button>
    </div>
  {/if}

  <!-- Split -->
  {#if activeTab === 'split'}
    <div class="tab-panel">
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="dropzone" class:over={splitDragOver}
        ondragover={(e) => { e.preventDefault(); splitDragOver = true; }}
        ondragleave={() => { splitDragOver = false; }}
        ondrop={handleSplitDrop}
      >
        <span class="drop-icon">📄</span>
        <span class="drop-label">拖拽单个 PDF 文件到此处，或</span>
        <label class="file-btn">
          点击选择文件
          <input type="file" accept=".pdf" onchange={handleSplitInput} />
        </label>
      </div>

      {#if splitFile}
        <div class="file-info-row">
          <span class="file-name">{splitFile.name}</span>
          <span class="page-count">共 <strong>{splitTotalPages}</strong> 页</span>
        </div>
        <div class="field">
          <label for="split-range">页码范围</label>
          <input id="split-range" type="text" placeholder="例：1-3,5,7-9  多段用分号：1-3;5;7-9" bind:value={splitRangeInput} />
          <p class="hint">逗号分隔合并为一个 PDF；分号分隔多段打包为 ZIP。</p>
        </div>
      {/if}

      {#if splitError}<p class="error">{splitError}</p>{/if}
      <button class="primary-btn" disabled={splitLoading || !splitFile || !splitRangeInput.trim()} onclick={doSplit}>
        {#if splitLoading}<span class="spinner"></span> 处理中…{:else}拆分并下载{/if}
      </button>
    </div>
  {/if}

  <!-- Rotate -->
  {#if activeTab === 'rotate'}
    <div class="tab-panel">
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="dropzone" class:over={rotateDragOver}
        ondragover={(e) => { e.preventDefault(); rotateDragOver = true; }}
        ondragleave={() => { rotateDragOver = false; }}
        ondrop={handleRotateDrop}
      >
        <span class="drop-icon">📄</span>
        <span class="drop-label">拖拽单个 PDF 文件到此处，或</span>
        <label class="file-btn">
          点击选择文件
          <input type="file" accept=".pdf" onchange={handleRotateInput} />
        </label>
      </div>

      {#if rotateFile}
        <div class="file-info-row">
          <span class="file-name">{rotateFile.name}</span>
          <span class="page-count">共 <strong>{rotateTotalPages}</strong> 页</span>
        </div>
        <div class="field">
          <label for="rotate-pages">旋转哪些页</label>
          <input id="rotate-pages" type="text" placeholder="all 或 1,3,5 或 2-4" bind:value={rotatePagesInput} />
          <p class="hint">all 旋转全部，或逗号 / 范围指定页码。</p>
        </div>
        <div class="field">
          <div class="field-group-label">旋转角度</div>
          <div class="angle-group">
            {#each ([90, 180, 270] as const) as angle}
              <label class="angle-opt">
                <input type="radio" name="rotate-angle" value={angle} checked={rotateAngle === angle} onchange={() => { rotateAngle = angle; }} />
                {angle}°
              </label>
            {/each}
          </div>
        </div>
      {/if}

      {#if rotateError}<p class="error">{rotateError}</p>{/if}
      <button class="primary-btn" disabled={rotateLoading || !rotateFile} onclick={doRotate}>
        {#if rotateLoading}<span class="spinner"></span> 处理中…{:else}旋转并下载{/if}
      </button>
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

  .dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    border: 2px dashed var(--border);
    border-radius: var(--radius-lg);
    padding: 36px 24px;
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
    transition: opacity 0.15s;
  }
  .file-btn:hover { opacity: 0.88; }
  .file-btn input { display: none; }

  .list-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .list-meta { font-size: 13px; color: var(--text-muted); }

  .file-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  .file-item {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 8px 12px;
    cursor: grab;
    user-select: none;
  }
  .drag-handle { color: var(--text-muted); opacity: 0.5; }
  .file-name { flex: 1; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .file-size { font-size: 12px; color: var(--text-muted); }
  .rm-btn { background: transparent; border: none; font-size: 18px; color: var(--text-muted); cursor: pointer; padding: 0 2px; }
  .rm-btn:hover { color: #ef4444; }

  .file-info-row {
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 10px 14px;
    font-size: 13px;
  }
  .file-info-row .file-name { flex: 1; }
  .page-count { color: var(--text-muted); }

  .field { display: flex; flex-direction: column; gap: 6px; }
  .field label, .field-group-label { font-size: 13px; font-weight: 600; }
  .field input[type='text'] {
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 8px 12px;
    font-size: 14px;
    background: var(--bg-card);
    color: inherit;
    outline: none;
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.15s;
  }
  .field input[type='text']:focus { border-color: var(--accent); }
  .hint { margin: 0; font-size: 12px; color: var(--text-muted); }

  .angle-group { display: flex; gap: 10px; }
  .angle-opt {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 16px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg-elevated);
    font-size: 14px;
    cursor: pointer;
    transition: border-color 0.15s;
  }
  .angle-opt:has(input:checked) {
    border-color: var(--accent);
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    font-weight: 600;
  }
  .angle-opt input { accent-color: var(--accent); }

  .primary-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 24px;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: var(--radius-sm);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    align-self: flex-start;
    transition: opacity 0.15s;
  }
  .primary-btn:hover:not(:disabled) { opacity: 0.88; }
  .primary-btn:disabled { opacity: 0.45; cursor: not-allowed; }

  .ghost {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-muted);
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    cursor: pointer;
  }
  .ghost:hover { color: var(--text); }

  .error {
    margin: 0;
    padding: 10px 14px;
    background: color-mix(in srgb, var(--error) 10%, transparent);
    color: var(--error);
    border-radius: var(--radius-sm);
    font-size: 13px;
  }

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,0.35);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
