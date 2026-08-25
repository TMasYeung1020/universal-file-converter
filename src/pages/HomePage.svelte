<script lang="ts">
  // Hub / home page. Each tool category is a card that links to its
  // section. Tools that are not yet implemented show a "coming soon" badge.

  interface Tool {
    name: string;
    desc: string;
    route: string;
    live: boolean;
  }

  interface Category {
    icon: string;
    label: string;
    color: string; /* CSS hue, used for the gradient accent */
    tools: Tool[];
  }

  const CATEGORIES: Category[] = [
    {
      icon: '📁',
      label: '檔案格式轉換',
      color: '246',
      tools: [
        { name: '萬能格式轉換器', desc: '19 種格式互轉，純瀏覽器', route: '/convert', live: true },
      ],
    },
    {
      icon: '🔧',
      label: '開發者 & IT 工具',
      color: '217',
      tools: [
        { name: 'JSON 格式化', desc: '高亮 · 格式化 · 壓縮 · 轉 CSV/YAML', route: '/tools/json', live: true },
        { name: 'Base64 / URL 編解碼', desc: '文字或檔案 ↔ Base64', route: '/tools/base64', live: true },
        { name: 'Cron 表達式解析器', desc: '可視化配置定時任務', route: '/tools/cron', live: true },
        { name: 'RegEx 測試器', desc: '即時匹配高亮', route: '/tools/regex', live: true },
        { name: 'PDF 合併 / 拆分 / 旋轉', desc: '用 pdf-lib 在前端完成', route: '/tools/pdf', live: true },
      ],
    },
    {
      icon: '📝',
      label: '文字 & 排版工具',
      color: '160',
      tools: [
        { name: '字數 & 字符統計', desc: '字數 · 段落 · 閱讀時間', route: '/tools/wordcount', live: true },
        { name: '文字 Diff 比對', desc: '紅綠高亮增刪內容', route: '/tools/diff', live: true },
        { name: '繁簡 / 全半形轉換', desc: '批量替換', route: '/tools/convert-text', live: true },
      ],
    },
    {
      icon: '🧮',
      label: '日常計算器',
      color: '142',
      tools: [
        { name: '複利 & 定投計算器', desc: '資產成長曲線 & 表格', route: '/tools/compound', live: true },
        { name: '房貸試算', desc: '等額本息 & 本金，月還款明細', route: '/tools/mortgage', live: true },
        { name: 'TDEE 卡路里計算', desc: '基礎代謝 & 熱量需求', route: '/tools/tdee', live: true },
        { name: '單位轉換器', desc: '重量 · 長度 · 儲存容量', route: '/tools/units', live: true },
      ],
    },
    {
      icon: '🖼️',
      label: '圖片 & 媒體處理',
      color: '30',
      tools: [
        { name: '圖片壓縮 & 裁切', desc: 'Canvas toDataURL 本地壓縮', route: '/tools/image-compress', live: true },
        { name: '浮水印添加器', desc: '文字 / Logo 疊加並導出', route: '/tools/watermark', live: true },
        { name: '純色 / 綠幕去背', desc: 'RGBA 像素色差過濾', route: '/tools/remove-bg', live: true },
        { name: 'AVIF 轉換', desc: '瀏覽器端壓縮新格式', route: '/tools/avif', live: true },
      ],
    },
    {
      icon: '🎬',
      label: '影片工具',
      color: '0',
      tools: [
        { name: '影片拼接 & 導出', desc: 'ffmpeg.wasm 本地處理', route: '/tools/video-stitch', live: true },
      ],
    },
  ];
</script>

<div class="hub">
  <div class="hero">
    <h2>選一個工具，馬上開始</h2>
    <p>所有工具都在瀏覽器本地運行，檔案不上傳任何伺服器。</p>
  </div>

  <div class="categories">
    {#each CATEGORIES as cat}
      <section class="cat" style="--hue: {cat.color}">
        <div class="cat-head">
          <span class="cat-icon">{cat.icon}</span>
          <h3>{cat.label}</h3>
        </div>
        <div class="tools">
          {#each cat.tools as tool}
            {#if tool.live}
              <a class="tool-card" href="#{tool.route}">
                <span class="tool-name">{tool.name}</span>
                <span class="tool-desc">{tool.desc}</span>
                <span class="badge live">✓ 可用</span>
              </a>
            {:else}
              <div class="tool-card soon">
                <span class="tool-name">{tool.name}</span>
                <span class="tool-desc">{tool.desc}</span>
                <span class="badge soon-badge">開發中</span>
              </div>
            {/if}
          {/each}
        </div>
      </section>
    {/each}
  </div>
</div>

<style>
  .hub {
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  .hero {
    text-align: center;
    padding: 8px 0;
  }

  .hero h2 {
    font-size: 22px;
    font-weight: 700;
    margin: 0 0 6px;
    letter-spacing: -0.02em;
  }

  .hero p {
    color: var(--text-muted);
    margin: 0;
    font-size: 14px;
  }

  .categories {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .cat {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 20px;
    box-shadow: var(--shadow-sm);
  }

  .cat-head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }

  .cat-icon {
    font-size: 22px;
  }

  .cat-head h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
  }

  .tools {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 10px;
  }

  .tool-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px 14px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
    background: var(--bg-elevated);
    text-decoration: none;
    color: inherit;
    position: relative;
    transition: transform 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease;
  }

  .tool-card:not(.soon):hover {
    border-color: hsl(var(--hue), 60%, 55%);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  .tool-card.soon {
    opacity: 0.65;
    cursor: default;
  }

  .tool-name {
    font-weight: 600;
    font-size: 14px;
  }

  .tool-desc {
    font-size: 12px;
    color: var(--text-muted);
  }

  .badge {
    align-self: flex-start;
    margin-top: 4px;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 500;
  }

  .badge.live {
    background: color-mix(in srgb, #10b981 15%, transparent);
    color: #059669;
  }

  :global(.dark) .badge.live {
    color: #34d399;
  }

  .badge.soon-badge {
    background: color-mix(in srgb, var(--text-muted) 12%, transparent);
    color: var(--text-muted);
  }
</style>
