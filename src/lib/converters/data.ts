// Data converters (JSON ↔ CSV ↔ YAML ↔ TOML ↔ XML). The graph finds shortest
// paths through "json" as the hub, so we only need direct converters to/from
// JSON and the rest compose automatically.

import Papa from 'papaparse';
import * as yaml from 'js-yaml';
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import type { Converter, ConverterContext } from '../types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: true,
  trimValues: true,
});

const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: true,
  indentBy: '  ',
  suppressEmptyNode: true,
});

function asText(data: string | Uint8Array): string {
  return typeof data === 'string' ? data : new TextDecoder('utf-8').decode(data);
}

// ---------- JSON <-> CSV ----------

export const jsonToCsv: Converter = {
  from: 'json',
  to: 'csv',
  label: 'JSON → CSV',
  fn: async ({ data }) => {
    const value = JSON.parse(asText(data));
    const rows = normalizeRows(value);
    return Papa.unparse(rows);
  },
};

export const csvToJson: Converter = {
  from: 'csv',
  to: 'json',
  label: 'CSV → JSON',
  fn: async ({ data }) => {
    const text = asText(data);
    const delim = text.includes('\t') && !text.includes(',') ? '\t' : ',';
    const result = Papa.parse(text, { header: true, skipEmptyLines: true, delimiter: delim });
    return JSON.stringify(result.data, null, 2);
  },
};

// ---------- JSON <-> YAML ----------

export const jsonToYaml: Converter = {
  from: 'json',
  to: 'yaml',
  label: 'JSON → YAML',
  fn: async ({ data }) => yaml.dump(JSON.parse(asText(data)), { lineWidth: 120 }),
};

export const yamlToJson: Converter = {
  from: 'yaml',
  to: 'json',
  label: 'YAML → JSON',
  fn: async ({ data }) => JSON.stringify(yaml.load(asText(data)), null, 2),
};

// ---------- JSON <-> TOML ----------

export const jsonToToml: Converter = {
  from: 'json',
  to: 'toml',
  label: 'JSON → TOML',
  fn: async ({ data }) => stringifyToml(JSON.parse(asText(data))),
};

export const tomlToJson: Converter = {
  from: 'toml',
  to: 'json',
  label: 'TOML → JSON',
  fn: async ({ data }) => JSON.stringify(parseToml(asText(data)), null, 2),
};

// ---------- JSON <-> XML ----------

export const jsonToXml: Converter = {
  from: 'json',
  to: 'xml',
  label: 'JSON → XML',
  fn: async ({ data }) => {
    const value = JSON.parse(asText(data));
    // fast-xml-parser expects an object with a single root key.
    const wrapped = ensureRoot(value);
    return xmlBuilder.build(wrapped);
  },
};

export const xmlToJson: Converter = {
  from: 'xml',
  to: 'json',
  label: 'XML → JSON',
  fn: async ({ data }) => {
    const parsed = xmlParser.parse(asText(data));
    // If the parsed object has a single top-level key, unwrap it for a cleaner
    // round-trip — but only when that key represents the obvious "root".
    const keys = Object.keys(parsed);
    const value = keys.length === 1 ? parsed[keys[0]] : parsed;
    return JSON.stringify(value, null, 2);
  },
};

export const DATA_CONVERTERS: Converter[] = [
  jsonToCsv,
  csvToJson,
  jsonToYaml,
  yamlToJson,
  jsonToToml,
  tomlToJson,
  jsonToXml,
  xmlToJson,
];

// ---------- helpers ----------

function normalizeRows(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    if (value.length === 0) return [];
    if (typeof value[0] === 'object' && value[0] !== null) {
      return value as Record<string, unknown>[];
    }
    // Array of primitives — wrap each in `{ value: ... }` so CSV has a header.
    return value.map((v) => ({ value: v }));
  }
  if (typeof value === 'object' && value !== null) {
    return [value as Record<string, unknown>];
  }
  return [{ value }];
}

function ensureRoot(value: unknown): Record<string, unknown> {
  if (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0
  ) {
    return { root: value };
  }
  return { root: { value } };
}