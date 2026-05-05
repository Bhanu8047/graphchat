import axios from 'axios';
import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import open from 'open';
import ora from 'ora';
import { config } from '../lib/config.js';
import { saveCredentials } from '../lib/credentials.js';
import { printError, printSuccess } from '../lib/output.js';

interface ApiTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

async function exchangeKey(server: string, key: string): Promise<void> {
  const spinner = ora('Authenticating…').start();
  try {
    const { data } = await axios.post<ApiTokenResponse>(
      `${server}/api/auth/exchange`,
      { api_key: key },
    );
    saveCredentials({ ...data, server, savedAt: Date.now() });
    spinner.stop();
    printSuccess(`Logged in to ${chalk.cyan(server)}`);
    printSuccess(`Token expires in: ${data.expires_in}s (auto-refreshes)`);
  } catch (e) {
    spinner.stop();
    const err = e as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    printError(
      'Authentication failed',
      err.response?.data?.message ?? err.message ?? 'Unknown error',
    );
    process.exit(1);
  }
}

interface CliStartResponse {
  device_code: string;
  user_code: string;
  verify_url: string;
  verify_url_complete: string;
  interval: number;
  expires_in: number;
}

type CliPollResponse =
  | { status: 'pending' }
  | { status: 'denied' }
  | ({ status: 'approved' } & ApiTokenResponse);

async function loginViaWeb(server: string): Promise<void> {
  const startSpinner = ora('Requesting device code…').start();
  let session: CliStartResponse;
  try {
    const { data } = await axios.post<CliStartResponse>(
      `${server}/api/auth/cli/start`,
    );
    session = data;
    startSpinner.stop();
  } catch (e) {
    startSpinner.stop();
    const err = e as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    printError(
      'Could not start web login',
      err.response?.data?.message ?? err.message,
    );
    process.exit(1);
  }

  const formatted = `${session.user_code.slice(0, 4)}-${session.user_code.slice(4)}`;
  console.log(
    `\n  Verification code: ${chalk.bold.cyan(formatted)}` +
      `\n  Open: ${chalk.cyan(session.verify_url_complete)}\n`,
  );
  try {
    await open(session.verify_url_complete);
  } catch {
    // Ignore: user can copy/paste the URL above.
  }

  const pollSpinner = ora('Waiting for browser approval…').start();
  const deadline = Date.now() + session.expires_in * 1000;
  const intervalMs = Math.max(1, session.interval) * 1000;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, intervalMs));
    try {
      const { data } = await axios.post<CliPollResponse>(
        `${server}/api/auth/cli/poll`,
        { device_code: session.device_code },
      );
      if (data.status === 'pending') continue;
      if (data.status === 'denied') {
        pollSpinner.stop();
        printError('Login denied or expired.');
        process.exit(1);
      }
      saveCredentials({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        server,
        savedAt: Date.now(),
      });
      pollSpinner.stop();
      printSuccess(`Logged in to ${chalk.cyan(server)}`);
      return;
    } catch (e) {
      // Transient errors: keep polling until the deadline.
      const err = e as { response?: { status?: number } };
      if (err.response?.status && err.response.status >= 500) continue;
    }
  }

  pollSpinner.stop();
  printError('Login timed out. Run `gph login` to try again.');
  process.exit(1);
}

export function loginCommand(): Command {
  return new Command('login')
    .description('Authenticate via the browser, or with --key for headless use')
    .option('-k, --key <api_key>', 'Your GRAPHCHAT API key (sk-graphchat-...)')
    .option('-s, --server <url>', 'Server URL (default: from config)')
    .action(async (opts: { key?: string; server?: string }) => {
      const server = opts.server ?? config.get('serverUrl');
      if (opts.server) config.set('serverUrl', opts.server);

      if (opts.key) {
        if (!opts.key.startsWith('sk-graphchat-')) {
          printError('Invalid key format', 'Key must start with sk-graphchat-');
          process.exit(1);
        }
        await exchangeKey(server, opts.key);
        return;
      }

      const { go } = await inquirer.prompt<{ go: boolean }>([
        {
          type: 'confirm',
          name: 'go',
          message: `Open ${server} in your browser to sign in?`,
          default: true,
        },
      ]);
      if (!go) {
        console.log(
          chalk.dim(
            `\nFor headless setups: ${chalk.cyan('gph login --key sk-graphchat-...')}`,
          ),
        );
        return;
      }
      await loginViaWeb(server);
    });
}
