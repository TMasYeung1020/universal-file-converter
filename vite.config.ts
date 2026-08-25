import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

// GitHub Pages serves the site under /<repo-name>/ by default. Override with
// `BASE_PATH=/` (e.g. for a custom domain) at build time.
const base = process.env.BASE_PATH ?? '/universal-file-converter/';

export default defineConfig({
  plugins: [svelte()],
  base,
  build: {
    // Initial bundle is dominated by docx + jspdf's html2canvas dep.
    // TODO: lazy-load these with dynamic imports once we have a critical mass of formats.
    chunkSizeWarningLimit: 1500,
  },
});