<script lang="ts">
  // Dropdown of formats compatible with the file's category, plus a small
  // visual hint when no path exists for a given target.

  import type { Format } from '../types';

  interface Props {
    formats: Format[];
    value: string | null;
    onchange: (id: string) => void;
    disabled?: boolean;
  }

  let { formats, value, onchange, disabled = false }: Props = $props();
</script>

<select
  {disabled}
  value={value ?? ''}
  onchange={(e) => onchange((e.currentTarget as HTMLSelectElement).value)}
>
  <option value="" disabled>选择目标格式…</option>
  {#each formats as f (f.id)}
    <option value={f.id}>{f.label}</option>
  {/each}
</select>

<style>
  select {
    min-width: 160px;
  }
</style>