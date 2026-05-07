import chalk from 'chalk';
import { Command } from 'commander';
import { createClient } from '../../lib/api-client.js';
import { printError, printSuccess } from '../../lib/output.js';
import { setSelectedRepoId } from '../../lib/repo.js';
import {
  fetchBranches,
  fetchGithubRepos,
  importGithubRepo,
  pickBranch,
  pickGithubRepo,
} from './shared.js';

export function githubImportCommand(): Command {
  return new Command('import')
    .description('Import a GitHub repository and set it as the active repo')
    .argument('[url]', 'GitHub repo URL or owner/repo (skips the picker)')
    .action(async (url: string | undefined) => {
      try {
        const client = createClient();

        let githubUrl: string;

        if (url) {
          // Normalise owner/repo shorthand to a full URL.
          githubUrl = url.startsWith('http') ? url : `https://github.com/${url}`;
        } else {
          const repos = await fetchGithubRepos(client);
          if (!repos.length) {
            console.log(chalk.dim('No repositories found.'));
            return;
          }
          const repo = await pickGithubRepo(repos);
          githubUrl = `https://github.com/${repo.full_name}`;
        }

        const branchList = await fetchBranches(client, githubUrl);
        const branch = await pickBranch(branchList);
        const imported = await importGithubRepo(client, githubUrl, branch);

        setSelectedRepoId(imported.id);

        const sanitizedGithubUrl = githubUrl.replace(/\/+$/, ''); // Remove trailing slashes
        const dirname =
          sanitizedGithubUrl.split('/').filter(Boolean).pop() ?? imported.name;
        printSuccess(
          `Imported and selected ${chalk.cyan(imported.name)} (${chalk.dim(branch)}).` +
            ` Run: ${chalk.cyan(`gph index ./${dirname}`)} to build the graph.`,
        );
      } catch (error) {
        printError(
          'Import failed',
          error instanceof Error ? error.message : String(error),
        );
        process.exit(1);
      }
    });
}
