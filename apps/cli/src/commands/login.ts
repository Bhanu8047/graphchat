import axios from 'axios';
import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';
import { config } from '../lib/config.js';
import { saveCredentials } from '../lib/credentials.js';
import { printError, printSuccess } from '../lib/output.js';

export function loginCommand(): Command {
  return new Command('login')
    .description('Authenticate with your TRCHAT server using an API key')
    .option('-k, --key <api_key>', 'Your TRCHAT API key (sk-trchat-...)')
    .option('-s, --server <url>', 'Server URL (default: from config)')
    .action(async (opts: { key?: string; server?: string }) => {
      const server = opts.server ?? config.get('serverUrl');

      if (!opts.key) {
        printError('API key required', 'Use: gph login --key sk-trchat-...');
        printError(
          'Generate a key at: ' + chalk.cyan(`${server}/dashboard/keys`),
        );
        process.exit(1);
      }

      if (!opts.key.startsWith('sk-trchat-')) {
        printError('Invalid key format', 'Key must start with sk-trchat-');
        process.exit(1);
      }

      const spinner = ora('Authenticating…').start();
      try {
        const { data } = await axios.post<{
          access_token: string;
          refresh_token: string;
          expires_in: number;
        }>(`${server}/api/auth/exchange`, { api_key: opts.key });
        saveCredentials({ ...data, server, savedAt: Date.now() });
        if (opts.server) config.set('serverUrl', opts.server);
        spinner.stop();
        printSuccess(`Logged in to ${chalk.cyan(server)}`);
        printSuccess(
          `Token expires in: ${data.expires_in}s (auto-refreshes)`,
        );
      } catch (e) {
        spinner.stop();
        const err = e as { response?: { data?: { message?: string } }; message?: string };
        printError(
          'Authentication failed',
          err.response?.data?.message ?? err.message ?? 'Unknown error',
        );
        process.exit(1);
      }
    });
}
