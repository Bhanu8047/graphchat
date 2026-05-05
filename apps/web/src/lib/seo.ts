const DEFAULT_SITE_URL = 'http://localhost:3000';

function normalizeSiteUrl(url: URL): URL {
  url.pathname = '/';
  url.search = '';
  url.hash = '';
  return url;
}

export function getSiteUrl(): URL {
  const canonicalHost = process.env.APP_CANONICAL_HOST?.trim().toLowerCase();
  if (canonicalHost) {
    return normalizeSiteUrl(new URL(`https://${canonicalHost}`));
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    try {
      return normalizeSiteUrl(new URL(appUrl));
    } catch {
      // Fall through to localhost when the env value is malformed.
    }
  }

  return normalizeSiteUrl(new URL(DEFAULT_SITE_URL));
}

export function getSiteOrigin(): string {
  return getSiteUrl().toString().replace(/\/$/, '');
}

export function resolveSiteUrl(pathname: string): string {
  return new URL(pathname, getSiteUrl()).toString();
}
