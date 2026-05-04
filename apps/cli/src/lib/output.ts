import chalk from 'chalk';

export function printSuccess(message: string, detail?: string): void {
  console.log(`${chalk.green('✓')} ${message}`);
  if (detail) console.log(`  ${chalk.dim(detail)}`);
}

export function printError(message: string, detail?: string): void {
  console.error(`${chalk.red('✗')} ${message}`);
  if (detail) console.error(`  ${chalk.dim(detail)}`);
}

export function printWarn(message: string, detail?: string): void {
  console.warn(`${chalk.yellow('!')} ${message}`);
  if (detail) console.warn(`  ${chalk.dim(detail)}`);
}

export function printSeparator(label?: string): void {
  const line = '─'.repeat(60);
  if (label) {
    console.log(chalk.dim(`\n── ${label} ${line.slice(label.length + 4)}`));
  } else {
    console.log(chalk.dim(line));
  }
}

const CONFIDENCE_BADGES: Record<string, string> = {
  EXTRACTED: chalk.green('●EXTRACTED'),
  INFERRED: chalk.yellow('●INFERRED'),
  SPECULATIVE: chalk.gray('●SPECULATIVE'),
};

export function confidenceBadge(level?: string): string {
  if (!level) return '';
  return CONFIDENCE_BADGES[level] ?? chalk.dim(`●${level}`);
}
