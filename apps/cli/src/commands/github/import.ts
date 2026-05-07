import chalk from 'chalk';
import { Command } from 'commander';
import { createClient } from '../../lib/api-client.js';
import { printSuccess } from '../../lib/output.js';
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

      let branchList;
      try {
        branchList = await fetchBranches(client, githubUrl);
      } catch {
        // fetchBranches already calls printError + exit(1); this is unreachable
        // but satisfies the type-checker for the assignment below.
        process.exit(1);
      }

      const branch = await pickBranch(branchList);
      const imported = await importGithubRepo(client, githubUrl, branch);

      setSelectedRepoId(imported.id);

      const dirname = githubUrl.split('/').pop() ?? imported.name;
      printSuccess(
        `Imported and selected ${chalk.cyan(imported.name)} (${chalk.dim(branch)}).` +
          ` Run: ${chalk.cyan(`gph index ./${dirname}`)} to build the graph.`,
      );
    });
}
