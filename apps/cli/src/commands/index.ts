import chalk from 'chalk';
import { Command } from 'commander';
import { resolve } from 'node:path';
import ora from 'ora';
import { createClient } from '../lib/api-client.js';
import { printError, printSuccess } from '../lib/output.js';

interface AnalyzeResult {
  nodes_added?: number;
  edges_added?: number;
  communities?: number;
  god_nodes?: string[];
  duration_ms?: number;
}

export function indexCommand(): Command {
  return new Command('index')
    .description('Index a repository (runs AST analysis + clustering)')
    .argument('<path>', 'Path to repository')
    .requiredOption('-r, --repo <id>', 'Repo ID to index into')
    .action(async (path: string, opts: { repo: string }) => {
      const client = createClient();
      const repoPath = resolve(path);
      const spinner = ora(`Indexing ${chalk.cyan(repoPath)}…`).start();
      try {
        const { data } = await client.post<AnalyzeResult>('/graph/analyze', {
          repoId: opts.repo,
          repoPath,
        });
        spinner.stop();
        printSuccess(
          `Indexed ${data.nodes_added ?? 0} nodes, ${data.edges_added ?? 0} edges, ` +
            `${data.communities ?? 0} communities in ${data.duration_ms ?? 0}ms`,
        );
        if (data.god_nodes?.length) {
          console.log(`  God nodes: ${data.god_nodes.join(', ')}`);
        }
      } catch (e) {
        spinner.stop();
        const err = e as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        printError('Index failed', err.response?.data?.message ?? err.message);
        process.exit(1);
      }
    });
}
