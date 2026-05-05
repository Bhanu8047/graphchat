import chalk from 'chalk';
import { Command } from 'commander';
import { createClient } from '../lib/api-client.js';
import { printError, printSuccess } from '../lib/output.js';
import {
  clearSelectedRepoId,
  getSelectedRepoId,
  setSelectedRepoId,
} from '../lib/repo.js';

interface Repo {
  id: string;
  name: string;
  description?: string;
  agent?: string;
  techStack?: string[];
}

async function listRepos(): Promise<void> {
  const client = createClient();
  const { data } = await client.get<Repo[]>('/repos');
  if (!data.length) {
    console.log(chalk.dim('No repositories yet.'));
    return;
  }
  const selected = getSelectedRepoId();
  data.forEach((r) => {
    const marker = r.id === selected ? chalk.green('* ') : '  ';
    console.log(
      `${marker}${chalk.bold(r.name)} ${chalk.dim(`(${r.id})`)}\n    ${r.description ?? ''}`,
    );
  });
  if (!selected) {
    console.log(
      chalk.dim(`\nNo repo selected. Run ${chalk.cyan('gph use')} to pick one.`),
    );
  }
}

export function reposCommand(): Command {
  const cmd = new Command('repos')
    .description('Manage indexed repositories')
    .action(async () => listRepos());

  cmd
    .command('list')
    .description('List all repositories')
    .action(async () => listRepos());

  cmd
    .command('add')
    .description('Create a new repository')
    .requiredOption('-n, --name <name>', 'Repository name')
    .option('-d, --desc <text>', 'Description', '')
    .option('-a, --agent <agent>', 'Default agent (claude|gpt|gemini|all)', 'all')
    .option('--select', 'Select the new repo as the active one')
    .action(
      async (opts: {
        name: string;
        desc?: string;
        agent?: string;
        select?: boolean;
      }) => {
        const client = createClient();
        try {
          const { data } = await client.post<Repo>('/repos', {
            name: opts.name,
            description: opts.desc ?? '',
            agent: opts.agent ?? 'all',
          });
          printSuccess(`Repo created: ${data.name} (${data.id})`);
          if (opts.select) {
            setSelectedRepoId(data.id);
            printSuccess(`Using repo ${chalk.cyan(data.id)}`);
          }
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
        if (getSelectedRepoId() === id) {
          clearSelectedRepoId();
        }
        printSuccess(`Deleted ${id}`);
      } catch (e) {
        const err = e as { message?: string };
        printError('Delete failed', err.message);
        process.exit(1);
      }
    });

  return cmd;
}
