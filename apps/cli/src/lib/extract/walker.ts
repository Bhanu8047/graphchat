import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';
import ignore from 'ignore';
import { extractFromTree } from './extractors.js';
import { getParser } from './parser.js';
import { EXT_TO_LANG, type ExtractResult, type Lang } from './types.js';

/** Mirrors DEFAULT_IGNORE in ast_extractor.py — pruned at directory level. */
const DEFAULT_IGNORE_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.next',
  'coverage',
  '.git',
  '.nx',
  '__pycache__',
  '.pytest_cache',
  'vendor',
]);

/** Skip parsing files larger than this — almost certainly generated/minified. */
const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB

export interface ExtractRepoOptions {
  repoPath: string;
  repoId: string;
  /** Per-file progress callback (path is relative to repoPath). */
  onFile?: (relPath: string, lang: Lang) => void;
}

/**
 * Walk `repoPath`, parse every supported file with Tree-sitter, and return
 * the combined nodes/edges. Honors `.gitignore` and `.trchatignore`, plus
 * the hardcoded DEFAULT_IGNORE_DIRS.
 */
export async function extractRepo(
  opts: ExtractRepoOptions,
): Promise<ExtractResult> {
  const { repoPath, repoId, onFile } = opts;

  const ig = ignore();
  for (const name of ['.gitignore', '.trchatignore']) {
    try {
      const content = await readFile(join(repoPath, name), 'utf8');
      ig.add(content);
    } catch {
      // ignore — file may not exist
    }
  }

  const result: ExtractResult = {
    nodes: [],
    edges: [],
    filesScanned: 0,
    filesParsed: 0,
    filesSkipped: 0,
    bytesScanned: 0,
  };

  const parserCache = new Map<Lang, Awaited<ReturnType<typeof getParser>>>();
  const parserFor = async (lang: Lang) => {
    let p = parserCache.get(lang);
    if (!p) {
      p = await getParser(lang);
      parserCache.set(lang, p);
    }
    return p;
  };

  const walk = async (dir: string): Promise<void> => {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const abs = join(dir, entry.name);
      const rel = relative(repoPath, abs);
      // ignore() expects POSIX-style paths; on Windows convert backslashes.
      const relPosix = sep === '/' ? rel : rel.split(sep).join('/');

      if (entry.isDirectory()) {
        if (DEFAULT_IGNORE_DIRS.has(entry.name)) continue;
        if (rel && ig.ignores(`${relPosix}/`)) continue;
        await walk(abs);
        continue;
      }
      if (!entry.isFile()) continue;
      if (rel && ig.ignores(relPosix)) continue;

      result.filesScanned += 1;
      const ext = extname(entry.name).toLowerCase();
      const lang = EXT_TO_LANG[ext];
      if (!lang) continue;

      let size = 0;
      try {
        const st = await stat(abs);
        size = st.size;
      } catch {
        result.filesSkipped += 1;
        continue;
      }
      if (size > MAX_FILE_BYTES) {
        result.filesSkipped += 1;
        continue;
      }
      result.bytesScanned += size;

      let source: string;
      try {
        source = await readFile(abs, 'utf8');
      } catch {
        result.filesSkipped += 1;
        continue;
      }

      try {
        const parser = await parserFor(lang);
        const tree = parser.parse(source);
        if (!tree) {
          result.filesSkipped += 1;
          continue;
        }
        const { nodes, edges } = extractFromTree(
          lang,
          tree.rootNode,
          source,
          relPosix,
          repoId,
        );
        result.nodes.push(...nodes);
        result.edges.push(...edges);
        tree.delete();
        result.filesParsed += 1;
        onFile?.(relPosix, lang);
      } catch (e) {
        // Bad file — never crash the whole index over one bad parse.
        result.filesSkipped += 1;
        if (process.env.GPH_DEBUG_EXTRACT) {
          const err = e as Error;
          process.stderr.write(
            `[extract] ${relPosix}: ${err.message || '<no msg>'}\n${err.stack ?? ''}\n`,
          );
        }
      }
    }
  };

  await walk(repoPath);
  return result;
}
