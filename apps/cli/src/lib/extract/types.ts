import type { ExtractedEdge, ExtractedNode } from '@graphchat/shared-types';

export type Lang =
  | 'python'
  | 'typescript'
  | 'tsx'
  | 'javascript'
  | 'go'
  | 'rust'
  | 'java'
  | 'c'
  | 'cpp'
  | 'ruby'
  | 'c_sharp';

export const EXT_TO_LANG: Record<string, Lang> = {
  '.py': 'python',
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.c': 'c',
  '.h': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.hpp': 'cpp',
  '.hh': 'cpp',
  '.rb': 'ruby',
  '.cs': 'c_sharp',
};

export interface ExtractResult {
  nodes: ExtractedNode[];
  edges: ExtractedEdge[];
  filesScanned: number;
  filesParsed: number;
  filesSkipped: number;
  bytesScanned: number;
}

export type { ExtractedEdge, ExtractedNode };
