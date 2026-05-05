import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { Public } from '../common/auth/public.decorator';
import { AuthenticatedUser } from '@trchat/shared-types';
import { ApiKeysService } from './api-keys.service';
import { AuthService } from './auth.service';
import {
  CreateApiKeyDto,
  ExchangeApiKeyDto,
  RefreshTokenDto,
} from './dto/api-key.dto';
import { GithubAuthDto } from './dto/github-auth.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly apiKeys: ApiKeysService,
  ) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Post('github')
  github(@Body() dto: GithubAuthDto) {
    return this.auth.github(dto);
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
  @Post('exchange')
  exchange(@Body() dto: ExchangeApiKeyDto) {
    return this.apiKeys.exchange(dto.api_key);
  }

  /** Public: trade a refresh token for a new access token. */
  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.apiKeys.refreshAccess(dto.refresh_token);
  }

  /** Public: revoke a refresh token (CLI logout). Best-effort. */
  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Body() dto: RefreshTokenDto) {
    await this.apiKeys.revokeRefreshToken(dto.refresh_token);
  }
}
