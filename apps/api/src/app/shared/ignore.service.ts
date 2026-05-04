import { Injectable } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import ignore from 'ignore';

/**
 * Builds an ignore filter for a repo path.
 * Reads `.trchatignore` from the repo root and adds it on top of a built-in
 * default set. Returns a predicate `(relativePath) => true` when the path
 * should be ignored.
 */
@Injectable()
export class IgnoreService {
  buildFilter(repoPath: string): (relativePath: string) => boolean {
    const ig = ignore();

    // Always ignore these
    ig.add([
      'node_modules/**',
      'dist/**',
      'build/**',
      '.next/**',
      'coverage/**',
      '*.generated.*',
      '*.min.js',
      '*.min.css',
      '.git/**',
      '.nx/**',
      '*.lock',
      'package-lock.json',
      'yarn.lock',
    ]);

    const ignorePath = join(repoPath, '.trchatignore');
    if (existsSync(ignorePath)) {
      const raw = readFileSync(ignorePath, 'utf8');
      const lines = raw
        .split('\n')
        .map((l) => l.replace(/#.*$/, '').trim())
        .filter((l) => l.length > 0);
      ig.add(lines);
    }

    return (relativePath: string) => ig.ignores(relativePath);
  }
}
