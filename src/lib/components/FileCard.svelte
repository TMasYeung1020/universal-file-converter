<script lang="ts">
  // One file row: shows the detected format, lets the user pick a target,
  // shows the planned conversion path, and runs the conversion on demand.

  import FormatPicker from './FormatPicker.svelte';
  import { FORMATS, getFormat } from '../formats';
  import { GRAPH } from '../converters';
  import { planConversion } from '../graph';
  import { executePlan, outputName } from '../pipeline';
  import type { ConversionPlan, DetectedFile } from '../types';

  interface Props {
    file: DetectedFile;
    onremove: () => void;
  }

  let { file, onremove }: Props = $props();

  let targetId = $state<string | null>(null);
  let converting = $state(false);
  let result = $state<{ name: string; size: number; tookMs: number } | null>(null);
  let error = $state<string | null>(null);

  // Formats reachable from the source via the graph, excluding the source itself.
  const reachable = $derived.by(() => {
    const seen = new Set<string>();
    const queue = [file.format.id];
    seen.add(file.format.id);
    while (queue.length) {
      const cur = queue.shift()!;
      for (const c of GRAPH.edges.get(cur) ?? []) {
        if (!seen.has(c.to)) {
          seen.add(c.to);
          queue.push(c.to);
        }
      }
    }
    return FORMATS.filter((f) => seen.has(f.id) && f.id !== file.format.id);
  });

  // Pick a sensible default target on first mount.
  $effect(() => {
    if (targetId === null && reachable.length > 0) {
      // Prefer a "common sibling" — same category, popular format.
      const popular = ['pdf', 'png', 'json', 'csv', 'markdown'];
      const preferred =
        reachable.find((f) => popular.includes(f.id)) ?? reachable[0];
      targetId = preferred.id;
    }
  });

  const plan: ConversionPlan | null = $derived(
    targetId ? planConversion(GRAPH, file.format.id, targetId) : null,
  );

  const targetFormat = $derived(targetId ? getFormat(targetId) ?? null : null);

  function fmtBytes(n: number): string {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(2)} MB`;
  }

  async function run() {
    if (!plan || plan.identity || !targetFormat) return;
    converting = true;
    error = null;
    try {
      const out = await executePlan(plan, file);
      const name = outputName(file.originalName, targetFormat);
      triggerDownload(out.data, name, targetFormat.mimeTypes[0] ?? 'application/octet-stream');
      result = { name, size: out.size, tookMs: out.tookMs };
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      converting = false;
    }
  }

  function triggerDownload(data: string | Uint8Array, name: string, mime: string) {
    const blob =
      data instanceof Uint8Array
        ? new Blob([data], { type: mime })
        : new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
</script>

<div class="card">
  <div class="head">
    <div class="meta">
      <div class="name" title={file.originalName}>
        {file.originalName}
      </div>
      <div class="sub">
        <span class="badge">{file.format.label}</span>
        <span class="muted">{fmtBytes(file.size)}</span>
        {#if file.guessed}
          <span class="muted" title="格式是猜的">⚠️ 可能是</span>
        {/if}
      </div>
    </div>
    <button class="remove" type="button" onclick={onremove} aria-label="移除">✕</button>
  </div>

  <div class="row">
    <label class="lbl" for="target-{file.id}">转换为</label>
    <FormatPicker
      formats={reachable}
      value={targetId}
      onchange={(id) => {
        targetId = id;
        result = null;
        error = null;
      }}
      disabled={converting}
    />
  </div>

  {#if plan && !plan.identity}
    <div class="path">
      <span class="muted">转换路径:</span>
      <span class="node">{file.format.label}</span>
      {#each plan.steps as step, i (i)}
        <span class="arrow">→</span>
        <span class="node">{step.to.label}</span>
      {/each}
    </div>
  {:else if targetId === file.format.id}
    <div class="muted small">源格式和目标格式相同，无需转换。</div>
  {:else if !plan && targetId}
    <div class="error small">没有从 {file.format.label} 到 {targetFormat?.label} 的转换路径。</div>
  {/if}

  {#if error}
    <div class="error small">❌ {error}</div>
  {/if}

  {#if result}
    <div class="ok small">✅ 已生成 {result.name} ({fmtBytes(result.size)} · {result.tookMs.toFixed(0)} ms)</div>
  {/if}

  <div class="actions">
    <button
      type="button"
      class="primary"
      onclick={run}
      disabled={!plan || plan.identity || converting}
    >
      {converting ? '转换中…' : '转换并下载'}
    </button>
  </div>
</div>

<style>
  .card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 16px;
    box-shadow: var(--shadow-sm);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .head {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .meta {
    flex: 1;
    min-width: 0;
  }

  .name {
    font-weight: 600;
    font-size: 15px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sub {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
    font-size: 13px;
    flex-wrap: wrap;
  }

  .badge {
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    color: var(--accent);
    padding: 2px 8px;
    border-radius: 999px;
    font-weight: 500;
    font-size: 12px;
  }

  .muted {
    color: var(--text-muted);
    font-size: 13px;
  }

  .small {
    font-size: 13px;
  }

  .remove {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-muted);
    width: 28px;
    height: 28px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
  }
  .remove:hover {
    border-color: var(--error);
    color: var(--error);
  }

  .row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .lbl {
    color: var(--text-muted);
    font-size: 13px;
  }

  .path {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    font-size: 13px;
    background: var(--bg-elevated);
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
  }

  .node {
    font-weight: 500;
  }

  .arrow {
    color: var(--text-muted);
  }

  .error {
    color: var(--error);
  }

  .ok {
    color: var(--success);
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .primary {
    background: var(--accent);
    color: var(--accent-text);
    border: 0;
    padding: 8px 16px;
    border-radius: var(--radius-sm);
    font-weight: 500;
    transition: background 0.15s ease, transform 0.1s ease;
  }

  .primary:hover:not(:disabled) {
    background: var(--accent-hover);
    transform: translateY(-1px);
  }
</style>