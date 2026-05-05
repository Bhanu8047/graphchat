import chalk from 'chalk';
import { Command } from 'commander';
import { resolve } from 'node:path';
import ora from 'ora';
import { createClient } from '../lib/api-client.js';
import { extractRepo } from '../lib/extract/index.js';
import { printError, printSuccess } from '../lib/output.js';
import { resolveRepoId } from '../lib/repo.js';

interface AnalyzeResult {
  nodesAdded?: number;
  edgesAdded?: number;
  communities?: number;
  godNodes?: string[];
  durationMs?: number;
}

export function indexCommand(): Command {
  return new Command('index')
    .description(
      'Index a repository: runs Tree-sitter locally, then sends the graph to the API. ' +
        'Source code never leaves your machine.',
    )
    .argument('<path>', 'Path to repository')
    .option('-r, --repo <id>', 'Repo ID (defaults to selected repo)')
    .action(async (path: string, opts: { repo?: string }) => {
      const repoId = resolveRepoId(opts.repo);
      const repoPath = resolve(path);
      const client = createClient();

      const spinner = ora(`Scanning ${chalk.cyan(repoPath)}…`).start();
      let lastFile = '';
      const t0 = Date.now();
      try {
        const extracted = await extractRepo({
          repoPath,
          repoId: repoId,
          onFile: (rel) => {
            lastFile = rel;
            spinner.text = `Parsing ${chalk.dim(rel)}`;
          },
        });
        const localMs = Date.now() - t0;

        spinner.text =
          `Extracted ${extracted.nodes.length} nodes, ${extracted.edges.length} edges ` +
          `from ${extracted.filesParsed} files (${localMs}ms). Uploading…`;

        const { data } = await client.post<AnalyzeResult>('/graph/ingest', {
          repoId: repoId,
          nodes: extracted.nodes,
          edges: extracted.edges,
        });
        spinner.stop();

        printSuccess(
          `Indexed ${data.nodesAdded ?? 0} nodes, ${data.edgesAdded ?? 0} edges, ` +
            `${data.communities ?? 0} communities (server ${data.durationMs ?? 0}ms, local ${localMs}ms)`,
        );
        if (data.godNodes?.length) {
          console.log(`  God nodes: ${data.godNodes.join(', ')}`);
        }
      } catch (e) {
        spinner.stop();
        const err = e as {
          response?: { data?: { message?: string; detail?: string } };
          message?: string;
        };
        const detail =
          err.response?.data?.message ??
          err.response?.data?.detail ??
          err.message ??
          'unknown error';
        const where = lastFile ? ` (last file: ${lastFile})` : '';
        printError('Index failed', `${detail}${where}`);
        process.exit(1);
      }
    });
}
