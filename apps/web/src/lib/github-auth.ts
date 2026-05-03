import path from 'path';
import { loadEnvConfig } from '@next/env';

const GITHUB_ACCESS_TOKEN_COOKIE = 'vectorgraph_github_access_token';
const GITHUB_OAUTH_STATE_COOKIE = 'vectorgraph_github_oauth_state';

loadEnvConfig(path.resolve(process.cwd()));

export const githubAccessTokenCookie = GITHUB_ACCESS_TOKEN_COOKIE;
export const githubOauthStateCookie = GITHUB_OAUTH_STATE_COOKIE;

export function githubAuthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}

export function getAppOrigin(requestUrl: string) {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  return new URL(requestUrl).origin;
}

export function getGithubOauthConfig(requestUrl: string) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const appOrigin = getAppOrigin(requestUrl);
  const callbackUrl = `${appOrigin}/api/auth/github/callback`;

  return {
    clientId,
    clientSecret,
    appOrigin,
    callbackUrl,
    isConfigured: Boolean(clientId && clientSecret),
  };
}

export function getServerApiBaseUrl() {
  return (
    process.env.INTERNAL_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:3001/api'
  );
}
