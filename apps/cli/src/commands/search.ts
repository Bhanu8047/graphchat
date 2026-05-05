import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';
import { createClient } from '../lib/api-client.js';
import { confidenceBadge, printError } from '../lib/output.js';
import { estimateNodesTokens } from '../lib/token-counter.js';

interface SearchResult {
  node: {
    id: string;
    label: string;
    type: string;
    content: string;
    confidence?: string;
    tags?: string[];
  };
  score: number;
}

export function searchCommand(): Command {
  return new Command('search')
    .description('Vector + graph search across indexed repos')
    .argument('<query>', 'Free-text query')
    .option('-r, --repo <id>', 'Limit to a specific repo')
    .option('-b, --budget <tokens>', 'Token budget', (v) => parseInt(v, 10), 2000)
    .option(
      '-c, --confidence <level>',
      'Filter by confidence (EXTRACTED|INFERRED|SPECULATIVE)',
    )
    .option('--json', 'Output raw JSON')
    .option('--agent', 'Compact format suitable for pasting into AI chat')
    .action(
      async (
        query: string,
        opts: {
          repo?: string;
          budget?: number;
          confidence?: string;
          json?: boolean;
          agent?: boolean;
        },
      ) => {
        const client = createClient();
        const spinner = ora(`Searching for ${chalk.cyan(query)}…`).start();
        try {
          const { data } = await client.get<SearchResult[]>('/search', {
            params: {
              q: query,
              repoId: opts.repo,
              budget: opts.budget,
              minConfidence: opts.confidence,
            },
          });
          spinner.stop();

          if (opts.json) {
            console.log(JSON.stringify(data, null, 2));
            return;
          }

          if (opts.agent) {
            console.log(`# TRCHAT Search Results\nQuery: "${query}"\n`);
            data.forEach((r, i) => {
              console.log(
                `## [${i + 1}] ${r.node.label} (${r.node.type}) — ${(r.score * 100).toFixed(0)}%`,
              );
              console.log(r.node.content);
              if (r.node.tags?.length)
                console.log(`Tags: ${r.node.tags.join(', ')}`);
              console.log();
            });
            return;
          }

          if (!data.length) {
            console.log(chalk.dim('No results.'));
            return;
          }
          data.forEach((r, i) => {
            console.log(
              `${chalk.bold(`[${i + 1}]`)} ${chalk.cyan(r.node.label)} ` +
                `${chalk.dim(`(${r.node.type})`)} ` +
                `${chalk.green(`${(r.score * 100).toFixed(0)}%`)} ` +
                confidenceBadge(r.node.confidence),
            );
            console.log(`    ${r.node.content.slice(0, 200)}`);
          });
          const tokens = estimateNodesTokens(data.map((r) => r.node));
          console.log(
            chalk.dim(
              `\n${data.length} result(s) · ~${tokens} tokens · budget ${opts.budget}`,
            ),
          );
        } catch (e) {
          spinner.stop();
          const err = e as {
            response?: { data?: { message?: string } };
            message?: string;
          };
          printError(
            'Search failed',
            err.response?.data?.message ?? err.message,
          );
          process.exit(1);
        }
      },
    );
}
