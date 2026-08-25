# 🌐 Universal File Converter

> 一个纯前端的文件格式转换器 — 文档、图片、数据格式全覆盖。**所有转换都在你的浏览器里完成，文件不上传任何服务器。**

![Made with Svelte](https://img.shields.io/badge/Svelte-5-ff3e00?logo=svelte&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-22c55e)
![No backend](https://img.shields.io/badge/backend-none-8b5cf6)

## ✨ 特性

- 🔒 **隐私优先** — 文件不上传，转换完全在浏览器本地执行
- 🎯 **自动检测** — 同时支持扩展名 + magic bytes 嗅探
- 🧠 **智能路由** — 用图算法自动找最短转换路径（A→B 走的最少步骤）
- 🌓 **明暗双主题** — 跟随系统 + 可手动切换
- ⚡ **离线可用** — 首次加载后可断网使用
- 📦 **零后端** — 纯静态站点，GitHub Pages 即可托管

## 📚 支持的格式

### 文档
Markdown · HTML · PDF · DOCX · TXT

### 图片
PNG · JPG/JPEG · WebP · SVG

### 数据
JSON · CSV · YAML · TOML · XML

> 想加新格式？只需要在 `src/lib/formats.ts` 注册格式节点，再写一个 converter 模块挂到图里就行 — 已有逻辑自动工作。

## 🏗️ 架构

```
                  ┌──────────────────┐
                  │  format registry │  ← src/lib/formats.ts
                  └────────┬─────────┘
                           │
                           ▼
        ┌────────────────────────────────────┐
        │     converter graph (BFS)          │  ← src/lib/graph.ts
        │                                    │
        │   JSON ── CSV ── YAML ── TOML ── XML
        │   PNG ── JPG ── WebP ── SVG
        │   MD ── HTML ── PDF / DOCX / TXT
        └──────────────┬─────────────────────┘
                       ▼
              ┌─────────────────┐
              │ pipeline runner │  ← src/lib/pipeline.ts
              └────────┬────────┘
                       ▼
                  download
```

**核心思想**：每种格式是图里的一个**节点**，每两个能互转的格式之间是一条**有向边**。用户想 A→C 时，BFS 自动找最短路径，未来加格式只需补节点和边，不用改老代码。

## 🚀 本地开发

```bash
npm install
npm run dev      # 打开 http://localhost:5173
```

## 📦 构建部署

```bash
npm run build    # 产物在 dist/
npm run preview  # 本地预览构建产物
```

部署到 GitHub Pages：项目自带 `.github/workflows/deploy.yml`，推到 `main` 分支会自动构建并发布。

> 如果你想部署到自定义域名或不同的 repo 名，构建时设置环境变量 `BASE_PATH=/`。

## 🛠️ 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Svelte 5 (runes) |
| 构建 | Vite 8 |
| 类型 | TypeScript strict |
| 部署 | GitHub Pages + Actions |

转换引擎用到的库：
- `marked` / `turndown` — Markdown ↔ HTML
- `mammoth` — DOCX → HTML
- `docx` — HTML → DOCX
- `jspdf` — HTML → PDF
- `papaparse` — CSV
- `js-yaml` — YAML
- `smol-toml` — TOML
- `fast-xml-parser` — XML

## 📁 项目结构

```
src/
├── App.svelte                  # 主页面
├── app.css                     # 全局样式 + 主题变量
├── main.ts                     # 入口
└── lib/
    ├── types.ts                # Format / Converter / DetectedFile 等
    ├── formats.ts              # 格式注册表
    ├── graph.ts                # BFS 最短路径
    ├── detect.ts               # 格式自动检测
    ├── pipeline.ts             # 转换管线执行器
    ├── converters/
    │   ├── index.ts            # 汇总 + 构建图
    │   ├── document.ts         # MD / HTML / PDF / DOCX / TXT
    │   ├── image.ts            # PNG / JPG / WebP / SVG
    │   └── data.ts             # JSON / CSV / YAML / TOML / XML
    └── components/
        ├── DropZone.svelte
        ├── FileCard.svelte
        ├── FormatPicker.svelte
        └── ThemeToggle.svelte
```

## 🗺️ Roadmap

- [ ] PDF → 文本/图片（用 pdfjs-dist）
- [ ] 图片 → SVG 矢量追踪（potrace via wasm）
- [ ] 批量转换 UI（统一目标格式 + 队列进度）
- [ ] 转换历史（localStorage）
- [ ] PWA 离线支持（service worker）
- [ ] 拖拽排序 / 文件夹拖入

## 📄 License

MIT — 详见 [LICENSE](LICENSE)。

---

🎓 学生 side project — 有想法或 bug 欢迎开 issue / PR。