import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { createClient } from '../../lib/api-client.js';
import { printSuccess } from '../../lib/output.js';
import {
  fetchBranches,
  fetchGithubRepos,
  importGithubRepo,
  pickBranch,
  pickGithubRepo,
} from './shared.js';

export function githubReposCommand(): Command {
  return new Command('repos')
    .description('Browse and import your GitHub repositories')
    .option('--search <query>', 'Filter repos by name')
    .option('--org <org>', 'List repos for a GitHub organisation')
    .option('--json', 'Print raw JSON and exit')
    .action(async (opts: { search?: string; org?: string; json?: boolean }) => {
      try {
        const client = createClient();
        let spinner;
        spinner = ora('Fetching repositories…').start();
        const repos = await fetchGithubRepos(client, {
          search: opts.search,
          org: opts.org,
        });
        spinner.stop();

        if (opts.json) {
          console.log(JSON.stringify(repos, null, 2));
          return;
        }

        if (!repos.length) {
          console.log(chalk.dim('No repositories found.'));
          return;
        }

        const repo = await pickGithubRepo(repos);
        console.log(
          `\n  ${chalk.bold('Repo:')}    ${repo.full_name}` +
            `\n  ${chalk.bold('Branch:')}  ${repo.default_branch}` +
            `\n  ${chalk.bold('Private:')} ${repo.private ? 'yes' : 'no'}\n`,
        );

        const { doImport } = await inquirer.prompt<{ doImport: boolean }>([
          {
            type: 'confirm',
            name: 'doImport',
            message: 'Import this repo to graphchat?',
            default: false,
          },
        ]);
        if (!doImport) return;

        const githubUrl = `https://github.com/${repo.full_name}`;
        spinner = ora('Fetching branches…').start();
        const branchList = await fetchBranches(client, githubUrl);
        spinner.stop();
        const branch = await pickBranch(branchList);
        spinner = ora('Importing repository…').start();
        const imported = await importGithubRepo(client, githubUrl, branch);
        spinner.stop();
        printSuccess(
          `Imported ${chalk.cyan(imported.name)} (${chalk.dim(branch)}) — run: ${chalk.cyan('gph use')} to select it`,
        );
      } catch {
        console.error(chalk.red('Failed to complete operation.'));
        process.exit(1);
      }
    });
}
