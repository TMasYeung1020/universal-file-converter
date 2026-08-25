// Detect a file's format from either its name (extension) or its first bytes
// (magic numbers). Magic-byte sniffing is mainly useful for images and PDFs —
// text formats usually only have an extension to go on.

import { findByExtension, getFormat } from './formats';
import type { DetectedFile, Format } from './types';

interface MagicMatcher {
  formatId: string;
  /** Bytes that must appear at the start of the file (or at the given offset). */
  bytes: number[];
  /** Offset in bytes from the start. */
  offset?: number;
}

const MAGIC: MagicMatcher[] = [
  { formatId: 'png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { formatId: 'jpg', bytes: [0xff, 0xd8, 0xff] },
  { formatId: 'gif', bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF8
  { formatId: 'webp', bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 }, // WEBP at offset 8 (after "RIFF" + size)
  { formatId: 'pdf', bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
];

function matchMagic(bytes: Uint8Array): Format | undefined {
  for (const m of MAGIC) {
    const offset = m.offset ?? 0;
    if (bytes.length < offset + m.bytes.length) continue;
    let ok = true;
    for (let i = 0; i < m.bytes.length; i++) {
      if (bytes[offset + i] !== m.bytes[i]) {
        ok = false;
        break;
      }
    }
    if (ok) return getFormat(m.formatId);
  }
  return undefined;
}

function sniffSvg(bytes: Uint8Array): boolean {
  // Look for "<svg" or "<?xml" + "<svg" in the first ~256 bytes (after UTF-8 BOM).
  let start = 0;
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) start = 3;
  const slice = new TextDecoder('utf-8', { fatal: false }).decode(
    bytes.subarray(start, Math.min(bytes.length, start + 512)),
  );
  return /<\s*svg[\s>]/i.test(slice);
}

/** Try to guess a format. Returns null if we have no idea. */
export function detectFormat(
  filename: string,
  bytes: Uint8Array,
): { format: Format; guessed: boolean } | null {
  const byExt = findByExtension(filename);

  const byMagic = matchMagic(bytes);

  // SVG is special: extension OR XML sniff.
  if (byExt?.id === 'svg' || (sniffSvg(bytes) && !byMagic)) {
    const svg = getFormat('svg')!;
    return { format: svg, guessed: byExt?.id !== 'svg' };
  }

  // When magic and extension disagree, trust the magic (the user may have
  // mis-named the file).
  if (byMagic && byExt && byMagic.id !== byExt.id) {
    return { format: byMagic, guessed: false };
  }
  if (byMagic) return { format: byMagic, guessed: false };
  if (byExt) return { format: byExt, guessed: false };

  return null;
}

export async function readFileAsBytes(file: File): Promise<Uint8Array> {
  const buf = await file.arrayBuffer();
  return new Uint8Array(buf);
}

export async function ingestFile(file: File): Promise<DetectedFile | null> {
  const bytes = await readFileAsBytes(file);
  const detected = detectFormat(file.name, bytes);
  if (!detected) return null;
  return {
    format: detected.format,
    filename: file.name,
    originalName: file.name,
    size: file.size,
    data: bytes,
    guessed: detected.guessed,
  };
}