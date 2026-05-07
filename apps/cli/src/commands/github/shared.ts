import chalk from 'chalk';
import { AxiosInstance } from 'axios';
import { select } from '@inquirer/prompts';
import ora from 'ora';
import { printError } from '../../lib/output.js';

export interface GithubRepo {
  full_name: string;
  description: string | null;
  private: boolean;
  default_branch: string;
  updated_at: string;
}

export interface BranchListResponse {
  fullName: string;
  defaultBranch: string;
  branches: string[];
}

export interface ImportedRepo {
  id: string;
  name: string;
}

/** Fetch repos from the API, exit(1) on error. */
export async function fetchGithubRepos(
  client: AxiosInstance,
  params: { search?: string; org?: string } = {},
): Promise<GithubRepo[]> {
  const query: Record<string, string> = {};
  if (params.search) query['search'] = params.search;
  if (params.org) query['org'] = params.org;

  const spinner = ora('Fetching GitHub repos…').start();
  try {
    const { data } = await client.get<GithubRepo[]>('/auth/github/repos', {
      params: query,
    });
    spinner.stop();
    return data;
  } catch (e) {
    spinner.stop();
    const err = e as {
      response?: { data?: { message?: string }; status?: number };
      message?: string;
    };
    if (err.response?.status === 401) {
      printError('GitHub account not connected.', 'Run: gph github login');
    } else {
      printError(
        'Failed to fetch GitHub repos',
        err.response?.data?.message ?? err.message,
      );
    }
    process.exit(1);
  }
}

/** Interactive list picker — returns the chosen repo. */
export async function pickGithubRepo(repos: GithubRepo[]): Promise<GithubRepo> {
  const picked = await select({
    message: 'Select a GitHub repository:',
    choices: repos.map((r) => ({
      name:
        chalk.bold(r.full_name) +
        (r.private ? chalk.dim(' [private]') : '') +
        (r.description ? chalk.dim(`  ${r.description}`) : ''),
      value: r.full_name,
    })),
    pageSize: 15,
  });
  const repo = repos.find((r) => r.full_name === picked);
  if (!repo) throw new Error(`Repo not found: ${picked}`);
  return repo;
}

/** Fetch branch list for a GitHub URL, exit(1) on error. */
export async function fetchBranches(
  client: AxiosInstance,
  githubUrl: string,
): Promise<BranchListResponse> {
  const spinner = ora('Fetching branches…').start();
  try {
    const { data } = await client.post<BranchListResponse>(
      '/repos/import/github/branches',
      { url: githubUrl },
    );
    spinner.stop();
    return data;
  } catch (e) {
    spinner.stop();
    const err = e as {
      response?: { data?: { message?: string }; status?: number };
      message?: string;
    };
    const status = err.response?.status;
    if (status === 401 || status === 403) {
      printError('GitHub account not connected.', 'Run: gph github login');
    } else if (status === 404) {
      printError(
        'Repository not found.',
        'If this is a private repo, connect GitHub first: gph github login',
      );
    } else {
      printError('Failed to fetch branches', err.response?.data?.message ?? err.message);
    }
    process.exit(1);
  }
}

/** Interactive branch picker — returns the chosen branch name. */
export async function pickBranch(branchList: BranchListResponse): Promise<string> {
  return select({
    message: 'Select a branch to import:',
    default: branchList.defaultBranch,
    choices: branchList.branches.map((b) => ({ name: b, value: b })),
    pageSize: 15,
  });
}

/** Call POST /repos/import/github, exit(1) on error. */
export async function importGithubRepo(
  client: AxiosInstance,
  githubUrl: string,
  branch: string,
): Promise<ImportedRepo> {
  const spinner = ora('Importing repo…').start();
  try {
    const { data } = await client.post<ImportedRepo>('/repos/import/github', {
      url: githubUrl,
      branch,
    });
    spinner.stop();
    return data;
  } catch (e) {
    spinner.stop();
    const err = e as {
      response?: { data?: { message?: string }; status?: number };
      message?: string;
    };
    const status = err.response?.status;
    if (status === 401 || status === 403) {
      printError('GitHub account not connected.', 'Run: gph github login');
    } else if (status === 404) {
      printError(
        'Repository not found.',
        'If this is a private repo, connect GitHub first: gph github login',
      );
    } else {
      printError('Import failed', err.response?.data?.message ?? err.message);
    }
    process.exit(1);
  }
}
