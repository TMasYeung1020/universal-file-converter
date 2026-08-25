// Spreadsheet converters. XLSX is the new format; the existing JSON / CSV
// converters compose with these via the graph (e.g. JSON → XLSX is a single
// direct edge, YAML → XLSX is YAML → JSON → XLSX).

import * as XLSX from 'xlsx';
import { htmlToPdf } from './document';
import type { Converter } from '../types';

function asText(data: string | Uint8Array): string {
  return typeof data === 'string' ? data : new TextDecoder('utf-8').decode(data);
}

function readWorkbook(bytes: Uint8Array): XLSX.WorkBook {
  return XLSX.read(bytes, { type: 'array' });
}

function firstSheet(wb: XLSX.WorkBook): string {
  return wb.SheetNames[0];
}

function workbookToJson(wb: XLSX.WorkBook): unknown[] {
  const sheet = wb.Sheets[firstSheet(wb)];
  return XLSX.utils.sheet_to_json<object>(sheet, { defval: null });
}

// ---------- XLSX → text-ish ----------

export const xlsxToCsv: Converter = {
  from: 'xlsx',
  to: 'csv',
  label: 'Excel → CSV',
  fn: async ({ data }) => {
    if (typeof data === 'string') throw new Error('XLSX input must be bytes');
    const wb = readWorkbook(data);
    const sheet = wb.Sheets[firstSheet(wb)];
    return XLSX.utils.sheet_to_csv(sheet);
  },
};

export const xlsxToJson: Converter = {
  from: 'xlsx',
  to: 'json',
  label: 'Excel → JSON',
  fn: async ({ data }) => {
    if (typeof data === 'string') throw new Error('XLSX input must be bytes');
    const wb = readWorkbook(data);
    return JSON.stringify(workbookToJson(wb), null, 2);
  },
};

export const xlsxToHtml: Converter = {
  from: 'xlsx',
  to: 'html',
  label: 'Excel → HTML',
  fn: async ({ data }) => {
    if (typeof data === 'string') throw new Error('XLSX input must be bytes');
    const wb = readWorkbook(data);
    const sheet = wb.Sheets[firstSheet(wb)];
    const inner = XLSX.utils.sheet_to_html(sheet);
    return wrapHtml(inner, 'Converted from Excel');
  },
};

// ---------- XLSX → PDF (via HTML → PDF, but direct edge here so path is 1 step) ----------

export const xlsxToPdf: Converter = {
  from: 'xlsx',
  to: 'pdf',
  label: 'Excel → PDF',
  fn: async ({ data }) => {
    if (typeof data === 'string') throw new Error('XLSX input must be bytes');
    const wb = readWorkbook(data);
    const sheet = wb.Sheets[firstSheet(wb)];
    const inner = XLSX.utils.sheet_to_html(sheet);
    return htmlToPdf.fn({
      data: wrapHtml(inner, 'Converted from Excel'),
      filename: '',
      sourceFormat: { id: 'xlsx', category: 'spreadsheet', mimeTypes: [], extensions: [], label: 'XLSX' },
      targetFormat: { id: 'pdf', category: 'document', mimeTypes: [], extensions: [], label: 'PDF' },
    });
  },
};

// ---------- JSON / CSV → XLSX ----------

export const jsonToXlsx: Converter = {
  from: 'json',
  to: 'xlsx',
  label: 'JSON → Excel',
  fn: async ({ data }) => {
    const value = JSON.parse(asText(data));
    const rows: Record<string, unknown>[] = Array.isArray(value)
      ? (value as Record<string, unknown>[])
      : typeof value === 'object' && value !== null
        ? [value as Record<string, unknown>]
        : [{ value }];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    return new Uint8Array(out);
  },
};

export const csvToXlsx: Converter = {
  from: 'csv',
  to: 'xlsx',
  label: 'CSV → Excel',
  fn: async ({ data }) => {
    const text = asText(data);
    const wb = XLSX.read(text, { type: 'string' });
    const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    return new Uint8Array(out);
  },
};

export const SPREADSHEET_CONVERTERS: Converter[] = [
  xlsxToCsv,
  xlsxToJson,
  xlsxToHtml,
  xlsxToPdf,
  jsonToXlsx,
  csvToXlsx,
];

function wrapHtml(body: string, title: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(
    title,
  )}</title><style>table{border-collapse:collapse}td,th{border:1px solid #cbd5e1;padding:4px 8px}</style></head><body>${body}</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}