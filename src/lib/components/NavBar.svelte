<script lang="ts">
  // Site-wide navigation bar with mobile-friendly layout.
  interface Props {
    route: string;
  }
  let { route }: Props = $props();

  const links: { label: string; href: string; icon: string }[] = [
    { label: '全部工具', href: '#/', icon: '⚡' },
    { label: '檔案轉換', href: '#/convert', icon: '📁' },
  ];
</script>

<nav class="navbar">
  <a class="brand" href="#/">
    <span class="logo">🌐</span>
    <span class="name">Universal Tools</span>
  </a>

  <div class="links">
    {#each links as l}
      <a
        class="nav-link"
        class:active={
          l.href === '#/'
            ? route === '/' || route === ''
            : route.startsWith(l.href.slice(1))
        }
        href={l.href}
      >
        {l.icon} {l.label}
      </a>
    {/each}
  </div>
</nav>

<style>
  .navbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 4px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 8px;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;
    color: inherit;
  }

  .logo {
    font-size: 22px;
  }

  .name {
    font-weight: 700;
    font-size: 16px;
    letter-spacing: -0.01em;
  }

  .links {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .nav-link {
    color: var(--text-muted);
    text-decoration: none;
    font-size: 13px;
    font-weight: 500;
    padding: 5px 10px;
    border-radius: var(--radius-sm);
    transition: color 0.12s ease, background 0.12s ease;
  }

  .nav-link:hover,
  .nav-link.active {
    color: var(--text);
    background: var(--bg-elevated);
  }

  .nav-link.active {
    color: var(--accent);
  }
</style>
