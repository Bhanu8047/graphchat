import chalk from 'chalk';
import { Command } from 'commander';
import { resolve } from 'node:path';
import { createClient } from '../lib/api-client.js';
import { printError, printSuccess } from '../lib/output.js';

export function watchCommand(): Command {
  return new Command('watch')
    .description('Watch a repo path and re-index on changes')
    .argument('<path>', 'Path to repository')
    .requiredOption('-r, --repo <id>', 'Repo ID')
    .option(
      '--on-commit',
      'Install git post-commit/post-checkout hooks instead of running a watcher',
    )
    .option('--stop', 'Stop the active server-side watcher for this repo')
    .action(
      async (
        path: string,
        opts: { repo: string; onCommit?: boolean; stop?: boolean },
      ) => {
        const client = createClient();
        const repoPath = resolve(path);
        try {
          if (opts.stop) {
            await client.delete(`/graph/watch/${opts.repo}`);
            printSuccess(`Stopped watcher for ${opts.repo}`);
            return;
          }
          if (opts.onCommit) {
            const { data } = await client.post<{ installed: string[] }>(
              '/graph/hooks/install',
              { repoId: opts.repo, repoPath },
            );
            printSuccess(
              `Installed git hooks: ${data.installed?.join(', ') ?? '-'}`,
            );
            return;
          }
          await client.post('/graph/watch', {
            repoId: opts.repo,
            repoPath,
          });
          printSuccess(
            `Watching ${chalk.cyan(repoPath)} (server-side; re-indexes on change)`,
          );
          console.log(
            chalk.dim(`  Stop with: gph watch ${path} --repo ${opts.repo} --stop`),
          );
        } catch (e) {
          const err = e as {
            response?: { data?: { message?: string } };
            message?: string;
          };
          printError('Watch failed', err.response?.data?.message ?? err.message);
          process.exit(1);
        }
      },
    );
}
