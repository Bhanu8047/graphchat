import chalk from 'chalk';
import { config } from './config.js';

/**
 * Resolve the repo id for a command: explicit `-r/--repo` wins, otherwise
 * fall back to the config-selected repo. Exits with a helpful message if
 * neither is available.
 */
export function resolveRepoId(explicit?: string): string {
  if (explicit) return explicit;
  const selected = config.get('selectedRepoId');
  if (selected) return selected;
  console.error(
    chalk.red('No repo selected.') +
      `\n  Pick one with ${chalk.cyan('gph use')} or pass ${chalk.cyan('-r <id>')}.`,
  );
  process.exit(1);
}

export function getSelectedRepoId(): string | undefined {
  return config.get('selectedRepoId');
}

export function setSelectedRepoId(id: string): void {
  config.set('selectedRepoId', id);
}

export function clearSelectedRepoId(): void {
  config.delete('selectedRepoId');
}
