import chalk from 'chalk';
import { Command } from 'commander';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import ora from 'ora';
import { createClient } from '../lib/api-client.js';
import { extractRepo } from '../lib/extract/index.js';
import { printError, printSuccess } from '../lib/output.js';

interface IngestResult {
  nodesAdded?: number;
  edgesAdded?: number;
  communities?: number;
  durationMs?: number;
}

const HOOK_MARKER = '# >>> trchat-gph hook >>>';
const HOOK_MARKER_END = '# <<< trchat-gph hook <<<';
const HOOK_NAMES = ['post-commit', 'post-checkout', 'post-merge'] as const;

export function watchCommand(): Command {
  return new Command('watch')
    .description(
      'Watch a repo path locally and re-index on changes. With --on-commit, ' +
        'installs git hooks that re-index after commit / checkout / merge instead.',
    )
    .argument('<path>', 'Path to repository')
    .requiredOption('-r, --repo <id>', 'Repo ID')
    .option(
      '-d, --debounce <ms>',
      'Debounce window in ms (default 1500)',
      (v) => parseInt(v, 10),
      1500,
    )
    .option('--on-commit', 'Install git hooks instead of running a watcher')
    .option('--stop', 'Uninstall previously-installed git hooks')
    .action(
      async (
        path: string,
        opts: {
          repo: string;
          debounce: number;
          onCommit?: boolean;
          stop?: boolean;
        },
      ) => {
        const repoPath = resolve(path);
        try {
          if (opts.stop) {
            uninstallHooks(repoPath);
            return;
          }
          if (opts.onCommit) {
            installHooks(repoPath, opts.repo);
            return;
          }
          await runWatcher(repoPath, opts.repo, opts.debounce);
        } catch (e) {
          const err = e as {
            response?: { data?: { message?: string; detail?: string } };
            message?: string;
          };
          const detail =
            err.response?.data?.message ??
            err.response?.data?.detail ??
            err.message ??
            String(e);
          printError('Watch failed', detail);
          process.exit(1);
        }
      },
    );
}

// ── Local FS watcher ─────────────────────────────────────────────────────────

async function runWatcher(
  repoPath: string,
  repoId: string,
  debounceMs: number,
) {
  // Lazy import — chokidar is only needed for the long-running watcher.
  const { default: chokidar } = await import('chokidar');

  const client = createClient();
  console.log(
    chalk.dim(
      `Watching ${chalk.cyan(repoPath)} (debounce ${debounceMs}ms). Press Ctrl+C to stop.`,
    ),
  );

  let pending: NodeJS.Timeout | null = null;
  let running = false;
  let queued = false;

  const trigger = () => {
    if (running) {
      queued = true;
      return;
    }
    if (pending) clearTimeout(pending);
    pending = setTimeout(async () => {
      pending = null;
      running = true;
      try {
        await indexOnce(client, repoPath, repoId);
      } catch (err) {
        const e = err as {
          response?: { data?: { message?: string; detail?: string } };
          message?: string;
        };
        const detail =
          e.response?.data?.message ??
          e.response?.data?.detail ??
          e.message ??
          String(err);
        printError('Re-index failed', detail);
      } finally {
        running = false;
        if (queued) {
          queued = false;
          trigger();
        }
      }
    }, debounceMs);
  };

  const watcher = chokidar.watch(repoPath, {
    ignoreInitial: true,
    ignored: [
      /(^|[\\/])\.git([\\/]|$)/,
      /(^|[\\/])node_modules([\\/]|$)/,
      /(^|[\\/])dist([\\/]|$)/,
      /(^|[\\/])\.next([\\/]|$)/,
      /(^|[\\/])\.nx([\\/]|$)/,
    ],
  });

  watcher
    .on('add', trigger)
    .on('change', trigger)
    .on('unlink', trigger)
    .on('error', (err) => printError('Watcher error', String(err)));

  // Initial reconciliation pass once chokidar finishes its scan.
  watcher.on('ready', () => trigger());

  await new Promise<void>((resolveExit) => {
    process.on('SIGINT', () => {
      void watcher.close().then(() => {
        console.log(chalk.dim('\nStopped.'));
        resolveExit();
      });
    });
  });
}

