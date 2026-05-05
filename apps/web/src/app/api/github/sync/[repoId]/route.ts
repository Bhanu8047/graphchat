import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  githubAccessTokenCookie,
  getServerApiBaseUrl,
} from '../../../../../lib/github-auth';
import { appSessionCookie } from '../../../../../features/auth/lib/auth-session';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ repoId: string }> },
) {
  const { repoId } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(githubAccessTokenCookie)?.value;
  const sessionToken = cookieStore.get(appSessionCookie)?.value;
  const body = await request.json().catch(() => ({}));

  const apiResponse = await fetch(
    `${getServerApiBaseUrl()}/graphs/${repoId}/sync/github`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sessionToken
          ? { Cookie: `${appSessionCookie}=${sessionToken}` }
          : {}),
      },
      body: JSON.stringify({ ...body, accessToken }),
    },
  );

  const text = await apiResponse.text();
  return new NextResponse(text, {
    status: apiResponse.status,
    headers: {
      'Content-Type':
        apiResponse.headers.get('content-type') ?? 'application/json',
    },
  });
}
