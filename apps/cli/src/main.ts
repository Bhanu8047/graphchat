#!/usr/bin/env node
import chalk from 'chalk';
import { Command } from 'commander';
import { githubCommand } from './commands/github/index.js';
import { explainCommand } from './commands/explain.js';
import { exportCommand } from './commands/export.js';
import { indexCommand } from './commands/index.js';
import { loginCommand } from './commands/login.js';
import { logoutCommand } from './commands/logout.js';
import { pathCommand } from './commands/path.js';
import { queryCommand } from './commands/query.js';
import { reportCommand } from './commands/report.js';
import { reposCommand } from './commands/repos.js';
import { searchCommand } from './commands/search.js';
import { statusCommand } from './commands/status.js';
import { useCommand } from './commands/use.js';
import { watchCommand } from './commands/watch.js';

const program = new Command();

program
  .name('gph')
  .description(
    chalk.bold('GRAPHCHAT') +
      ' — Repository context graph for AI agents (beta)',
  )
  .version('0.1.0-beta.0')
  .addHelpText(
    'after',
    `
${chalk.dim('Examples:')}
  ${chalk.cyan('gph login')}                        ${chalk.dim('# browser login')}
  ${chalk.cyan('gph login --key sk-graphchat-...')}  ${chalk.dim('# headless')}
  ${chalk.cyan('gph repos')}
  ${chalk.cyan('gph use')}                           ${chalk.dim('# pick the active repo')}
  ${chalk.cyan('gph index ./src')}                   ${chalk.dim('# uses selected repo')}
  ${chalk.cyan('gph index ./src --repo my-api-id')}
  ${chalk.cyan('gph search "authentication middleware" --budget 1500')}
  ${chalk.cyan('gph query "how does login work?" --repo my-api-id --hops 2')}
  ${chalk.cyan('gph explain AuthService --repo my-api-id')}
  ${chalk.cyan('gph path AuthService JwtGuard --repo my-api-id')}
  ${chalk.cyan('gph watch ./src --repo my-api-id')}
  ${chalk.cyan('gph watch ./src --repo my-api-id --on-commit')}
  ${chalk.cyan('gph report --repo my-api-id --out GRAPH_REPORT.md')}
  ${chalk.cyan('gph export --repo my-api-id --out context.json')}

${chalk.dim('GitHub integration:')}
  ${chalk.cyan('gph github login')}                  ${chalk.dim('# connect GitHub account')}
  ${chalk.cyan('gph github status')}                 ${chalk.dim('# check connection')}
  ${chalk.cyan('gph github import')}                 ${chalk.dim('# import a repo and select it')}
  ${chalk.cyan('gph github import owner/repo')}      ${chalk.dim('# skip the picker')}
  ${chalk.cyan('gph github sync')}                   ${chalk.dim('# sync active repo from GitHub')}
`,
  );

program.addCommand(loginCommand());
program.addCommand(githubCommand());
program.addCommand(logoutCommand());
program.addCommand(statusCommand());
program.addCommand(reposCommand());
program.addCommand(useCommand());
program.addCommand(indexCommand());
program.addCommand(searchCommand());
program.addCommand(queryCommand());
program.addCommand(explainCommand());
program.addCommand(pathCommand());
program.addCommand(watchCommand());
program.addCommand(exportCommand());
program.addCommand(reportCommand());

program.parseAsync(process.argv).catch((err: unknown) => {
  const e = err as { message?: string };
  console.error(chalk.red(`Fatal: ${e.message ?? String(err)}`));
  process.exit(1);
});
