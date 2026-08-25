// PDF converters. The `pdf` format was previously write-only (HTML → PDF);
// this module adds the read direction so we can extract text and images.

import * as pdfjs from 'pdfjs-dist';
// `?url` tells Vite to copy the worker file and give us its hashed URL,
// which pdfjs needs to spin up its parsing worker.
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { jsPDF } from 'jspdf';
import type { Converter, ConverterContext } from '../types';

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

interface PdfPageProxy {
  getTextContent(): Promise<{ items: Array<{ str: string }> }>;
  getViewport(opts: { scale: number }): { width: number; height: number };
  render(opts: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
  }): { promise: Promise<void> };
}

async function openPdf(bytes: Uint8Array) {
  const buf = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  return pdfjs.getDocument({ data: buf }).promise;
}

function toBytes(canvas: HTMLCanvasElement, mime: string, quality = 0.92): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('canvas produced no blob'));
          return;
        }
        blob.arrayBuffer().then((ab) => resolve(new Uint8Array(ab)));
      },
      mime,
      quality,
    );
  });
}

// ---------- PDF → text / HTML ----------

export const pdfToTxt: Converter = {
  from: 'pdf',
  to: 'txt',
  label: 'PDF → Plain Text',
  fn: async ({ data }) => {
    if (typeof data === 'string') throw new Error('PDF input must be bytes');
    const doc = await openPdf(data);
    const parts: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = (await doc.getPage(i)) as unknown as PdfPageProxy;
      const content = await page.getTextContent();
      parts.push(content.items.map((it) => it.str).join(' '));
    }
    return parts.join('\n\n');
  },
};

export const pdfToHtml: Converter = {
  from: 'pdf',
  to: 'html',
  label: 'PDF → HTML',
  fn: async ({ data }) => {
    if (typeof data === 'string') throw new Error('PDF input must be bytes');
    const doc = await openPdf(data);
    const sections: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = (await doc.getPage(i)) as unknown as PdfPageProxy;
      const content = await page.getTextContent();
      const text = content.items.map((it) => it.str).join(' ');
      sections.push(`<section class="page"><h2>Page ${i}</h2><p>${escapeHtml(text)}</p></section>`);
    }
    return `<!doctype html><html><head><meta charset="utf-8"><title>Converted from PDF</title></head><body>${sections.join('\n')}</body></html>`;
  },
};

// ---------- PDF → image (first page only, MVP) ----------

async function pdfFirstPageToImage(
  data: Uint8Array,
  targetMime: string,
): Promise<Uint8Array> {
  const doc = await openPdf(data);
  const page = (await doc.getPage(1)) as unknown as PdfPageProxy;
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D canvas context');
  if (targetMime === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  await page.render({ canvasContext: ctx, viewport }).promise;
  return toBytes(canvas, targetMime);
}

export const pdfToPng: Converter = {
  from: 'pdf',
  to: 'png',
  label: 'PDF → PNG (first page)',
  fn: async ({ data }) => {
    if (typeof data === 'string') throw new Error('PDF input must be bytes');
    return pdfFirstPageToImage(data, 'image/png');
  },
};

export const pdfToJpg: Converter = {
  from: 'pdf',
  to: 'jpg',
  label: 'PDF → JPEG (first page)',
  fn: async ({ data }) => {
    if (typeof data === 'string') throw new Error('PDF input must be bytes');
    return pdfFirstPageToImage(data, 'image/jpeg');
  },
};

// ---------- Image → PDF ----------

interface ImageFormat {
  sourceMime: string;
}

const IMAGE_PDF_SOURCES: ImageFormat[] = [
  { sourceMime: 'image/png' },
  { sourceMime: 'image/jpeg' },
  { sourceMime: 'image/webp' },
];

export const IMAGE_TO_PDF_CONVERTERS: Converter[] = IMAGE_PDF_SOURCES.map((s) => ({
  from: s.sourceMime === 'image/png' ? 'png' : s.sourceMime === 'image/jpeg' ? 'jpg' : 'webp',
  to: 'pdf',
  label: `${s.sourceMime === 'image/png' ? 'PNG' : s.sourceMime === 'image/jpeg' ? 'JPEG' : 'WebP'} → PDF`,
  fn: (ctx) => imageToPdf(ctx, s.sourceMime),
}));

function imageToPdf(ctx: ConverterContext, sourceMime: string): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pageW / img.width, pageH / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      const x = (pageW - w) / 2;
      const y = (pageH - h) / 2;
      const data = ctx.data;
      const dataUrl =
        typeof data === 'string'
          ? `data:${sourceMime};base64,${btoa(unescape(encodeURIComponent(data)))}`
          : arrayBufferToDataUrl(data, sourceMime);
      pdf.addImage(dataUrl, sourceMime === 'image/png' ? 'PNG' : sourceMime === 'image/jpeg' ? 'JPEG' : 'WEBP', x, y, w, h);
      const ab = pdf.output('arraybuffer');
      resolve(new Uint8Array(ab));
    };
    img.onerror = () => reject(new Error(`Failed to load ${sourceMime}`));
    const d = ctx.data;
    img.src =
      typeof d === 'string'
        ? `data:${sourceMime};base64,${btoa(unescape(encodeURIComponent(d)))}`
        : arrayBufferToDataUrl(d, sourceMime);
  });
}

function arrayBufferToDataUrl(bytes: Uint8Array, mime: string): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

export const PDF_CONVERTERS: Converter[] = [
  pdfToTxt,
  pdfToHtml,
  pdfToPng,
  pdfToJpg,
  ...IMAGE_TO_PDF_CONVERTERS,
];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}