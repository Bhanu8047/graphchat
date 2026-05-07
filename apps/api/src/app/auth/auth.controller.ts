import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { Public } from '../common/auth/public.decorator';
import { AuthenticatedUser } from '@graphchat/shared-types';
import { ApiKeysService } from './api-keys.service';
import { AuthService } from './auth.service';
import { CliAuthService } from './cli-auth.service';
import {
  CreateApiKeyDto,
  ExchangeApiKeyDto,
  RefreshTokenDto,
} from './dto/api-key.dto';
import { CliApproveDto, CliPollDto } from './dto/cli-auth.dto';
import { GithubCliPollDto } from './dto/github-device-flow.dto';
import { GithubAuthDto } from './dto/github-auth.dto';
import { GithubDeviceFlowService } from './github-device-flow.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

// Strict per-IP throttle for credential-bearing endpoints.
const AUTH_THROTTLE = { auth: { limit: 10, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly apiKeys: ApiKeysService,
    private readonly cliAuth: CliAuthService,
    private readonly githubDeviceFlow: GithubDeviceFlowService,
  ) {}

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('github')
  github(@Body() dto: GithubAuthDto) {
    return this.auth.github(dto);
  }

  /**
   * Authed: link a GitHub identity to the currently signed-in user.
   * Unlike `POST /auth/github`, this does NOT mint a new session — it only
   * attaches the GitHub account to the existing one so connecting from
   * Settings doesn't kick the user out of their current account.
   */
  @Throttle(AUTH_THROTTLE)
  @Post('github/link')
  githubLink(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GithubAuthDto,
  ) {
    return this.auth.linkGithub(user.id, dto);
  }

  @Get('session')
  session(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.session(user);
  }

  // ── CLI authentication ──────────────────────────────────────────────────────

  /** Mint a new API key for the current user. The plaintext is shown ONCE. */
  @Post('keys')
  async createKey(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateApiKeyDto,
  ) {
    const { apiKey, fullKey } = await this.apiKeys.create(
      user.id,
      dto.label,
      dto.scopes,
    );
    return {
      key: fullKey,
      keyId: apiKey.keyId,
      label: apiKey.label,
      scopes: apiKey.scopes,
      createdAt: apiKey.createdAt,
    };
  }

  @Get('keys')
  listKeys(@CurrentUser() user: AuthenticatedUser) {
    return this.apiKeys.list(user.id);
  }

  @Delete('keys/:id')
  @HttpCode(204)
  async deleteKey(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.apiKeys.revoke(id, user.id);
  }

  /** Public: trade an API key for a fresh access + refresh token pair. */
  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('exchange')
  exchange(@Body() dto: ExchangeApiKeyDto) {
    return this.apiKeys.exchange(dto.api_key);
  }

  /** Public: trade a refresh token for a new access token. */
  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.apiKeys.refreshAccess(dto.refresh_token);
  }

  // ── CLI web-auth (device-code) flow ─────────────────────────────────────────

  /** Public: CLI starts a device-code session. Returns the user_code to show. */
  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('cli/start')
  cliStart() {
    return this.cliAuth.start();
  }

  /** Authed (browser session): user approves a pending CLI code. */
  @Post('cli/approve')
  @HttpCode(204)
  async cliApprove(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CliApproveDto,
  ) {
    await this.cliAuth.approve(dto.user_code, user.id);
  }

  /** Public: CLI polls with the device_code until the user approves. */
  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('cli/poll')
  cliPoll(@Body() dto: CliPollDto) {
    return this.cliAuth.poll(dto.device_code);
  }

  /** Public: revoke a refresh token (CLI logout). Best-effort. */
  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Body() dto: RefreshTokenDto) {
    await this.apiKeys.revokeRefreshToken(dto.refresh_token);
  }

  // ── GitHub CLI device flow ───────────────────────────────────────────────────

  /** Public: start GitHub device flow, returns codes for user to visit github.com. */
  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('github/cli/start')
  githubCliStart() {
    return this.githubDeviceFlow.startDeviceFlow();
  }

  /** Authed: poll GitHub for token; saves access token to user on success. */
  @Throttle(AUTH_THROTTLE)
  @Post('github/cli/poll')
  githubCliPoll(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GithubCliPollDto,
  ) {
    return this.githubDeviceFlow.pollDeviceFlow(dto.device_code, user.id);
  }

  /** Authed: list the current user's GitHub repos using stored token. */
  @Get('github/repos')
  async githubRepos(
    @CurrentUser() user: AuthenticatedUser,
    @Query('search') search?: string,
    @Query('org') org?: string,
    @Query('page') page = 1,
  ) {
    return this.githubDeviceFlow.listRepos(user.id, {
      search,
      org,
      page: Number(page),
    });
  }
}
