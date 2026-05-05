import chalk from 'chalk';
import { Command } from 'commander';
import { createClient } from '../lib/api-client.js';
import { isTokenExpired, loadCredentials } from '../lib/credentials.js';
import { printSeparator } from '../lib/output.js';

interface RepoSummary {
  id: string;
  name: string;
  agent?: string;
  techStack?: string[];
  nodes?: unknown[];
}

export function statusCommand(): Command {
  return new Command('status')
    .description('Show connection status and indexed repositories')
    .action(async () => {
      const creds = loadCredentials();
      printSeparator('GRAPHCHAT STATUS');

      if (!creds) {
        console.log(chalk.red('● Not logged in'));
        console.log(`  Run: ${chalk.cyan('gph login --key sk-graphchat-...')}`);
        return;
      }

      console.log(chalk.green('● Connected'));
      console.log(`  Server:  ${chalk.cyan(creds.server)}`);
      console.log(
        `  Token:   ${
          isTokenExpired(creds)
            ? chalk.yellow('expiring soon')
            : chalk.green('valid')
        }`,
      );

      const client = createClient();
      try {
        const { data: repos } = await client.get<RepoSummary[]>('/repos');
        printSeparator('REPOSITORIES');
        if (!repos.length) {
          console.log(chalk.dim('  No repositories indexed yet'));
          console.log(`  Run: ${chalk.cyan('gph index ./src --repo my-api')}`);
        } else {
          repos.forEach((r) => {
            console.log(
              `  ${chalk.bold(r.name)} ${chalk.dim(`(${r.id.slice(0, 8)}…)`)}`,
            );
            console.log(
              `    Nodes: ${r.nodes?.length ?? 0} · Agent: ${r.agent ?? '-'} · Stack: ${r.techStack?.join(', ') ?? '-'}`,
            );
          });
        }
      } catch (e) {
        const err = e as { message?: string };
        console.log(chalk.red(`  Failed to fetch repos: ${err.message ?? e}`));
      }
    });
}
