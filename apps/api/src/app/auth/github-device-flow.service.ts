import {
  BadRequestException,
  GoneException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersRepository } from '../users/users.repository';

type GithubDeviceCodeResponse = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  interval: number;
  expires_in: number;
};

type GithubTokenResponse =
  | { access_token: string; token_type: string; scope: string }
  | { error: string; error_description?: string };

type GithubUserResponse = {
  login: string;
  name: string | null;
  avatar_url: string;
};

export type GithubDeviceFlowStartResult = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  interval: number;
  expires_in: number;
};

export type GithubDeviceFlowPollResult =
  | { pending: true }
  | { connected: true; github_username: string; avatar_url: string };

@Injectable()
export class GithubDeviceFlowService {
  private readonly clientId: string;

  constructor(
    private readonly users: UsersRepository,
    config: ConfigService,
  ) {
    this.clientId = config.getOrThrow<string>('GITHUB_CLIENT_ID');
  }

  async startDeviceFlow(): Promise<GithubDeviceFlowStartResult> {
    const response = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        scope: 'repo read:user',
      }),
    });

    if (!response.ok) {
      throw new InternalServerErrorException(
        'Failed to start GitHub device flow.',
      );
    }

    const data = (await response.json()) as GithubDeviceCodeResponse;
    return {
      device_code: data.device_code,
      user_code: data.user_code,
      verification_uri: data.verification_uri,
      interval: data.interval,
      expires_in: data.expires_in,
    };
  }

  async pollDeviceFlow(
    deviceCode: string,
    userId: string,
  ): Promise<GithubDeviceFlowPollResult> {
    const response = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.clientId,
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        }),
      },
    );

    if (!response.ok) {
      throw new InternalServerErrorException(
        'Failed to poll GitHub device flow.',
      );
    }

    const data = (await response.json()) as GithubTokenResponse;

    if ('error' in data) {
      switch (data.error) {
        case 'authorization_pending':
          return { pending: true };
        case 'slow_down':
          return { pending: true };
        case 'expired_token':
          throw new GoneException(
            'Device flow session expired. Please start again.',
          );
        case 'access_denied':
          throw new UnauthorizedException('GitHub access denied by user.');
        default:
          throw new BadRequestException(
            data.error_description ?? 'GitHub device flow error.',
          );
      }
    }

    const githubUser = await this.fetchGithubUser(data.access_token);

    await this.users.update(userId, {
      githubAccessToken: data.access_token,
      githubLogin: githubUser.login,
      avatarUrl: githubUser.avatar_url,
    });

    return {
      connected: true,
      github_username: githubUser.login,
      avatar_url: githubUser.avatar_url,
    };
  }

  async listRepos(
    userId: string,
    opts: { search?: string; org?: string; page: number },
  ) {
    const user = await this.users.findById(userId);
    if (!user?.githubAccessToken) {
      throw new UnauthorizedException(
        'GitHub account not connected. Run: gph github login',
      );
    }

    const url = new URL(
      opts.org
        ? `https://api.github.com/orgs/${encodeURIComponent(opts.org)}/repos`
        : 'https://api.github.com/user/repos',
    );
    url.searchParams.set('per_page', '30');
    url.searchParams.set('page', String(opts.page));
    url.searchParams.set('sort', 'updated');
    if (!opts.org) {
      url.searchParams.set(
        'affiliation',
        'owner,collaborator,organization_member',
      );
    }

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${user.githubAccessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new UnauthorizedException(
          'GitHub token is invalid or expired. Run: gph github login',
        );
      }
      if (response.status === 403) {
        throw new UnauthorizedException(
          'GitHub access denied. Token may lack required scopes. Run: gph github login',
        );
      }
      throw new InternalServerErrorException('Failed to fetch GitHub repos.');
    }

    type GithubRepo = {
      full_name: string;
      description: string | null;
      private: boolean;
      default_branch: string;
      updated_at: string;
    };

    const repos = (await response.json()) as GithubRepo[];

    const { search } = opts;
    const filtered = search
      ? repos.filter((r) =>
          r.full_name.toLowerCase().includes(search.toLowerCase()),
        )
      : repos;

    return filtered.map((r) => ({
      full_name: r.full_name,
      description: r.description,
      private: r.private,
      default_branch: r.default_branch,
      updated_at: r.updated_at,
    }));
  }

  private async fetchGithubUser(
    accessToken: string,
  ): Promise<GithubUserResponse> {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new UnauthorizedException('GitHub token is invalid or expired.');
    }

    return response.json() as Promise<GithubUserResponse>;
  }
}
