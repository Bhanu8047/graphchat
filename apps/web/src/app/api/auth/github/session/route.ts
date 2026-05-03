import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  githubAccessTokenCookie,
  getGithubOauthConfig,
} from '../../../../../lib/github-auth';

type GithubUserResponse = {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
};

export async function GET(request: Request) {
  const { isConfigured } = getGithubOauthConfig(request.url);
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(githubAccessTokenCookie)?.value;

  if (!accessToken) {
    return NextResponse.json({
      authenticated: false,
      configured: isConfigured,
    });
  }

  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!userResponse.ok) {
    cookieStore.delete(githubAccessTokenCookie);
    return NextResponse.json({
      authenticated: false,
      configured: isConfigured,
    });
  }

  const user = (await userResponse.json()) as GithubUserResponse;
  const scopes =
    userResponse.headers
      .get('x-oauth-scopes')
      ?.split(',')
      .map((scope) => scope.trim())
      .filter(Boolean) ?? [];
  const canImportPrivateRepos = scopes.includes('repo');

  return NextResponse.json({
    authenticated: true,
    configured: isConfigured,
    scopes,
    canImportPrivateRepos,
    user: {
      login: user.login,
      name: user.name,
      avatarUrl: user.avatar_url,
      profileUrl: user.html_url,
    },
  });
}
