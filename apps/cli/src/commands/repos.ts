import chalk from 'chalk';
import { Command } from 'commander';
import { createClient } from '../lib/api-client.js';
import { printError, printSuccess } from '../lib/output.js';

interface Repo {
  id: string;
  name: string;
  description?: string;
  agent?: string;
  techStack?: string[];
}

export function reposCommand(): Command {
  const cmd = new Command('repos').description('Manage indexed repositories');

  cmd
    .command('list')
    .description('List all repositories')
    .action(async () => {
      const client = createClient();
      const { data } = await client.get<Repo[]>('/repos');
      if (!data.length) {
        console.log(chalk.dim('No repositories yet.'));
        return;
      }
      data.forEach((r) => {
        console.log(
          `${chalk.bold(r.name)} ${chalk.dim(`(${r.id})`)}\n  ${r.description ?? ''}`,
        );
      });
    });

  cmd
    .command('add')
    .description('Create a new repository')
    .requiredOption('-n, --name <name>', 'Repository name')
    .option('-d, --desc <text>', 'Description', '')
    .option('-a, --agent <agent>', 'Default agent (claude|gpt|gemini|all)', 'all')
    .action(
      async (opts: { name: string; desc?: string; agent?: string }) => {
        const client = createClient();
        try {
          const { data } = await client.post<Repo>('/repos', {
            name: opts.name,
            description: opts.desc ?? '',
            agent: opts.agent ?? 'all',
          });
          printSuccess(`Repo created: ${data.name} (${data.id})`);
        } catch (e) {
          const err = e as { message?: string };
          printError('Failed to create repo', err.message);
          process.exit(1);
        }
      },
    );

  cmd
    .command('delete <id>')
    .description('Delete a repository (irreversible)')
    .action(async (id: string) => {
      const client = createClient();
      try {
        await client.delete(`/repos/${id}`);
        printSuccess(`Deleted ${id}`);
      } catch (e) {
        const err = e as { message?: string };
        printError('Delete failed', err.message);
        process.exit(1);
      }
    });

  return cmd;
}
