import chalk from 'chalk';
import { Command } from 'commander';
import { createClient } from '../lib/api-client.js';
import { printError } from '../lib/output.js';
import { resolveRepoId } from '../lib/repo.js';

interface PathResponse {
  path: Array<{ id: string; label: string; type: string }>;
  hops: number;
}

export function pathCommand(): Command {
  return new Command('path')
    .description('Find shortest graph path between two node labels')
    .argument('<source>', 'Source node label')
    .argument('<target>', 'Target node label')
    .option('-r, --repo <id>', 'Repo ID (defaults to selected repo)')
    .action(
      async (source: string, target: string, opts: { repo?: string }) => {
        const repoId = resolveRepoId(opts.repo);
        const client = createClient();
        try {
          const { data } = await client.get<PathResponse>('/graph/path', {
            params: { repoId, source, target },
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
