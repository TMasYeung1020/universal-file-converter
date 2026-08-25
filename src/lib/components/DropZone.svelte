<script lang="ts">
  // Drag-and-drop + click-to-pick drop zone. Emits the chosen File objects.

  interface Props {
    onfiles: (files: File[]) => void;
  }

  let { onfiles }: Props = $props();

  let dragging = $state(false);
  let inputEl: HTMLInputElement | undefined;

  function emit(list: FileList | null) {
    if (!list || list.length === 0) return;
    onfiles(Array.from(list));
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    emit(e.dataTransfer?.files ?? null);
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    dragging = true;
  }

  function onDragLeave() {
    dragging = false;
  }
</script>

<div
  class="dropzone"
  class:dragging
  role="button"
  tabindex="0"
  ondrop={onDrop}
  ondragover={onDragOver}
  ondragleave={onDragLeave}
  onclick={() => inputEl?.click()}
  onkeydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') inputEl?.click();
  }}
>
  <div class="icon">📁</div>
  <div class="title">把文件拖进来</div>
  <div class="hint">或者点这里选择文件 — 可以一次拖多个</div>
  <input
    bind:this={inputEl}
    type="file"
    multiple
    hidden
    onchange={(e) => emit((e.currentTarget as HTMLInputElement).files)}
  />
</div>

<style>
  .dropzone {
    border: 2px dashed var(--border-strong);
    border-radius: var(--radius-lg);
    background: var(--bg-card);
    padding: 40px 24px;
    text-align: center;
    transition: all 0.15s ease;
    user-select: none;
  }

  .dropzone:hover,
  .dropzone.dragging {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 6%, var(--bg-card));
    transform: translateY(-1px);
  }

  .icon {
    font-size: 40px;
    margin-bottom: 8px;
  }

  .title {
    font-weight: 600;
    font-size: 16px;
    margin-bottom: 4px;
  }

  .hint {
    color: var(--text-muted);
    font-size: 13px;
  }
</style>