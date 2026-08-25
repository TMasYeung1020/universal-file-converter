// Image converters. All conversions route through an HTMLImageElement +
// Canvas, so PNG ↔ JPG ↔ WebP ↔ SVG all share the same machinery.
// Raster → vector (e.g. PNG → SVG) is intentionally NOT supported in MVP.

import type { Converter, ConverterContext } from '../types';

interface ImageFormatPair {
  from: string;
  to: string;
  label: string;
  /** Source MIME used when loading the bitmap into an Image element. */
  sourceMime: string;
  /** Target MIME used when calling canvas.toBlob(). */
  targetMime: string;
}

const PAIRS: ImageFormatPair[] = [
  { from: 'png', to: 'jpg', label: 'PNG → JPEG', sourceMime: 'image/png', targetMime: 'image/jpeg' },
  { from: 'png', to: 'webp', label: 'PNG → WebP', sourceMime: 'image/png', targetMime: 'image/webp' },
  { from: 'jpg', to: 'png', label: 'JPEG → PNG', sourceMime: 'image/jpeg', targetMime: 'image/png' },
  { from: 'jpg', to: 'webp', label: 'JPEG → WebP', sourceMime: 'image/jpeg', targetMime: 'image/webp' },
  { from: 'webp', to: 'png', label: 'WebP → PNG', sourceMime: 'image/webp', targetMime: 'image/png' },
  { from: 'webp', to: 'jpg', label: 'WebP → JPEG', sourceMime: 'image/webp', targetMime: 'image/jpeg' },
  // SVG sources need a data: URL because the browser cannot fetch them directly.
  { from: 'svg', to: 'png', label: 'SVG → PNG', sourceMime: 'image/svg+xml', targetMime: 'image/png' },
  { from: 'svg', to: 'jpg', label: 'SVG → JPEG', sourceMime: 'image/svg+xml', targetMime: 'image/jpeg' },
  { from: 'svg', to: 'webp', label: 'SVG → WebP', sourceMime: 'image/svg+xml', targetMime: 'image/webp' },
];

export const IMAGE_CONVERTERS: Converter[] = PAIRS.map((p) => ({
  from: p.from,
  to: p.to,
  label: p.label,
  fn: (ctx) => rasterConvert(ctx, p.sourceMime, p.targetMime),
}));

function rasterConvert(
  ctx: ConverterContext,
  sourceMime: string,
  targetMime: string,
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const g = canvas.getContext('2d');
      if (!g) {
        reject(new Error('Could not get 2D canvas context'));
        return;
      }
      // For JPEG output, paint an opaque background — JPEG has no alpha.
      if (targetMime === 'image/jpeg') {
        g.fillStyle = '#ffffff';
        g.fillRect(0, 0, canvas.width, canvas.height);
      }
      g.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas produced no blob'));
            return;
          }
          blob.arrayBuffer().then((ab) => resolve(new Uint8Array(ab)));
        },
        targetMime,
        0.92,
      );
    };
    img.onerror = () => reject(new Error(`Failed to load image as ${sourceMime}`));
    img.src = makeImageSrc(ctx.data, sourceMime);
  });
}

function makeImageSrc(data: string | Uint8Array, mime: string): string {
  if (typeof data === 'string') {
    // SVG (or any text format) → base64 data URL.
    const b64 = btoa(unescape(encodeURIComponent(data)));
    return `data:${mime};base64,${b64}`;
  }
  const bytes = data;
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}