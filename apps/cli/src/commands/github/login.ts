import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';
import { createClient } from '../../lib/api-client.js';
import { isTokenExpired, loadCredentials } from '../../lib/credentials.js';
import { printError, printSuccess } from '../../lib/output.js';

interface GithubCliStartResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  interval: number;
  expires_in: number;
}

type GithubCliPollResponse =
  | { pending: true }
  | { connected: true; github_username: string; avatar_url: string };

export function githubLoginCommand(): Command {
  return new Command('login')
    .description('Connect your GitHub account via device flow')
    .action(async () => {
      const client = createClient();

      const startSpinner = ora('Requesting GitHub device code…').start();
      let session: GithubCliStartResponse;
      try {
        const { data } = await client.post<GithubCliStartResponse>(
          '/api/auth/github/cli/start',
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
          'Could not start GitHub login',
          err.response?.data?.message ?? err.message,
        );
        process.exit(1);
      }

      const formatted = `${session.user_code.slice(0, 4)}-${session.user_code.slice(4)}`;
      console.log(
        `\n  Visit: ${chalk.cyan('github.com/login/device')}` +
          `\n  Enter code: ${chalk.bold.cyan(formatted)}\n`,
      );

      // Poll endpoint requires a valid graphchat session. Check before entering
      // the loop so the error is clear rather than a generic "Session expired".
      const creds = loadCredentials();
      if (!creds || isTokenExpired(creds)) {
        printError(
          'Your graphchat session has expired.',
          'Run: gph login   then retry: gph github login',
        );
        process.exit(1);
      }

      const pollSpinner = ora('Waiting for GitHub authorization…').start();
      // Ensure the spinner is stopped even if the axios interceptor calls process.exit.
      process.once('exit', () => pollSpinner.stop());
      const deadline = Date.now() + session.expires_in * 1000;
      const intervalMs = Math.max(1, session.interval) * 1000;

      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, intervalMs));
        try {
          const { data } = await client.post<GithubCliPollResponse>(
            '/api/auth/github/cli/poll',
            { device_code: session.device_code },
          );
          if ('pending' in data && data.pending) continue;
          if ('connected' in data && data.connected) {
            pollSpinner.stop();
            printSuccess(`Connected as ${chalk.cyan(`@${data.github_username}`)}`);
            return;
          }
        } catch (e) {
          // Transient errors: keep polling until deadline.
          const err = e as { response?: { status?: number } };
          if (err.response?.status && err.response.status >= 500) continue;
          pollSpinner.stop();
          const castErr = e as { response?: { data?: { message?: string } }; message?: string };
          printError(
            'GitHub authorization failed',
            castErr.response?.data?.message ?? castErr.message,
          );
          process.exit(1);
        }
      }

      pollSpinner.stop();
      printError('GitHub login timed out. Run `gph github login` to try again.');
      process.exit(1);
    });
}
