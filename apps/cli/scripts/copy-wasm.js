#!/usr/bin/env node
/**
 * Copy the grammar WASMs the CLI needs into dist/wasm/, plus the
 * web-tree-sitter runtime WASM. The published package ships these so
 * runtime resolution (parser.ts) does not depend on tree-sitter-wasms
 * being installed alongside.
 */
const { copyFileSync, mkdirSync, existsSync } = require('node:fs');
const { dirname, join } = require('node:path');

const LANGS = [
  'python',
  'typescript',
  'tsx',
  'javascript',
  'go',
  'rust',
  'java',
  'c',
  'cpp',
  'ruby',
  'c_sharp',
];

const wasmDir = join(__dirname, '..', 'dist', 'wasm');
mkdirSync(wasmDir, { recursive: true });

/**
 * Walk up from this script to find the workspace root, then locate the
 * hoisted node_modules. Avoids relying on `exports` fields that don't
 * expose package.json (web-tree-sitter is one such case).
 */
function findNodeModulesPkg(pkgName) {
  let dir = __dirname;
  while (true) {
    const candidate = join(dir, 'node_modules', pkgName);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(
        `[copy-wasm] could not find node_modules/${pkgName} above ${__dirname}`,
      );
    }
    dir = parent;
  }
}

const grammarsRoot = findNodeModulesPkg('tree-sitter-wasms');
for (const lang of LANGS) {
  const src = join(grammarsRoot, 'out', `tree-sitter-${lang}.wasm`);
  const dest = join(wasmDir, `tree-sitter-${lang}.wasm`);
  if (!existsSync(src)) {
    console.error(`[copy-wasm] missing grammar: ${src}`);
    process.exit(1);
  }
  copyFileSync(src, dest);
}

// Runtime WASM — web-tree-sitter@0.20.x ships it as `tree-sitter.wasm`.
const runtimeSrc = join(
  findNodeModulesPkg('web-tree-sitter'),
  'tree-sitter.wasm',
);
copyFileSync(runtimeSrc, join(wasmDir, 'tree-sitter.wasm'));

console.log(
  `[copy-wasm] copied ${LANGS.length} grammar WASMs + runtime to ${wasmDir}`,
);
