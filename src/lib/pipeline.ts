// Run a ConversionPlan against a file: each step takes the previous step's
// output as input. We keep a single byte-or-string payload so a step can
// return whatever shape its target format needs.

import type {
  ConversionPlan,
  Converter,
  ConverterContext,
  DetectedFile,
  Format,
} from './types';

export interface ConversionResult {
  data: string | Uint8Array;
  /** Bytes if we have them, otherwise the UTF-8 length of the text. */
  size: number;
  steps: number;
  tookMs: number;
  stepsTaken: Array<{ from: string; to: string }>;
}

function bytesOf(data: string | Uint8Array): number {
  return typeof data === 'string'
    ? new TextEncoder().encode(data).length
    : data.byteLength;
}

export async function executePlan(
  plan: ConversionPlan,
  file: DetectedFile,
): Promise<ConversionResult> {
  const started = performance.now();
  let current: string | Uint8Array = file.data;
  const taken: Array<{ from: string; to: string }> = [];

  for (const step of plan.steps) {
    const ctx: ConverterContext = {
      data: current,
      filename: file.filename,
      sourceFormat: step.from,
      targetFormat: step.to,
    };
    current = await step.converter.fn(ctx);
    taken.push({ from: step.from.id, to: step.to.id });
  }

  return {
    data: current,
    size: bytesOf(current),
    steps: plan.steps.length,
    tookMs: performance.now() - started,
    stepsTaken: taken,
  };
}

/**
 * Convert a converter that returns a string into one that produces UTF-8 bytes.
 * Useful when downstream stages need bytes.
 */
export function asBytes(c: Converter): Converter {
  return {
    from: c.from,
    to: c.to,
    label: c.label,
    fn: async (ctx) => {
      const out = await c.fn(ctx);
      if (typeof out === 'string') {
        return new TextEncoder().encode(out);
      }
      return out;
    },
  };
}

/**
 * Pick a sensible output filename: same stem, target extension.
 * "report.md" + "pdf" → "report.pdf"
 */
export function outputName(sourceName: string, target: Format): string {
  const dot = sourceName.lastIndexOf('.');
  const stem = dot >= 0 ? sourceName.slice(0, dot) : sourceName;
  const ext = target.extensions[0];
  return `${stem}${ext}`;
}