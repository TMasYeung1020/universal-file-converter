<script lang="ts">
  // Pure-presentational theme toggle. Theme is applied by toggling the
  // `.dark` class on the <html> element, which swaps the CSS variables.

  let isDark = $state(loadDefault());

  function loadDefault(): boolean {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('ufc-theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function apply(dark: boolean) {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('ufc-theme', dark ? 'dark' : 'light');
  }

  function toggle() {
    isDark = !isDark;
    apply(isDark);
  }

  $effect(() => {
    apply(isDark);
  });
</script>

<button
  type="button"
  class="theme-toggle"
  aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
  onclick={toggle}
>
  {isDark ? '☀️' : '🌙'}
</button>

<style>
  .theme-toggle {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 999px;
    width: 36px;
    height: 36px;
    font-size: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s ease, border-color 0.15s ease;
  }

  .theme-toggle:hover {
    transform: translateY(-1px);
    border-color: var(--accent);
  }
</style>