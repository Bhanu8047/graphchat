import chalk from 'chalk';
import { Command } from 'commander';
import { createClient } from '../../lib/api-client.js';
import { printError } from '../../lib/output.js';

interface SessionResponse {
  user?: { githubLogin?: string };
}

export function githubStatusCommand(): Command {
  return new Command('status')
    .description('Show GitHub connection status')
    .action(async () => {
      const client = createClient();
      try {
        const { data } = await client.get<SessionResponse>('/auth/session');
        const username = data.user?.githubLogin;
        if (username) {
          console.log(
            `${chalk.green('✓')} GitHub connected: ${chalk.cyan(`@${username}`)}`,
          );
        } else {
          console.log(
            `${chalk.red('✗')} GitHub not connected. Run: ${chalk.cyan('gph github login')}`,
          );
        }
      } catch (e) {
        const err = e as { message?: string };
        printError('Failed to fetch session', err.message);
        process.exit(1);
      }
    });
}
