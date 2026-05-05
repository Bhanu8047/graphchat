import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Lang } from './types.js';

// web-tree-sitter@0.20.x is CJS-only and exports the Parser class as default.
// `Language` is a nested type accessed via `Parser.Language`.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const Parser: any = require('web-tree-sitter');

/**
 * web-tree-sitter ships its runtime WASM next to its JS in node_modules
 * (`tree-sitter.wasm` in 0.20.x). We point Parser.init's locateFile at
 * the bundled copy in dist/wasm/ for the published CLI, falling back to
 * node_modules during development.
 */
function resolveRuntimeWasm(): string {
  const bundled = join(__dirname, '..', '..', 'wasm', 'tree-sitter.wasm');
  if (existsSync(bundled)) return bundled;
  try {
    const pkg = require.resolve('web-tree-sitter/package.json');
    const wasm = join(dirname(pkg), 'tree-sitter.wasm');
    if (existsSync(wasm)) return wasm;
  } catch {
    // fallthrough
  }
  throw new Error('web-tree-sitter runtime WASM (tree-sitter.wasm) not found');
}

/**
 * Grammar WASMs are copied into `dist/wasm/` at build time. At runtime we
 * resolve them relative to this module's directory so the path works whether
 * installed globally, linked, or run from `dist/`.
 */
function resolveGrammarWasm(lang: Lang): string {
  const candidates = [
    join(__dirname, '..', '..', 'wasm', `tree-sitter-${lang}.wasm`),
    (() => {
      try {
        const pkg = require.resolve('tree-sitter-wasms/package.json');
        return join(dirname(pkg), 'out', `tree-sitter-${lang}.wasm`);
      } catch {
        return '';
      }
    })(),
  ].filter(Boolean);

  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  throw new Error(
    `Grammar WASM for ${lang} not found. Tried:\n  ${candidates.join('\n  ')}`,
  );
}

let initPromise: Promise<void> | null = null;

async function ensureInit(): Promise<void> {
  if (!initPromise) {
    initPromise = Parser.init({
      locateFile: () => resolveRuntimeWasm(),
    }) as Promise<void>;
  }
  return initPromise;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const langCache = new Map<Lang, any>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getLanguage(lang: Lang): Promise<any> {
  await ensureInit();
  let L = langCache.get(lang);
  if (!L) {
    L = await Parser.Language.load(resolveGrammarWasm(lang));
    langCache.set(lang, L);
  }
  return L;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getParser(lang: Lang): Promise<any> {
  const L = await getLanguage(lang);
  const p = new Parser();
  p.setLanguage(L);
  return p;
}
