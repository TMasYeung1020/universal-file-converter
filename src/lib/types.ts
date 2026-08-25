// Core type definitions for the universal file converter.
// Each "Format" is a node in the conversion graph; each "Converter" is an edge.

export type FormatCategory = 'document' | 'image' | 'data' | 'audio' | 'spreadsheet' | 'presentation';

export interface Format {
  /** Unique id used in the converter graph (e.g. "markdown", "pdf", "png"). */
  id: string;
  category: FormatCategory;
  /** Common MIME types for this format. */
  mimeTypes: string[];
  /** File extensions including the dot (lowercase). */
  extensions: string[];
  /** Display label shown in the UI. */
  label: string;
  /** Short tagline for the UI. */
  description?: string;
}

/**
 * A converter consumes data in `from` format and produces data in `to` format.
 * It can be pure (text ↔ text) or involve bytes (image, PDF).
 */
export interface ConverterContext {
  /** Either UTF-8 text or raw bytes — converter knows which it needs. */
  data: string | Uint8Array;
  filename: string;
  sourceFormat: Format;
  targetFormat: Format;
}

export interface Converter {
  from: string;
  to: string;
  /** Human-readable description of the conversion. */
  label: string;
  fn: (ctx: ConverterContext) => Promise<string | Uint8Array>;
}

export interface DetectedFile {
  format: Format;
  filename: string;
  /** Original file name with extension. */
  originalName: string;
  size: number;
  data: Uint8Array;
  /** Whether we are guessing from extension only (vs. magic-byte matched). */
  guessed: boolean;
}

export interface ConversionStep {
  from: Format;
  to: Format;
  converter: Converter;
}

export interface ConversionPlan {
  steps: ConversionStep[];
  /** True when no conversion is needed (source already in target format). */
  identity: boolean;
}