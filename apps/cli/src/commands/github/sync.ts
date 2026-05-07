import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';
import { createClient } from '../../lib/api-client.js';
import { printError, printSuccess } from '../../lib/output.js';
import { resolveRepoId } from '../../lib/repo.js';

interface SyncResult {
  id: string;
  name: string;
}

export function githubSyncCommand(): Command {
  return new Command('sync')
    .description('Sync the active repo from GitHub')
    .option('-r, --repo <id>', 'Repo ID (defaults to selected repo)')
    .action(async (opts: { repo?: string }) => {
      let repoId: string;
      try {
        repoId = resolveRepoId(opts.repo);
      } catch {
        console.error(chalk.red('Error: No repository selected or specified.')); // User-friendly error message
        process.exit(1); // Exit with a non-zero status
      }

      const client = createClient();

      const spinner = ora('Syncing from GitHub…').start();
      try {
        const { data } = await client.post<SyncResult>(
          `/repos/${repoId}/sync/github`,
        );
        spinner.stop();
        printSuccess(`Sync triggered for ${chalk.cyan(data.name)}`);
      } catch (e) {
        spinner.stop();
        const err = e as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        printError('Sync failed', err.response?.data?.message ?? err.message);
        process.exit(1);
      }
    });
}
