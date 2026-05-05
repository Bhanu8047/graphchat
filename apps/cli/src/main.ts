#!/usr/bin/env node
import chalk from 'chalk';
import { Command } from 'commander';
import { exportCommand } from './commands/export.js';
import { indexCommand } from './commands/index.js';
import { loginCommand } from './commands/login.js';
import { logoutCommand } from './commands/logout.js';
import { pathCommand } from './commands/path.js';
import { reportCommand } from './commands/report.js';
import { reposCommand } from './commands/repos.js';
import { searchCommand } from './commands/search.js';
import { statusCommand } from './commands/status.js';

const program = new Command();

program
  .name('gph')
  .description(
    chalk.bold('TRCHAT') +
      ' — Repository context graph for AI agents (beta)',
  )
  .version('0.1.0-beta.0')
  .addHelpText(
    'after',
    `
${chalk.dim('Examples:')}
  ${chalk.cyan('gph login --key sk-trchat-...')}
  ${chalk.cyan('gph repos')}
  ${chalk.cyan('gph index ./src --repo my-api-id')}
  ${chalk.cyan('gph search "authentication middleware" --budget 1500')}
  ${chalk.cyan('gph path AuthService JwtGuard --repo my-api-id')}
  ${chalk.cyan('gph report --repo my-api-id --out GRAPH_REPORT.md')}
  ${chalk.cyan('gph export --repo my-api-id --out context.json')}

${chalk.dim('Note: query / explain / watch are coming in a future release.')}
`,
  );

program.addCommand(loginCommand());
program.addCommand(logoutCommand());
program.addCommand(statusCommand());
program.addCommand(reposCommand());
program.addCommand(indexCommand());
program.addCommand(searchCommand());
program.addCommand(pathCommand());
program.addCommand(exportCommand());
program.addCommand(reportCommand());

program.parseAsync(process.argv).catch((err: unknown) => {
  const e = err as { message?: string };
  console.error(chalk.red(`Fatal: ${e.message ?? String(err)}`));
  process.exit(1);
});
