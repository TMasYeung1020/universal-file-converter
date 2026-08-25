<script lang="ts">
  import NavBar from './lib/components/NavBar.svelte';
  import ThemeToggle from './lib/components/ThemeToggle.svelte';

  function hashToRoute(hash: string): string {
    const r = hash.startsWith('#') ? hash.slice(1) : hash;
    return r || '/';
  }

  let route = $state(hashToRoute(window.location.hash));

  $effect(() => {
    const onHashChange = () => {
      route = hashToRoute(window.location.hash);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  });

  // Lazy-loaded component registry — each entry is a separate chunk at build time
  type SvelteComp = new (...args: any[]) => any;
  const loaders: Record<string, () => Promise<{ default: SvelteComp }>> = {
    '/':                    () => import('./pages/HomePage.svelte'),
    '/convert':             () => import('./pages/ConverterPage.svelte'),
    '/tools/json':          () => import('./pages/tools/JsonPage.svelte'),
    '/tools/base64':        () => import('./pages/tools/Base64Page.svelte'),
    '/tools/cron':          () => import('./pages/tools/CronPage.svelte'),
    '/tools/regex':         () => import('./pages/tools/RegExPage.svelte'),
    '/tools/pdf':           () => import('./pages/tools/PdfToolsPage.svelte'),
    '/tools/wordcount':     () => import('./pages/tools/WordCountPage.svelte'),
    '/tools/diff':          () => import('./pages/tools/DiffPage.svelte'),
    '/tools/convert-text':  () => import('./pages/tools/ConvertTextPage.svelte'),
    '/tools/compound':      () => import('./pages/tools/CompoundPage.svelte'),
    '/tools/mortgage':      () => import('./pages/tools/MortgagePage.svelte'),
    '/tools/tdee':          () => import('./pages/tools/TdeePage.svelte'),
    '/tools/units':         () => import('./pages/tools/UnitsPage.svelte'),
    '/tools/image-compress':() => import('./pages/tools/ImageCompressPage.svelte'),
    '/tools/watermark':     () => import('./pages/tools/WatermarkPage.svelte'),
    '/tools/remove-bg':     () => import('./pages/tools/RemoveBgPage.svelte'),
    '/tools/avif':          () => import('./pages/tools/AvifPage.svelte'),
    '/tools/video-stitch':  () => import('./pages/tools/VideoStitchPage.svelte'),
  };

  // Cache resolved components so re-navigation doesn't flicker
  const moduleCache = new Map<string, SvelteComp | null>();

  function loadForRoute(r: string): Promise<SvelteComp | null> {
    if (moduleCache.has(r)) return Promise.resolve(moduleCache.get(r)!);
    const loader = loaders[r];
    if (!loader) {
      moduleCache.set(r, null);
      return Promise.resolve(null);
    }
    return loader().then(m => {
      moduleCache.set(r, m.default);
      return m.default;
    });
  }

  let componentPromise = $state<Promise<SvelteComp | null>>(loadForRoute(route));

  $effect(() => {
    componentPromise = loadForRoute(route);
  });
</script>

<div class="shell">
  <header class="topbar">
    <NavBar {route} />
    <div class="topbar-right">
      <a
        class="gh"
        href="https://github.com/TMasYeung1020/universal-file-converter"
        target="_blank"
        rel="noreferrer"
        title="View source on GitHub"
      >
        GitHub
      </a>
      <ThemeToggle />
    </div>
  </header>

  <main class="main">
    {#await componentPromise}
      <div class="loading-page">
        <span class="spinner-lg"></span>
      </div>
    {:then Component}
      {#if Component}
        <svelte:component this={Component} />
      {:else}
        <div class="not-found">
          <div class="icon">🚧</div>
          <h2>開發中</h2>
          <p>這個工具還在做 — 回<a href="#/">首頁</a>看看已有工具。</p>
        </div>
      {/if}
    {:catch}
      <div class="not-found">
        <div class="icon">⚠️</div>
        <h2>載入失敗</h2>
        <p>請重新整理頁面，或回<a href="#/">首頁</a>。</p>
      </div>
    {/await}
  </main>

  <footer class="foot">
    <span>Universal Tools · 純前端 · 無伺服器 · 100% 用戶端</span>
  </footer>
</div>

<style>
  .shell {
    max-width: 900px;
    margin: 0 auto;
    padding: 0 20px 64px;
    display: flex;
    flex-direction: column;
    gap: 0;
    min-height: 100vh;
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
  }

  .topbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .gh {
    color: var(--text-muted);
    text-decoration: none;
    font-size: 13px;
    border: 1px solid var(--border);
    padding: 5px 12px;
    border-radius: var(--radius-sm);
    transition: color 0.12s ease, border-color 0.12s ease;
  }

  .gh:hover {
    color: var(--text);
    border-color: var(--accent);
  }

  .main {
    flex: 1;
    padding: 20px 0;
  }

  .loading-page {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 240px;
  }

  .spinner-lg {
    width: 28px;
    height: 28px;
    border: 3px solid color-mix(in srgb, var(--accent) 25%, transparent);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .not-found {
    text-align: center;
    padding: 60px 0;
  }

  .not-found .icon {
    font-size: 48px;
    margin-bottom: 12px;
  }

  .not-found h2 {
    margin: 0 0 8px;
    font-size: 22px;
  }

  .not-found p {
    color: var(--text-muted);
    font-size: 15px;
  }

  .foot {
    text-align: center;
    color: var(--text-muted);
    font-size: 12px;
    padding: 16px 0;
    border-top: 1px solid var(--border);
    margin-top: auto;
  }
</style>
