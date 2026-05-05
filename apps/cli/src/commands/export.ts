import { Command } from 'commander';
import { writeFileSync } from 'node:fs';
import ora from 'ora';
import { createClient } from '../lib/api-client.js';
import { printError, printSuccess } from '../lib/output.js';
import { resolveRepoId } from '../lib/repo.js';

export function exportCommand(): Command {
  return new Command('export')
    .description('Export the agent context payload as JSON')
    .option('-r, --repo <id>', 'Repo ID (defaults to selected repo)')
    .option('-o, --out <path>', 'Output file (defaults to stdout)')
    .action(async (opts: { repo?: string; out?: string }) => {
      const repoId = resolveRepoId(opts.repo);
      const client = createClient();
      const spinner = opts.out ? ora('Exporting…').start() : null;
      try {
        const { data } = await client.get(`/export/${repoId}`);
        spinner?.stop();
        const json = JSON.stringify(data, null, 2);
        if (opts.out) {
          writeFileSync(opts.out, json);
          printSuccess(`Wrote ${opts.out}`);
        } else {
          console.log(json);
        }
      } catch (e) {
        spinner?.stop();
        const err = e as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        printError('Export failed', err.response?.data?.message ?? err.message);
        process.exit(1);
      }
    });
}
