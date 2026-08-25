// Single registry of all converters + the graph built from them.
// Importing `CONVERTERS` and `GRAPH` is the only thing the UI needs to know.

import { DOCUMENT_CONVERTERS } from './document';
import { IMAGE_CONVERTERS } from './image';
import { DATA_CONVERTERS } from './data';
import { PDF_CONVERTERS } from './pdf';
import { SPREADSHEET_CONVERTERS } from './spreadsheet';
import { PRESENTATION_CONVERTERS } from './presentation';
import { AUDIO_CONVERTERS } from './audio';
import { buildGraph } from '../graph';
import type { Graph } from '../graph';
import type { Converter } from '../types';

export const CONVERTERS: Converter[] = [
  ...DOCUMENT_CONVERTERS,
  ...IMAGE_CONVERTERS,
  ...DATA_CONVERTERS,
  ...PDF_CONVERTERS,
  ...SPREADSHEET_CONVERTERS,
  ...PRESENTATION_CONVERTERS,
  ...AUDIO_CONVERTERS,
];

export const GRAPH: Graph = buildGraph(CONVERTERS);

export {
  DOCUMENT_CONVERTERS,
  IMAGE_CONVERTERS,
  DATA_CONVERTERS,
  PDF_CONVERTERS,
  SPREADSHEET_CONVERTERS,
  PRESENTATION_CONVERTERS,
  AUDIO_CONVERTERS,
};