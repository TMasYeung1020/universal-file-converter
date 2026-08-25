// Document converters. All of these operate on UTF-8 text in/out — they are
// pure (no file I/O), so we can chain them through the pipeline freely.

import { marked } from 'marked';
import TurndownService from 'turndown';
import { jsPDF } from 'jspdf';
import * as mammoth from 'mammoth/mammoth.browser';
import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
} from 'docx';
import type { Converter, ConverterContext } from '../types';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

// ---------- Markdown ↔ HTML ----------

export const mdToHtml: Converter = {
  from: 'markdown',
  to: 'html',
  label: 'Markdown → HTML',
  fn: async ({ data }) => {
    const text = asText(data);
    const html = await marked.parse(text);
    return wrapHtmlDocument(html, 'Converted from Markdown');
  },
};

export const htmlToMd: Converter = {
  from: 'html',
  to: 'markdown',
  label: 'HTML → Markdown',
  fn: async ({ data }) => {
    const html = unwrapHtmlDocument(asText(data));
    return turndown.turndown(html);
  },
};

// ---------- DOCX ↔ HTML ----------

export const docxToHtml: Converter = {
  from: 'docx',
  to: 'html',
  label: 'DOCX → HTML',
  fn: async ({ data }) => {
    if (typeof data === 'string') {
      throw new Error('DOCX input must be bytes, got a string');
    }
    // mammoth expects an ArrayBuffer; pass the underlying buffer slice.
    const buf = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength,
    ) as ArrayBuffer;
    const result = await mammoth.convertToHtml({ arrayBuffer: buf });
    return wrapHtmlDocument(result.value, 'Converted from DOCX');
  },
};

export const htmlToDocx: Converter = {
  from: 'html',
  to: 'docx',
  label: 'HTML → DOCX',
  fn: async ({ data }) => {
    const html = unwrapHtmlDocument(asText(data));
    const paragraphs = htmlToParagraphs(html);
    const doc = new DocxDocument({
      sections: [{ children: paragraphs }],
    });
    const blob = await Packer.toBlob(doc);
    return new Uint8Array(await blob.arrayBuffer());
  },
};

// ---------- HTML ↔ PDF ----------

export const htmlToPdf: Converter = {
  from: 'html',
  to: 'pdf',
  label: 'HTML → PDF',
  fn: async ({ data }) => {
    const html = asText(data);
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    // jsPDF.html uses html2canvas under the hood — slow but faithful.
    await pdf.html(html, {
      autoPaging: 'text',
      margin: { top: 40, right: 40, bottom: 40, left: 40 },
      width: 515,
      windowWidth: 800,
    });
    const ab = pdf.output('arraybuffer');
    return new Uint8Array(ab);
  },
};

// ---------- HTML ↔ TXT ----------

export const htmlToTxt: Converter = {
  from: 'html',
  to: 'txt',
  label: 'HTML → Plain Text',
  fn: async ({ data }) => {
    const html = unwrapHtmlDocument(asText(data));
    return htmlToPlainText(html);
  },
};

export const txtToHtml: Converter = {
  from: 'txt',
  to: 'html',
  label: 'Plain Text → HTML',
  fn: async ({ data }) => {
    const text = asText(data);
    const escaped = escapeHtml(text);
    return wrapHtmlDocument(`<pre>${escaped}</pre>`, 'Converted from Text');
  },
};

export const DOCUMENT_CONVERTERS: Converter[] = [
  mdToHtml,
  htmlToMd,
  docxToHtml,
  htmlToDocx,
  htmlToPdf,
  htmlToTxt,
  txtToHtml,
];

// ---------- helpers ----------

function asText(data: string | Uint8Array): string {
  return typeof data === 'string' ? data : new TextDecoder('utf-8').decode(data);
}

function wrapHtmlDocument(body: string, title: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(
    title,
  )}</title></head><body>${body}</body></html>`;
}

function unwrapHtmlDocument(html: string): string {
  // Extract the <body>...</body> region if present; otherwise return as-is.
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (m) return m[1];
  return html;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function htmlToPlainText(html: string): string {
  // Replace block-level closing tags with newlines, strip the rest.
  return html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/(p|div|h[1-6]|li|tr|pre)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function htmlToParagraphs(html: string): Paragraph[] {
  // Very small HTML → docx shim: walk top-level children and split on <h1>-<h3>/<p>/<br>.
  const cleaned = html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|h[1-6]|li|tr)\s*>/gi, '\n');

  const parts: Paragraph[] = [];
  const headingRe = /<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(cleaned)) !== null) {
    if (m.index > lastIndex) {
      const chunk = cleaned.slice(lastIndex, m.index).replace(/<[^>]+>/g, '').trim();
      if (chunk) parts.push(p(chunk));
    }
    const level = Number(m[1]);
    const text = m[2].replace(/<[^>]+>/g, '').trim();
    if (text) parts.push(p(text, levelToHeading(level)));
    lastIndex = m.index + m[0].length;
  }
  const tail = cleaned.slice(lastIndex).replace(/<[^>]+>/g, '').trim();
  if (tail) parts.push(p(tail));
  return parts.length ? parts : [p('')];
}

function levelToHeading(level: number) {
  switch (level) {
    case 1:
      return HeadingLevel.HEADING_1;
    case 2:
      return HeadingLevel.HEADING_2;
    default:
      return HeadingLevel.HEADING_3;
  }
}

function p(text: string, heading?: HeadingLevel): Paragraph {
  return new Paragraph({
    heading,
    children: [new TextRun(text)],
  });
}