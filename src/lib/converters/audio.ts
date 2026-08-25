// Audio converters. Decoding uses the browser's Web Audio API (which natively
// handles WAV, MP3, OGG, FLAC, AAC in all evergreen browsers) — no extra
// decoder dependency. MP3 encoding uses lamejs.

import lamejs from 'lamejs';
import type { Converter, ConverterContext } from '../types';

let sharedCtx: AudioContext | null = null;
function audioCtx(): AudioContext {
  if (!sharedCtx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedCtx = new Ctor();
  }
  return sharedCtx;
}

async function decode(bytes: Uint8Array): Promise<AudioBuffer> {
  const buf = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  return await audioCtx().decodeAudioData(buf);
}

// ---------- WAV ↔ MP3 ----------

export const wavToMp3: Converter = {
  from: 'wav',
  to: 'mp3',
  label: 'WAV → MP3',
  fn: async ({ data }) => encodeMp3(await decode(asBytes(data))),
};

export const mp3ToWav: Converter = {
  from: 'mp3',
  to: 'wav',
  label: 'MP3 → WAV',
  fn: async ({ data }) => encodeWav(await decode(asBytes(data))),
};

function asBytes(data: string | Uint8Array): Uint8Array {
  return typeof data === 'string' ? new TextEncoder().encode(data) : data;
}

// ---------- MP3 encoder (lamejs) ----------

function encodeMp3(buffer: AudioBuffer, kbps = 128): Uint8Array {
  const channels = Math.min(buffer.numberOfChannels, 2);
  const sampleRate = buffer.sampleRate;
  const samples = buffer.length;

  const left = floatTo16(buffer.getChannelData(0));
  const right = channels > 1 ? floatTo16(buffer.getChannelData(1)) : left;

  const encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
  const block = 1152;
  const chunks: Uint8Array[] = [];

  for (let i = 0; i < samples; i += block) {
    const l = left.subarray(i, Math.min(i + block, samples));
    const r = right.subarray(i, Math.min(i + block, samples));
    const out = channels === 1 ? encoder.encodeBuffer(l) : encoder.encodeBuffer(l, r);
    if (out.length > 0) chunks.push(new Uint8Array(out));
  }
  const end = encoder.flush();
  if (end.length > 0) chunks.push(new Uint8Array(end));

  let total = 0;
  for (const c of chunks) total += c.length;
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }
  return merged;
}

function floatTo16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

// ---------- WAV encoder (manual 16-bit PCM) ----------

function encodeWav(buffer: AudioBuffer): Uint8Array {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const samples = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = samples * blockAlign;
  const out = new ArrayBuffer(44 + dataSize);
  const view = new DataView(out);

  writeStr(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(view, 8, 'WAVE');
  writeStr(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeStr(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c));
  for (let i = 0; i < samples; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(
        offset,
        sample < 0 ? sample * 0x8000 : sample * 0x7fff,
        true,
      );
      offset += 2;
    }
  }

  return new Uint8Array(out);
}

function writeStr(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

export const AUDIO_CONVERTERS: Converter[] = [wavToMp3, mp3ToWav];