import { Command } from 'commander';
import { githubImportCommand } from './import.js';
import { githubLoginCommand } from './login.js';
import { githubLogoutCommand } from './logout.js';
import { githubReposCommand } from './repos.js';
import { githubStatusCommand } from './status.js';
import { githubSyncCommand } from './sync.js';

export function githubCommand(): Command {
  const cmd = new Command('github')
    .description('Manage your connected GitHub account')
    .addHelpText(
      'after',
      `
Commands:
  login   Connect your GitHub account via device flow
  logout  Disconnect your GitHub account
  status  Show GitHub connection status
  repos   Browse and import your GitHub repositories
  import  Import a GitHub repository and set it as active
  sync    Sync the active repo from GitHub
`,
    );
  cmd.addCommand(githubLoginCommand());
  cmd.addCommand(githubLogoutCommand());
  cmd.addCommand(githubStatusCommand());
  cmd.addCommand(githubReposCommand());
  cmd.addCommand(githubImportCommand());
  cmd.addCommand(githubSyncCommand());
  return cmd;
}
