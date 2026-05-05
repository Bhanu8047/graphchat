'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AgentType,
  GithubBranchListResponse,
  RuntimeProviderConfig,
} from '@graphchat/shared-types';
import { Button, buttonStyles } from '../../../components/atoms/Button';
import { Input } from '../../../components/atoms/Input';
import { Select } from '../../../components/atoms/Select';
import { Surface } from '../../../components/atoms/Surface';
import { Notice } from '../../../components/molecules/Notice';
import { PageIntro } from '../../../components/molecules/PageIntro';
import { api } from '../../../lib/api';
import { cn } from '../../../lib/ui';

type GithubSession = {
  authenticated: boolean;
  configured: boolean;
  scopes?: string[];
  canImportPrivateRepos?: boolean;
  user?: {
    login: string;
    name: string | null;
    avatarUrl: string;
    profileUrl: string;
  };
};

export function RepositoriesPage() {
  const searchParams = useSearchParams();
  const [repos, setRepos] = useState<any[]>([]);
  const [githubForm, setGithubForm] = useState<{
    url: string;
    branch: string;
    agent: AgentType;
  }>({ url: '', branch: '', agent: 'all' });
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [syncingRepoId, setSyncingRepoId] = useState('');
  const [githubSession, setGithubSession] = useState<GithubSession>({
    authenticated: false,
    configured: false,
  });
  const [runtimeConfig, setRuntimeConfig] =
    useState<RuntimeProviderConfig | null>(null);
  const [githubBranches, setGithubBranches] =
    useState<GithubBranchListResponse | null>(null);
  const [branchesLoading, setBranchesLoading] = useState(false);

  const load = () =>
    api.repos
      .list()
      .then(setRepos)
      .catch(() => {
        /* ignored */
      });

  const refreshGithubSession = async () => {
    const response = await fetch('/api/auth/github/session');
    const payload = await response.json();
    setGithubSession(payload);
  };

  useEffect(() => {
    load();
    api.runtime
      .config()
      .then((config: RuntimeProviderConfig) => {
        setRuntimeConfig(config);
        if (config.defaultAgent) {
          setGithubForm((current) => ({
            ...current,
            agent: config.defaultAgent!,
          }));
        }
      })
      .catch(() => {
        setRuntimeConfig(null);
      });
    refreshGithubSession().catch(() => {
      setGithubSession({ authenticated: false, configured: false });
    });
  }, []);

  useEffect(() => {
    const githubAuth = searchParams.get('githubAuth');

    if (githubAuth === 'connected') {
      setError('');
      refreshGithubSession().catch(() => {
        setGithubSession({ authenticated: false, configured: false });
      });
      return;
    }

    if (githubAuth === 'config-error') {
      setError(
        'GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET for the web app.',
      );
      return;
    }

    if (githubAuth === 'state-error') {
      setError(
        'GitHub sign-in could not be verified. Try the login flow again.',
      );
      return;
    }

    if (githubAuth === 'token-error') {
      setError(
        'GitHub did not return an access token. Check your OAuth app configuration and try again.',
      );
      return;
    }

    if (githubAuth && githubAuth !== 'connected') {
      setError(`GitHub sign-in failed: ${githubAuth}`);
    }
  }, [searchParams]);

  const loadGithubBranches = async (inputUrl = githubForm.url) => {
    if (!inputUrl.trim()) {
      setGithubBranches(null);
      setGithubForm((current) => ({ ...current, branch: '' }));
      return;
    }

    setBranchesLoading(true);
    setError('');

    try {
      const payload = (await api.repos.listGithubBranches(
        inputUrl,
      )) as GithubBranchListResponse;
      setGithubBranches(payload);
      setGithubForm((current) => ({
        ...current,
        url: inputUrl,
        branch: payload.branches.includes(current.branch)
          ? current.branch
          : payload.defaultBranch,
      }));
    } catch (err: any) {
      setGithubBranches(null);
      setGithubForm((current) => ({ ...current, branch: '' }));
      setError(err.message ?? 'Unable to load branches for this repository');
    } finally {
      setBranchesLoading(false);
    }
  };

  const importGithubRepo = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setImporting(true);

    try {
      await api.repos.importGithub({
        url: githubForm.url,
        branch: githubForm.branch,
        agent: githubForm.agent,
      });
      setGithubForm({ url: '', branch: '', agent: githubForm.agent });
      setGithubBranches(null);
      load();
    } catch (err: any) {
      const message = err.message ?? 'Unable to import GitHub repository';
      setError(message);

      if (
        message.includes('missing the `repo` scope') ||
        message.includes('login expired') ||
        message.includes('token is invalid')
      ) {
        refreshGithubSession().catch(() => {
          setGithubSession({
            authenticated: false,
            configured: githubSession.configured,
          });
        });
      }
    } finally {
      setImporting(false);
    }
  };

  const syncRepo = async (id: string) => {
    setError('');
    setSyncingRepoId(id);
    try {
      await api.graph.syncGithub(id);
      await load();
    } catch (err: any) {
      setError(err.message ?? 'Unable to sync graph');
    } finally {
      setSyncingRepoId('');
    }
  };

  const deleteRepo = async (id: string) => {
    await api.repos.delete(id);
    load();
  };

  return (
    <div className="space-y-6">
      <Surface tone="hero" padding="xl">
        <PageIntro
          eyebrow="Import flow"
          title="Bring GitHub repositories into your graph workspace"
          description="Choose a repository, select a branch, and build an owner-scoped graph that can be synced incrementally and reused across search, AI, and export flows."
          actions={
            <a
              href="/settings/connections"
              className={buttonStyles({ tone: 'secondary' })}
            >
              Manage GitHub connection
            </a>
          }
        />
      </Surface>

      {error ? <Notice tone="error">{error}</Notice> : null}

      <Surface tone="default" padding="lg">
        <div className="text-sm leading-6 text-muted-foreground">
          {githubSession.authenticated ? (
            <div>
              Importing as{' '}
              <a
                href={githubSession.user?.profileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:text-primary/80"
              >
                @{githubSession.user?.login}
              </a>
              {githubSession.canImportPrivateRepos
                ? '. Private repositories can be imported without pasting a token.'
                : '. Private-repo scope is missing — manage your connection in Settings → Connections.'}
            </div>
          ) : githubSession.configured ? (
            <div>
              Public repositories can be imported anonymously. Sign in to GitHub
              from{' '}
              <a href="/settings/connections" className="text-primary">
                Settings → Connections
              </a>{' '}
              to import private repositories.
            </div>
          ) : (
            <div>
              GitHub login is not configured. Set GITHUB_CLIENT_ID and
              GITHUB_CLIENT_SECRET in the web environment to enable OAuth
              sign-in.
            </div>
          )}
        </div>

        <form
          onSubmit={importGithubRepo}
          className="mt-6 grid gap-3 md:grid-cols-2"
        >
          <Input
            className="md:col-span-2"
            placeholder="https://github.com/owner/repo or owner/repo"
            value={githubForm.url}
            onChange={(event) => {
              const url = event.target.value;
              setGithubForm({
                ...githubForm,
                url,
                branch: url === githubForm.url ? githubForm.branch : '',
              });
              if (githubBranches && url !== githubForm.url) {
                setGithubBranches(null);
              }
            }}
            required
          />
          <Button
            tone="secondary"
            onClick={() => loadGithubBranches()}
            disabled={branchesLoading || !githubForm.url.trim()}
          >
            {branchesLoading ? 'Loading branches...' : 'Load branches'}
          </Button>
          <Select
            value={githubForm.branch}
            onChange={(event) =>
              setGithubForm({ ...githubForm, branch: event.target.value })
            }
            disabled={!githubBranches?.branches.length}
            required
          >
            <option value="">Select branch...</option>
            {(githubBranches?.branches ?? []).map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
          </Select>
          <Select
            value={githubForm.agent}
            onChange={(event) =>
              setGithubForm({
                ...githubForm,
                agent: event.target.value as AgentType,
              })
            }
          >
            {(runtimeConfig?.agentOptions ?? []).map((agent) => (
              <option key={agent} value={agent}>
                {agent === 'gpt'
                  ? 'GPT'
                  : agent === 'all'
                    ? 'All Available'
                    : agent.charAt(0).toUpperCase() + agent.slice(1)}
              </option>
            ))}
          </Select>
          <Button
            type="submit"
            disabled={
              importing ||
              !runtimeConfig?.agentOptions?.length ||
              !githubForm.branch
            }
          >
            {importing ? 'Reading repository...' : 'Import from GitHub'}
          </Button>
        </form>

        <div className="mt-4 space-y-1 text-sm text-muted-foreground">
          <p>
            After GitHub sign-in, the browser sends only the repository URL and
            branch. The access token stays in an HttpOnly cookie on the web
            server and is forwarded server-side during import.
          </p>
          <p>
            When you create a graph for a new branch, graphchat seeds it from
            the closest existing graph for the same repository and only re-reads
            files whose GitHub blob hashes changed.
          </p>
          {githubBranches ? (
            <p>
              Default branch: {githubBranches.defaultBranch}. Each imported
              branch becomes its own stored graph.
            </p>
          ) : null}
          {runtimeConfig ? (
            <p>
              Available AI agents:{' '}
              {runtimeConfig.agentOptions.length
                ? runtimeConfig.agentOptions.join(', ')
                : 'none configured'}
            </p>
          ) : null}
          {githubSession.authenticated && githubSession.scopes?.length ? (
            <p>Granted GitHub scopes: {githubSession.scopes.join(', ')}</p>
          ) : null}
        </div>
      </Surface>

      <Surface tone="soft" padding="lg">
        <PageIntro
          eyebrow="Stored graphs"
          title={`Repositories (${repos.length})`}
          description="Your imported repositories are scoped to your account and can be synced or removed individually."
        />
        <ul className="mt-5 space-y-3">
          {repos.map((repository) => (
            <li key={repository.id}>
              <Surface tone="default" padding="md">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="font-medium text-foreground">
                      {repository.name}{' '}
                      <span className="text-xs text-muted-foreground">
                        ({repository.nodes?.length ?? 0} nodes)
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {repository.description}
                    </div>
                    {repository.source?.provider === 'github' ? (
                      <div className="text-xs text-muted-foreground">
                        <a
                          href={repository.source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:text-primary/80"
                        >
                          {repository.source.fullName}
                        </a>{' '}
                        <span>
                          {repository.source.isPrivate ? 'private' : 'public'}
                        </span>{' '}
                        <span>branch {repository.source.branch}</span>
                        {repository.sync?.lastSyncedAt ? (
                          <span>
                            {' '}
                            · synced{' '}
                            {new Date(
                              repository.sync.lastSyncedAt,
                            ).toLocaleString()}
                          </span>
                        ) : null}
                        {typeof repository.sync?.reusedPaths === 'number' &&
                        repository.sync.reusedPaths > 0 ? (
                          <span>
                            {' '}
                            · reused {repository.sync.reusedPaths} paths from an
                            existing graph
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {repository.source?.provider === 'github' ? (
                      <Button
                        tone="secondary"
                        size="sm"
                        onClick={() => syncRepo(repository.id)}
                        disabled={syncingRepoId === repository.id}
                      >
                        {syncingRepoId === repository.id
                          ? 'Syncing...'
                          : 'Sync graph'}
                      </Button>
                    ) : null}
                    <Button
                      tone="ghost"
                      size="sm"
                      className="text-danger hover:bg-[color-mix(in_oklab,var(--danger)_15%,transparent)] hover:text-danger"
                      onClick={() => deleteRepo(repository.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Surface>
            </li>
          ))}
        </ul>
      </Surface>
    </div>
  );
}
