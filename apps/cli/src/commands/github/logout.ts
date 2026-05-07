import chalk from 'chalk';
import { Command } from 'commander';
import { createClient } from '../../lib/api-client.js';
import { printError, printSuccess } from '../../lib/output.js';

export function githubLogoutCommand(): Command {
  return new Command('logout')
    .description('Disconnect your GitHub account')
    .action(async () => {
      const client = createClient();
      try {
        await client.delete('/auth/github/token');
        printSuccess('GitHub account disconnected.');
      } catch (e) {
        const err = e as { response?: { status?: number }; message?: string };
        if (err.response?.status === 404) {
          console.log(
            chalk.yellow('!') +
              ' Disconnect endpoint not yet available on this server.\n' +
              `  ${chalk.dim('To manually revoke access, visit: https://github.com/settings/applications')}`,
          );
          return;
        }
        printError(
          'Failed to disconnect GitHub',
          err.message,
        );
        process.exit(1);
      }
    });
}
