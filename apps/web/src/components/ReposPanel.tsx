'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '../lib/api';
import { AgentType, RuntimeProviderConfig } from '@vectorgraph/shared-types';

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

export function ReposPanel() {
  const searchParams = useSearchParams();
  const [repos, setRepos] = useState<any[]>([]);
  const [githubForm, setGithubForm] = useState<{ url: string; agent: AgentType }>({ url: '', agent: 'all' });
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [githubSession, setGithubSession] = useState<GithubSession>({ authenticated: false, configured: false });
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeProviderConfig | null>(null);

  const load = () => api.repos.list().then(setRepos).catch(() => {});

  const refreshGithubSession = async () => {
    const response = await fetch('/api/auth/github/session');
    const payload = await response.json();
    setGithubSession(payload);
  };

  useEffect(() => {
    load();
    api.runtime.config().then((config: RuntimeProviderConfig) => {
      setRuntimeConfig(config);
      if (config.defaultAgent) {
        setGithubForm(current => ({ ...current, agent: config.defaultAgent! }));
      }
    }).catch(() => {
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
      setError('GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET for the web app.');
      return;
    }

    if (githubAuth === 'state-error') {
      setError('GitHub sign-in could not be verified. Try the login flow again.');
      return;
    }

    if (githubAuth === 'token-error') {
      setError('GitHub did not return an access token. Check your OAuth app configuration and try again.');
      return;
    }

    if (githubAuth && githubAuth !== 'connected') {
      setError(`GitHub sign-in failed: ${githubAuth}`);
    }
  }, [searchParams]);

  const importGithubRepo = async (e: any) => {
    e.preventDefault();
    setError('');
    setImporting(true);

    try {
      await api.repos.importGithub({
        url: githubForm.url,
        agent: githubForm.agent,
      });
      setGithubForm({ url: '', agent: githubForm.agent });
      load();
    } catch (err: any) {
      const message = err.message ?? 'Unable to import GitHub repository';
      setError(message);

      if (message.includes('missing the `repo` scope') || message.includes('login expired') || message.includes('token is invalid')) {
        refreshGithubSession().catch(() => {
          setGithubSession({ authenticated: false, configured: githubSession.configured });
        });
      }
    } finally {
      setImporting(false);
    }
  };

  const logoutGithub = async () => {
    await fetch('/api/auth/github/logout', { method: 'POST' });
    setGithubSession({ authenticated: false, configured: githubSession.configured });
  };

  const deleteRepo = async (id: string) => { await api.repos.delete(id); load(); };

  return (
    <div className="p-6 space-y-6">
      <section className="bg-slate-800 p-4 rounded">
        <h2 className="text-lg font-semibold mb-3">Import GitHub Repository</h2>
        {error ? <div className="mb-3 rounded border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">{error}</div> : null}
        <div className="mb-4 flex items-center justify-between rounded border border-slate-700 bg-slate-900/60 px-3 py-3 text-sm text-slate-300">
          <div>
            {githubSession.authenticated ? (
              <div>
                Signed in to GitHub as{' '}
                <a href={githubSession.user?.profileUrl} target="_blank" rel="noreferrer" className="text-sky-300 hover:text-sky-200">
                  @{githubSession.user?.login}
                </a>
                {githubSession.canImportPrivateRepos
                  ? '. Private repositories can be imported without pasting a token.'
                  : '. This login is missing private-repository access. Sign out and sign in again, then approve the `repo` scope.'}
              </div>
            ) : githubSession.configured ? (
              <div>Sign in with GitHub to import private repositories automatically. Public repositories can still be imported without signing in.</div>
            ) : (
              <div>GitHub login is not configured yet. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in the web environment to enable OAuth sign-in.</div>
            )}
          </div>
          {githubSession.authenticated ? (
            <button type="button" className="rounded bg-slate-700 px-3 py-2 text-slate-100 hover:bg-slate-600" onClick={logoutGithub}>Sign Out</button>
          ) : githubSession.configured ? (
            <a href="/api/auth/github/login" className="rounded bg-slate-100 px-3 py-2 text-slate-900 hover:bg-white">Sign In with GitHub</a>
          ) : null}
        </div>
        <form onSubmit={importGithubRepo} className="grid grid-cols-2 gap-2">
          <input
            className="bg-slate-700 p-2 rounded col-span-2"
            placeholder="https://github.com/owner/repo or owner/repo"
            value={githubForm.url}
            onChange={e => setGithubForm({ ...githubForm, url: e.target.value })}
            required
          />
          <select className="bg-slate-700 p-2 rounded" value={githubForm.agent} onChange={e => setGithubForm({ ...githubForm, agent: e.target.value as AgentType })}>
            {(runtimeConfig?.agentOptions ?? []).map(agent => (
              <option key={agent} value={agent}>{agent === 'gpt' ? 'GPT' : agent === 'all' ? 'All Available' : agent.charAt(0).toUpperCase() + agent.slice(1)}</option>
            ))}
          </select>
          <button className="bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={importing || !(runtimeConfig?.agentOptions?.length)}>{importing ? 'Reading Repo…' : 'Import from GitHub'}</button>
        </form>
        <p className="mt-3 text-sm text-slate-400">After GitHub sign-in, the browser sends only the repository URL. The access token stays in an HttpOnly cookie on the web server and is forwarded server-side during import.</p>
        <p className="mt-1 text-sm text-slate-400">On import, VectorGraph reads important repo files, generates graph nodes, and precomputes searchable embeddings so AI agents can use the graph with lower token cost.</p>
        {runtimeConfig ? <p className="mt-1 text-xs text-slate-500">Available AI agents: {runtimeConfig.agentOptions.length ? runtimeConfig.agentOptions.join(', ') : 'none configured'}</p> : null}
        {githubSession.authenticated && githubSession.scopes?.length ? (
          <p className="mt-1 text-xs text-slate-500">Granted GitHub scopes: {githubSession.scopes.join(', ')}</p>
        ) : null}
      </section>

      <section className="bg-slate-800 p-4 rounded">
        <h2 className="text-lg font-semibold mb-3">Repositories ({repos.length})</h2>
        <ul className="space-y-2">
          {repos.map(r => (
            <li key={r.id} className="flex items-center justify-between bg-slate-700 p-3 rounded">
              <div>
                <div className="font-medium">{r.name} <span className="text-xs text-slate-400">({r.nodes?.length ?? 0} nodes)</span></div>
                <div className="text-sm text-slate-400">{r.description}</div>
                {r.source?.provider === 'github' ? (
                  <div className="text-xs text-slate-400">
                    <a href={r.source.url} target="_blank" rel="noreferrer" className="text-sky-300 hover:text-sky-200">{r.source.fullName}</a>
                    {' '}
                    <span>{r.source.isPrivate ? 'private' : 'public'}</span>
                    {' '}
                    <span>branch {r.source.defaultBranch}</span>
                  </div>
                ) : null}
              </div>
              <button onClick={() => deleteRepo(r.id)} className="text-red-400 hover:text-red-300 text-sm">Delete</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
