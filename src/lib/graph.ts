// BFS shortest-path over the converter graph. Each format is a node;
// each registered converter is a directed edge. The algorithm picks the
// fewest-step path between `source` and `target` — this lets us add formats
// later without rewriting existing converters.

import { getFormat } from './formats';
import type { ConversionPlan, ConversionStep, Converter } from './types';

export interface Graph {
  /** Format id → outgoing edges (converters). */
  edges: Map<string, Converter[]>;
}

export function buildGraph(converters: Converter[]): Graph {
  const edges = new Map<string, Converter[]>();
  for (const c of converters) {
    const list = edges.get(c.from);
    if (list) list.push(c);
    else edges.set(c.from, [c]);
  }
  return { edges };
}

/**
 * Plan a conversion using BFS over the registered converters.
 * Returns null when no path exists.
 */
export function planConversion(
  graph: Graph,
  sourceId: string,
  targetId: string,
): ConversionPlan | null {
  if (sourceId === targetId) {
    const f = getFormat(sourceId);
    if (!f) return null;
    return { steps: [], identity: true };
  }

  // BFS — record predecessor so we can reconstruct the path.
  const prev = new Map<string, { via: Converter; from: string }>();
  const visited = new Set<string>([sourceId]);
  const queue: string[] = [sourceId];

  while (queue.length) {
    const current = queue.shift()!;
    const edges = graph.edges.get(current) ?? [];
    for (const c of edges) {
      if (visited.has(c.to)) continue;
      visited.add(c.to);
      prev.set(c.to, { via: c, from: current });
      if (c.to === targetId) {
        // Reconstruct.
        const steps: ConversionStep[] = [];
        let cursor: string | undefined = targetId;
        while (cursor && cursor !== sourceId) {
          const p = prev.get(cursor)!;
          const to = getFormat(cursor);
          const from = getFormat(p.from);
          if (!to || !from) return null;
          steps.unshift({ from, to, converter: p.via });
          cursor = p.from;
        }
        return { steps, identity: false };
      }
      queue.push(c.to);
    }
  }

  return null;
}

/**
 * Return all formats reachable from `sourceId` in one hop.
 * Used by the UI to populate the target-format picker.
 */
export function directTargets(graph: Graph, sourceId: string): string[] {
  return (graph.edges.get(sourceId) ?? []).map((c) => c.to);
}