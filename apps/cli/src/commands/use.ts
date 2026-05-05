import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
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
}

export function useCommand(): Command {
  return new Command('use')
    .description(
      'Select the repository used by default for subsequent commands. ' +
        'With no <id>, opens an interactive picker.',
    )
    .argument('[id]', 'Repo ID to select')
    .option('--clear', 'Clear the selected repository')
    .action(async (id: string | undefined, opts: { clear?: boolean }) => {
      if (opts.clear) {
        clearSelectedRepoId();
        printSuccess('Cleared selected repository.');
        return;
      }

      if (id) {
        setSelectedRepoId(id);
        printSuccess(`Using repo ${chalk.cyan(id)}`);
        return;
      }

      const client = createClient();
      const { data } = await client.get<Repo[]>('/repos');
      if (!data.length) {
        printError(
          'No repositories yet.',
          `Create one with ${chalk.cyan('gph repos add --name <name>')}`,
        );
        process.exit(1);
      }

      const current = getSelectedRepoId();
      const { picked } = await inquirer.prompt<{ picked: string }>([
        {
          type: 'list',
          name: 'picked',
          message: 'Select a repository:',
          default: current,
          choices: data.map((r) => ({
            name: `${r.name} ${chalk.dim(`(${r.id})`)}${r.id === current ? chalk.dim(' [current]') : ''}`,
            value: r.id,
          })),
        },
      ]);
      setSelectedRepoId(picked);
      printSuccess(`Using repo ${chalk.cyan(picked)}`);
    });
}
