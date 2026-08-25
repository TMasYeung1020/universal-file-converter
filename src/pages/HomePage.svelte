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
      label: '文件格式转换',
      color: '246',
      tools: [
        { name: '万能格式转换器', desc: '19 种格式互转，纯浏览器', route: '/convert', live: true },
      ],
    },
    {
      icon: '🔧',
      label: '开发者 & IT 工具',
      color: '217',
      tools: [
        { name: 'JSON 格式化', desc: '高亮 · 格式化 · 压缩 · 转 CSV/YAML', route: '/tools/json', live: false },
        { name: 'Base64 / URL 编解码', desc: '文字或文件 ↔ Base64', route: '/tools/base64', live: false },
        { name: 'Cron 表达式解析器', desc: '可视化配置定时任务', route: '/tools/cron', live: false },
        { name: 'RegEx 测试器', desc: '实时匹配高亮', route: '/tools/regex', live: false },
        { name: 'PDF 合并 / 拆分 / 旋转', desc: '用 pdf-lib 在前端完成', route: '/tools/pdf', live: false },
      ],
    },
    {
      icon: '📝',
      label: '文字 & 排版工具',
      color: '160',
      tools: [
        { name: '字数 & 字符统计', desc: '字数 · 段落 · 阅读时间', route: '/tools/wordcount', live: false },
        { name: '文字 Diff 比对', desc: '红绿高亮增删内容', route: '/tools/diff', live: false },
        { name: '繁简 / 全半形转换', desc: '批量替换', route: '/tools/convert-text', live: false },
      ],
    },
    {
      icon: '🧮',
      label: '日常计算器',
      color: '142',
      tools: [
        { name: '复利 & 定投计算器', desc: '资产成长曲线 & 表格', route: '/tools/compound', live: false },
        { name: '房贷试算', desc: '等额本息 & 本金，月还款明细', route: '/tools/mortgage', live: false },
        { name: 'TDEE 卡路里计算', desc: '基础代谢 & 热量需求', route: '/tools/tdee', live: false },
        { name: '单位转换器', desc: '重量 · 长度 · 储存容量', route: '/tools/units', live: false },
      ],
    },
    {
      icon: '🖼️',
      label: '图片 & 媒体处理',
      color: '30',
      tools: [
        { name: '图片压缩 & 裁切', desc: 'Canvas toDataURL 本地压缩', route: '/tools/image-compress', live: false },
        { name: '浮水印添加器', desc: '文字 / Logo 叠加并导出', route: '/tools/watermark', live: false },
        { name: '纯色 / 绿幕去背', desc: 'RGBA 像素色差过滤', route: '/tools/remove-bg', live: false },
        { name: 'AVIF 转换', desc: '浏览器端压缩新格式', route: '/tools/avif', live: false },
      ],
    },
    {
      icon: '🎬',
      label: '视频工具',
      color: '0',
      tools: [
        { name: '视频拼接 & 导出', desc: 'ffmpeg.wasm 本地处理', route: '/tools/video-stitch', live: false },
      ],
    },
  ];
</script>

<div class="hub">
  <div class="hero">
    <h2>选一个工具，马上开始</h2>
    <p>所有工具都在浏览器本地运行，文件不上传任何服务器。</p>
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
                <span class="badge soon-badge">开发中</span>
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