import { Command } from 'commander';
import { writeFileSync } from 'node:fs';
import ora from 'ora';
import { createClient } from '../lib/api-client.js';
import { printError, printSuccess } from '../lib/output.js';

export function reportCommand(): Command {
  return new Command('report')
    .description('Print or save the GRAPH_REPORT.md for a repo')
    .requiredOption('-r, --repo <id>', 'Repo ID')
    .option('-o, --out <path>', 'Output file (defaults to stdout)')
    .action(async (opts: { repo: string; out?: string }) => {
      const client = createClient();
      const spinner = opts.out ? ora('Fetching report…').start() : null;
      try {
        const { data } = await client.get<{ report: string }>(
          `/graph/report/${opts.repo}`,
        );
        spinner?.stop();
        const md = data.report ?? '';
        if (opts.out) {
          writeFileSync(opts.out, md);
          printSuccess(`Wrote ${opts.out}`);
        } else {
          console.log(md);
        }
      } catch (e) {
        spinner?.stop();
        const err = e as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        printError('Report failed', err.response?.data?.message ?? err.message);
        process.exit(1);
      }
    });
}