async function indexOnce(
  client: ReturnType<typeof createClient>,
  repoPath: string,
  repoId: string,
) {
  const spinner = ora('Re-indexing…').start();
  const t0 = Date.now();
  const extracted = await extractRepo({
    repoPath,
    repoId,
    onFile: (rel) => {
      spinner.text = `Parsing ${chalk.dim(rel)}`;
    },
  });
  const localMs = Date.now() - t0;
  spinner.text = `Uploading ${extracted.nodes.length} nodes / ${extracted.edges.length} edges…`;
  const { data } = await client.post<IngestResult>('/graph/ingest', {
    repoId,
    nodes: extracted.nodes,
    edges: extracted.edges,
  });
  spinner.stop();
  const ts = new Date().toLocaleTimeString();
  console.log(
    chalk.dim(`[${ts}] `) +
      chalk.green('✔') +
      ` indexed ${data.nodesAdded ?? 0}n / ${data.edgesAdded ?? 0}e ` +
      chalk.dim(`(local ${localMs}ms, server ${data.durationMs ?? 0}ms)`),
  );
}

// ── Git hooks ────────────────────────────────────────────────────────────────

function hookScript(repoId: string, repoPath: string): string {
  return [
    '',
    HOOK_MARKER,
    '# Auto-generated by `gph watch --on-commit`. Remove with `gph watch <path> --repo <id> --stop`.',
    `( cd "${repoPath}" && gph index . --repo ${shellQuote(repoId)} ) >/dev/null 2>&1 &`,
    HOOK_MARKER_END,
    '',
  ].join('\n');
}

function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

function gitHooksDir(repoPath: string): string {
  const dotGit = join(repoPath, '.git');
  if (!existsSync(dotGit)) {
    throw new Error(`No .git directory found at ${repoPath}`);
  }
  // Worktrees / submodules: .git can be a file pointing at the real gitdir.
  try {
    const stat = readFileSync(dotGit, 'utf8');
    const match = stat.match(/^gitdir:\s*(.+)$/m);
    if (match) {
      const target = match[1].trim();
      const resolved = target.startsWith('/') ? target : join(repoPath, target);
      return join(resolved, 'hooks');
    }
  } catch {
    // Reading .git as a file failed → it is a directory; fall through.
  }
  return join(dotGit, 'hooks');
}

function installHooks(repoPath: string, repoId: string) {
  const hooksDir = gitHooksDir(repoPath);
  if (!existsSync(hooksDir)) {
    mkdirSync(hooksDir, { recursive: true });
  }
  const installed: string[] = [];
  for (const name of HOOK_NAMES) {
    const file = join(hooksDir, name);
    let existing: string;
    if (existsSync(file)) {
      // Strip any prior gph block so re-runs are idempotent.
      existing = stripGphBlock(readFileSync(file, 'utf8'));
    } else {
      existing = '#!/bin/sh\n';
    }
    writeFileSync(file, existing + hookScript(repoId, repoPath), 'utf8');
    chmodSync(file, 0o755);
    installed.push(name);
  }
  printSuccess(`Installed git hooks (${installed.join(', ')}) in ${hooksDir}`);
  console.log(
    chalk.dim(
      `  Each hook runs: gph index . --repo ${repoId} (in background).`,
    ),
  );
  console.log(
    chalk.dim(`  Remove with: gph watch ${repoPath} --repo ${repoId} --stop`),
  );
}

function uninstallHooks(repoPath: string) {
  const hooksDir = gitHooksDir(repoPath);
  const removed: string[] = [];
  for (const name of HOOK_NAMES) {
    const file = join(hooksDir, name);
    if (!existsSync(file)) continue;
    const original = readFileSync(file, 'utf8');
    const stripped = stripGphBlock(original);
    if (stripped === original) continue;
    if (stripped.trim() === '#!/bin/sh' || stripped.trim() === '') {
      rmSync(file);
    } else {
      writeFileSync(file, stripped, 'utf8');
    }
    removed.push(name);
  }
  if (!removed.length) {
    console.log(chalk.dim('No gph hooks were installed.'));
    return;
  }
  printSuccess(`Removed gph hooks: ${removed.join(', ')}`);
}

function stripGphBlock(content: string): string {
  const startIdx = content.indexOf(HOOK_MARKER);
  if (startIdx === -1) return content;
  const endIdx = content.indexOf(HOOK_MARKER_END, startIdx);
  if (endIdx === -1) return content;
  const before = content.slice(0, startIdx).replace(/\n+$/, '\n');
  const after = content
    .slice(endIdx + HOOK_MARKER_END.length)
    .replace(/^\n+/, '\n');
  return before + after;
}
