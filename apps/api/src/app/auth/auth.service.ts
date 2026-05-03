import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AppUser, AuthenticatedUser } from '@vectorgraph/shared-types';
import { v4 as uuid } from 'uuid';
import { PasswordService } from '../common/auth/password.service';
import { SessionTokenService } from '../common/auth/session-token.service';
import { UsersRepository } from '../users/users.repository';
import { UsersService } from '../users/users.service';
import { GithubAuthDto } from './dto/github-auth.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

type GithubUserResponse = {
  id: number;
  login: string;
  name: string | null;
  avatar_url?: string;
};

type GithubEmailResponse = {
  email: string;
  primary: boolean;
  verified: boolean;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly usersService: UsersService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionTokenService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email is already registered.');
    }

    const now = new Date().toISOString();
    const user: AppUser & { passwordHash: string } = {
      id: uuid(),
      email: dto.email,
      name: dto.name.trim(),
      authProvider: 'local',
      themePreference: 'system',
      createdAt: now,
      updatedAt: now,
      passwordHash: this.passwords.hash(dto.password),
    };

    await this.users.create(user);
    return this.buildAuthResponse(this.usersService.toPublicUser(user)!);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email);
    if (
      !user?.passwordHash ||
      !this.passwords.verify(dto.password, user.passwordHash)
    ) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.buildAuthResponse(this.usersService.toPublicUser(user)!);
  }

  async github(dto: GithubAuthDto) {
    const githubUser = await this.fetchGithubUser(dto.accessToken);
    const email = await this.fetchGithubPrimaryEmail(
      dto.accessToken,
      githubUser.login,
    );
    const existingByGithub = await this.users.findByGithubId(
      String(githubUser.id),
    );
    const existingByEmail = email ? await this.users.findByEmail(email) : null;
    const existing = existingByGithub ?? existingByEmail;
    const now = new Date().toISOString();

    if (existing) {
      const updated = await this.users.update(existing.id, {
        email: email ?? existing.email,
        name: githubUser.name?.trim() || existing.name,
        authProvider: 'github',
        themePreference: existing.themePreference ?? 'system',
        githubId: String(githubUser.id),
        githubLogin: githubUser.login,
        avatarUrl: githubUser.avatar_url ?? existing.avatarUrl,
        updatedAt: now,
      });

      return this.buildAuthResponse(this.usersService.toPublicUser(updated)!);
    }

    const user: AppUser = {
      id: uuid(),
      email: email ?? `${githubUser.login}@users.noreply.github.com`,
      name: githubUser.name?.trim() || githubUser.login,
      authProvider: 'github',
      themePreference: 'system',
      githubId: String(githubUser.id),
      githubLogin: githubUser.login,
      avatarUrl: githubUser.avatar_url,
      createdAt: now,
      updatedAt: now,
    };

    await this.users.create(user);
    return this.buildAuthResponse(this.usersService.toPublicUser(user)!);
  }

  session(user: AuthenticatedUser) {
    return { authenticated: true, user };
  }

  private buildAuthResponse(user: AuthenticatedUser) {
    return {
      user,
      sessionToken: this.sessions.sign(user),
    };
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

  private async fetchGithubPrimaryEmail(
    accessToken: string,
    login: string,
  ): Promise<string> {
    const response = await fetch('https://api.github.com/user/emails', {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return `${login}@users.noreply.github.com`;
    }

    const emails = (await response.json()) as GithubEmailResponse[];
    return (
      emails.find(
        (email) =>
          email.primary &&
          email.verified &&
          !email.email.endsWith('@users.noreply.github.com'),
      )?.email ??
      emails.find(
        (email) =>
          email.verified && !email.email.endsWith('@users.noreply.github.com'),
      )?.email ??
      emails.find((email) => email.primary && email.verified)?.email ??
      emails.find((email) => email.verified)?.email ??
      `${login}@users.noreply.github.com`
    );
  }
}
