// All formats we currently support. Adding a new format = add a node here
// and (optionally) write the converter edges that touch it.

import type { Format } from './types';

export const FORMATS: Format[] = [
  // ---------- Documents ----------
  {
    id: 'markdown',
    category: 'document',
    mimeTypes: ['text/markdown', 'text/x-markdown'],
    extensions: ['.md', '.markdown', '.mdown', '.mkd'],
    label: 'Markdown',
    description: '.md — plain text with formatting',
  },
  {
    id: 'html',
    category: 'document',
    mimeTypes: ['text/html'],
    extensions: ['.html', '.htm'],
    label: 'HTML',
    description: 'Web page source',
  },
  {
    id: 'txt',
    category: 'document',
    mimeTypes: ['text/plain'],
    extensions: ['.txt', '.text'],
    label: 'Plain Text',
    description: 'Unformatted text',
  },
  {
    id: 'pdf',
    category: 'document',
    mimeTypes: ['application/pdf'],
    extensions: ['.pdf'],
    label: 'PDF',
    description: 'Portable Document Format',
  },
  {
    id: 'docx',
    category: 'document',
    mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    extensions: ['.docx'],
    label: 'Word (DOCX)',
    description: 'Microsoft Word document',
  },

  // ---------- Images ----------
  {
    id: 'png',
    category: 'image',
    mimeTypes: ['image/png'],
    extensions: ['.png'],
    label: 'PNG',
    description: 'Lossless image with transparency',
  },
  {
    id: 'jpg',
    category: 'image',
    mimeTypes: ['image/jpeg'],
    extensions: ['.jpg', '.jpeg'],
    label: 'JPEG',
    description: 'Small photo-friendly image',
  },
  {
    id: 'webp',
    category: 'image',
    mimeTypes: ['image/webp'],
    extensions: ['.webp'],
    label: 'WebP',
    description: 'Modern web image format',
  },
  {
    id: 'svg',
    category: 'image',
    mimeTypes: ['image/svg+xml'],
    extensions: ['.svg'],
    label: 'SVG',
    description: 'Vector image (XML)',
  },

  // ---------- Data ----------
  {
    id: 'json',
    category: 'data',
    mimeTypes: ['application/json'],
    extensions: ['.json'],
    label: 'JSON',
    description: 'JavaScript Object Notation',
  },
  {
    id: 'csv',
    category: 'data',
    mimeTypes: ['text/csv'],
    extensions: ['.csv', '.tsv'],
    label: 'CSV',
    description: 'Comma-separated values',
  },
  {
    id: 'yaml',
    category: 'data',
    mimeTypes: ['application/x-yaml', 'text/yaml'],
    extensions: ['.yaml', '.yml'],
    label: 'YAML',
    description: 'YAML Ain’t Markup Language',
  },
  {
    id: 'toml',
    category: 'data',
    mimeTypes: ['application/toml'],
    extensions: ['.toml'],
    label: 'TOML',
    description: 'Tom’s Obvious Minimal Language',
  },
  {
    id: 'xml',
    category: 'data',
    mimeTypes: ['application/xml', 'text/xml'],
    extensions: ['.xml'],
    label: 'XML',
    description: 'Extensible Markup Language',
  },
];

const byId = new Map<string, Format>();
const byExt = new Map<string, Format>();
const byMime = new Map<string, Format>();

for (const f of FORMATS) {
  byId.set(f.id, f);
  for (const ext of f.extensions) byExt.set(ext.toLowerCase(), f);
  for (const m of f.mimeTypes) byMime.set(m.toLowerCase(), f);
}

export function getFormat(id: string): Format | undefined {
  return byId.get(id);
}

export function findByExtension(filename: string): Format | undefined {
  const idx = filename.lastIndexOf('.');
  if (idx < 0) return undefined;
  return byExt.get(filename.slice(idx).toLowerCase());
}

export function findByMime(mime: string): Format | undefined {
  return byMime.get(mime.toLowerCase());
}

export function formatsByCategory(cat: Format['category']): Format[] {
  return FORMATS.filter((f) => f.category === cat);
}