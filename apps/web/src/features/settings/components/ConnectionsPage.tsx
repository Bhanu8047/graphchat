'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge } from '../../../components/atoms/Badge';
import { Button, buttonStyles } from '../../../components/atoms/Button';
import { Surface } from '../../../components/atoms/Surface';
import { Notice } from '../../../components/molecules/Notice';

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

export function ConnectionsPage() {
  const searchParams = useSearchParams();
  const [session, setSession] = useState<GithubSession>({
    authenticated: false,
    configured: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const res = await fetch('/api/auth/github/session');
      setSession(await res.json());
    } catch {
      setSession({ authenticated: false, configured: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const githubAuth = searchParams.get('githubAuth');
    if (!githubAuth) return;
    if (githubAuth === 'connected') {
      setError('');
      refresh();
      return;
    }
    const messages: Record<string, string> = {
      'config-error':
        'GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.',
      'state-error':
        'GitHub sign-in could not be verified. Try the login flow again.',
      'token-error':
        'GitHub did not return an access token. Check your OAuth app configuration.',
    };
    setError(messages[githubAuth] ?? `GitHub sign-in failed: ${githubAuth}`);
  }, [searchParams]);

  const disconnect = async () => {
    await fetch('/api/auth/github/logout', { method: 'POST' });
    setSession({ authenticated: false, configured: session.configured });
  };

  return (
    <div className="space-y-6">
      <Surface tone="soft" padding="lg">
        <Badge>Connections</Badge>
        <h2 className="mt-2 font-display text-3xl text-foreground">
          Connected accounts
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Link third-party providers used by trchat to import code and identity.
        </p>
      </Surface>

      {error ? <Notice tone="error">{error}</Notice> : null}

      <Surface tone="default" padding="lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-medium text-foreground">GitHub</div>
            {loading ? (
              <p className="text-sm text-muted-foreground">Checking…</p>
            ) : session.authenticated ? (
              <p className="text-sm text-muted-foreground">
                Signed in as{' '}
                <a
                  href={session.user?.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:text-primary/80"
                >
                  @{session.user?.login}
                </a>
                {session.canImportPrivateRepos
                  ? '. Private repositories are accessible.'
                  : '. Private-repo scope missing — sign out and sign in again, then approve the `repo` scope.'}
              </p>
            ) : session.configured ? (
              <p className="text-sm text-muted-foreground">
                Connect GitHub to import private repositories without pasting a
                token.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                GitHub login is not configured on the web server.
              </p>
            )}
            {session.authenticated && session.scopes?.length ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Scopes: {session.scopes.join(', ')}
              </p>
            ) : null}
          </div>
          <div>
            {session.authenticated ? (
              <Button tone="secondary" onClick={disconnect}>
                Disconnect
              </Button>
            ) : session.configured ? (
              <a
                href="/api/auth/github/login"
                className={buttonStyles({ tone: 'secondary' })}
              >
                Connect GitHub
              </a>
            ) : null}
          </div>
        </div>
      </Surface>
    </div>
  );
}
