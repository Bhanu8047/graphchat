import chalk from 'chalk';
import { Command } from 'commander';
import { createClient } from '../lib/api-client.js';
import { printError } from '../lib/output.js';

interface PathResponse {
  path: Array<{ id: string; label: string; type: string }>;
  hops: number;
}

export function pathCommand(): Command {
  return new Command('path')
    .description('Find shortest graph path between two node labels')
    .argument('<source>', 'Source node label')
    .argument('<target>', 'Target node label')
    .requiredOption('-r, --repo <id>', 'Repo ID')
    .action(
      async (source: string, target: string, opts: { repo: string }) => {
        const client = createClient();
        try {
          const { data } = await client.get<PathResponse>('/graph/path', {
            params: { repoId: opts.repo, source, target },
          });
          if (!data.path?.length) {
            console.log(chalk.dim('No path found.'));
            return;
          }
          console.log(
            chalk.bold(`${data.hops} hop(s) from ${source} → ${target}:`),
          );
          data.path.forEach((n, i) => {
            const arrow = i === 0 ? '  ' : chalk.dim(' → ');
            console.log(
              `${arrow}${chalk.cyan(n.label)} ${chalk.dim(`(${n.type})`)}`,
            );
          });
        } catch (e) {
          const err = e as {
            response?: { data?: { message?: string } };
            message?: string;
          };
          printError('Path failed', err.response?.data?.message ?? err.message);
          process.exit(1);
        }
      },
    );
}
