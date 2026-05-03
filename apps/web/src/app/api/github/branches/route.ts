import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  githubAccessTokenCookie,
  getServerApiBaseUrl,
} from '../../../../lib/github-auth';
import { appSessionCookie } from '../../../../features/auth/lib/auth-session';

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(githubAccessTokenCookie)?.value;
  const sessionToken = cookieStore.get(appSessionCookie)?.value;
  const body = await request.json();
  const apiResponse = await fetch(
    `${getServerApiBaseUrl()}/repos/import/github/branches`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sessionToken
          ? { Cookie: `${appSessionCookie}=${sessionToken}` }
          : {}),
      },
      body: JSON.stringify({
        url: body.url,
        accessToken,
      }),
    },
  );

  const responseText = await apiResponse.text();

  return new NextResponse(responseText, {
    status: apiResponse.status,
    headers: {
      'Content-Type':
        apiResponse.headers.get('content-type') ?? 'application/json',
    },
  });
}
