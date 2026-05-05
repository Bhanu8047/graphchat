import { randomUUID } from 'node:crypto';
import type { ExtractedEdge, ExtractedNode } from './types.js';

/**
 * Mirrors the node/edge factories in graph-service/core/ast_extractor.py.
 * Keep these shapes byte-compatible — the server's graph_builder resolves
 * `targetLabel` → `targetId` based on these exact field names.
 */

export function nowIso(): string {
  return new Date().toISOString();
}

export function makeNode(
  repoId: string,
  label: string,
  type: string,
  content: string,
  sourceFile: string,
  sourceLine: number,
  tags: string[],
): ExtractedNode {
  return {
    id: randomUUID(),
    repoId,
    type,
    label,
    content,
    tags,
    confidence: 'EXTRACTED',
    sourceFile,
    sourceLine,
    updatedAt: nowIso(),
  };
}

export function makeEdge(
  repoId: string,
  sourceId: string,
  targetLabel: string,
  type: string,
): ExtractedEdge {
  return {
    id: randomUUID(),
    repoId,
    sourceId,
    targetLabel,
    type,
    confidence: 'EXTRACTED',
    weight: 1.0,
    createdAt: nowIso(),
  };
}

export const RATIONALE_PREFIXES = [
  '# NOTE:',
  '# WHY:',
  '# HACK:',
  '# IMPORTANT:',
  '# TODO:',
  '# FIXME:',
];
