// PowerPoint (.pptx) converters. PPTX is a ZIP of XML — we unzip with JSZip,
// pull text out of each slide, and render as HTML. Layout/styling is not
// preserved; this is a pragmatic "extract text and reshape" conversion.

import JSZip from 'jszip';
import { htmlToPdf } from './document';
import type { Converter } from '../types';

async function loadSlides(bytes: Uint8Array): Promise<string[]> {
  const zip = await JSZip.loadAsync(bytes);
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)/i)![1]);
      const nb = Number(b.match(/slide(\d+)/i)![1]);
      return na - nb;
    });

  const slides: string[] = [];
  for (const name of slideFiles) {
    const xml = await zip.files[name].async('string');
    slides.push(extractSlideText(xml));
  }
  return slides;
}

function extractSlideText(xml: string): string {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  // Walk all <a:t> elements (the actual text runs inside a slide).
  const texts = Array.from(doc.getElementsByTagNameNS('*', 't')).map((el) =>
    el.textContent ?? '',
  );
  // Group by paragraph (<a:p>) for newlines — simplest heuristic: paragraphs
  // separated by empty strings in the flat list are rare; insert blank lines
  // between distinct text runs to keep the result readable.
  return texts.map((t) => t.trim()).filter(Boolean).join('\n');
}

function wrapSlidesHtml(slides: string[]): string {
  const sections = slides
    .map(
      (text, i) =>
        `<section class="slide"><h2>Slide ${i + 1}</h2><pre>${escapeHtml(text || '(empty)')}</pre></section>`,
    )
    .join('\n');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Converted from PowerPoint</title><style>.slide{break-after:page;padding:24px;border-bottom:1px solid #e2e8f0}.slide pre{white-space:pre-wrap;font-family:inherit}</style></head><body>${sections}</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ---------- PPTX → text / html / pdf ----------

export const pptxToTxt: Converter = {
  from: 'pptx',
  to: 'txt',
  label: 'PowerPoint → Plain Text',
  fn: async ({ data }) => {
    if (typeof data === 'string') throw new Error('PPTX input must be bytes');
    const slides = await loadSlides(data);
    return slides.map((s, i) => `=== Slide ${i + 1} ===\n${s}`).join('\n\n');
  },
};

export const pptxToHtml: Converter = {
  from: 'pptx',
  to: 'html',
  label: 'PowerPoint → HTML',
  fn: async ({ data }) => {
    if (typeof data === 'string') throw new Error('PPTX input must be bytes');
    const slides = await loadSlides(data);
    return wrapSlidesHtml(slides);
  },
};

export const pptxToPdf: Converter = {
  from: 'pptx',
  to: 'pdf',
  label: 'PowerPoint → PDF',
  fn: async ({ data }) => {
    if (typeof data === 'string') throw new Error('PPTX input must be bytes');
    const slides = await loadSlides(data);
    const html = wrapSlidesHtml(slides);
    return htmlToPdf.fn({
      data: html,
      filename: '',
      sourceFormat: { id: 'pptx', category: 'presentation', mimeTypes: [], extensions: [], label: 'PPTX' },
      targetFormat: { id: 'pdf', category: 'document', mimeTypes: [], extensions: [], label: 'PDF' },
    });
  },
};

export const PRESENTATION_CONVERTERS: Converter[] = [pptxToTxt, pptxToHtml, pptxToPdf];