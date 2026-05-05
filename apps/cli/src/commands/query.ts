import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';
import { createClient } from '../lib/api-client.js';
import { confidenceBadge, printError } from '../lib/output.js';
import { resolveRepoId } from '../lib/repo.js';

interface QueryNode {
  id: string;
  label: string;
  type: string;
  content: string;
  confidence?: string;
}

interface QueryResponse {
  nodes: QueryNode[];
  total_chars?: number;
  truncated?: boolean;
}

export function queryCommand(): Command {
  return new Command('query')
    .description('Graph-expanded search starting from vector seed nodes')
    .argument('<question>', 'Natural-language question')
    .option('-r, --repo <id>', 'Repo ID (defaults to selected repo)')
    .option(
      '-m, --mode <mode>',
      'Traversal mode: knn|bfs|dfs',
      (v) => v as 'knn' | 'bfs' | 'dfs',
      'knn',
    )
    .option('-h, --hops <n>', 'Hops to expand', (v) => parseInt(v, 10), 2)
    .option('-b, --budget <tokens>', 'Token budget', (v) => parseInt(v, 10), 2000)
    .option('--json', 'Raw JSON')
    .action(
      async (
        question: string,
        opts: {
          repo?: string;
          mode: 'knn' | 'bfs' | 'dfs';
          hops: number;
          budget: number;
          json?: boolean;
        },
      ) => {
        const repoId = resolveRepoId(opts.repo);
        const client = createClient();
        const spinner = ora(`Querying ${chalk.cyan(question)}…`).start();
        try {
          const { data } = await client.post<QueryResponse>('/graph/query', {
            repoId,
            question,
            mode: opts.mode,
            hops: opts.hops,
            budget: opts.budget,
          });
          spinner.stop();
          if (opts.json) {
            console.log(JSON.stringify(data, null, 2));
            return;
          }
          if (!data.nodes?.length) {
            console.log(chalk.dim('No results.'));
            return;
          }
          data.nodes.forEach((n, i) => {
            console.log(
              `${chalk.bold(`[${i + 1}]`)} ${chalk.cyan(n.label)} ` +
                `${chalk.dim(`(${n.type})`)} ${confidenceBadge(n.confidence)}`,
            );
            console.log(`    ${n.content.slice(0, 200)}`);
          });
          if (data.truncated) {
            console.log(chalk.yellow('\n(results truncated to fit budget)'));
          }
        } catch (e) {
          spinner.stop();
          const err = e as {
            response?: { data?: { message?: string } };
            message?: string;
          };
          printError('Query failed', err.response?.data?.message ?? err.message);
          process.exit(1);
        }
      },
    );
}
