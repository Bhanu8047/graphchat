import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';
import { createClient } from '../lib/api-client.js';
import { printError } from '../lib/output.js';

interface ExplainResponse {
  label: string;
  explanation: string;
  related?: Array<{ label: string; type: string }>;
}

export function explainCommand(): Command {
  return new Command('explain')
    .description('AI-generated explanation of a node in graph context')
    .argument('<label>', 'Node label to explain')
    .requiredOption('-r, --repo <id>', 'Repo ID')
    .action(async (label: string, opts: { repo: string }) => {
      const client = createClient();
      const spinner = ora(`Explaining ${chalk.cyan(label)}…`).start();
      try {
        const { data } = await client.post<ExplainResponse>('/ai/explain', {
          repoId: opts.repo,
          label,
        });
        spinner.stop();
        console.log(chalk.bold(`\n${data.label}`));
        console.log(data.explanation);
        if (data.related?.length) {
          console.log(chalk.dim('\nRelated:'));
          data.related.forEach((r) =>
            console.log(`  ${chalk.cyan(r.label)} ${chalk.dim(`(${r.type})`)}`),
          );
        }
      } catch (e) {
        spinner.stop();
        const err = e as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        printError('Explain failed', err.response?.data?.message ?? err.message);
        process.exit(1);
      }
    });
}
