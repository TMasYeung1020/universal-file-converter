<script lang="ts">
  // Root component. Owns the hash-based router state and renders the
  // correct page based on the current hash.

  import NavBar from './lib/components/NavBar.svelte';
  import ThemeToggle from './lib/components/ThemeToggle.svelte';
  import HomePage from './pages/HomePage.svelte';
  import ConverterPage from './pages/ConverterPage.svelte';

  function hashToRoute(hash: string): string {
    // Strip the leading '#' so we get '/convert', '/', etc.
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
    {#if route === '/' || route === ''}
      <HomePage />
    {:else if route === '/convert'}
      <ConverterPage />
    {:else}
      <!-- Placeholder for upcoming tool routes -->
      <div class="not-found">
        <div class="icon">🚧</div>
        <h2>开发中</h2>
        <p>这个工具还在做 — 回<a href="#/">首页</a>看看已有工具。</p>
      </div>
    {/if}
  </main>

  <footer class="foot">
    <span>Universal Tools · 纯前端 · 无服务器 · 100% 客户端</span>
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