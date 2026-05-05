import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiKey,
  ApiKeySummary,
  ApiTokenResponse,
  RefreshTokenRecord,
} from '@graphchat/shared-types';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { v4 as uuid } from 'uuid';
import { ApiAccessTokenService } from './api-access-token.service';
import { ApiKeysRepository } from './api-keys.repository';
import { RefreshTokensRepository } from './refresh-tokens.repository';

const KEY_PREFIX = 'sk-graphchat-';
const KEY_ID_BYTES = 12; // 24 hex chars
const KEY_SECRET_BYTES = 24; // 48 hex chars
const REFRESH_BYTES = 32; // opaque token, 64 hex chars
const KEY_REGEX = /^sk-graphchat-([a-f0-9]{24})\.([a-f0-9]{48})$/;
// Generic message used for every auth failure so callers cannot distinguish
// between a malformed key, an unknown keyId, or a wrong secret.
const INVALID_KEY_MESSAGE = 'Invalid API key.';
// Pre-computed hash of an unrelated random secret. Used as a constant-time
// dummy verification target when the keyId is unknown so that the attacker
// cannot enumerate valid keyIds via response timing.
const DUMMY_SECRET_HASH = (() => {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(
    randomBytes(KEY_SECRET_BYTES).toString('hex'),
    salt,
    64,
  ).toString('hex');
  return `${salt}:${derived}`;
})();

interface CreateKeyResult {
  apiKey: ApiKey;
  fullKey: string; // shown ONCE
}

@Injectable()
export class ApiKeysService {
  private readonly refreshTtlDays: number;

  constructor(
    private readonly keys: ApiKeysRepository,
    private readonly refresh: RefreshTokensRepository,
    private readonly accessTokens: ApiAccessTokenService,
    config: ConfigService,
  ) {
    this.refreshTtlDays = parseInt(
      config.get<string>('REFRESH_TOKEN_EXPIRES_DAYS') ?? '30',
      10,
    );
  }

  /** Mint a new API key for the given user. The plaintext is shown ONCE. */
  async create(
    userId: string,
    label: string,
    scopes: string[] = ['read', 'write', 'analyze'],
  ): Promise<CreateKeyResult> {
    const keyId = randomBytes(KEY_ID_BYTES).toString('hex');
    const secret = randomBytes(KEY_SECRET_BYTES).toString('hex');
    const fullKey = `${KEY_PREFIX}${keyId}.${secret}`;
    const apiKey: ApiKey = {
      id: uuid(),
      keyId,
      secretHash: this.hashSecret(secret),
      userId,
      label: label.trim() || 'API key',
      scopes,
      createdAt: new Date().toISOString(),
    };
    await this.keys.create(apiKey);
    return { apiKey, fullKey };
  }

  /**
   * Mint a new API key for the user and immediately issue an access + refresh
   * token pair without round-tripping through the public exchange path.
   * Used by the CLI web-auth (device-code) flow on approval.
   */
  async createAndIssue(
    userId: string,
    label: string,
    scopes: string[] = ['read', 'write', 'analyze'],
  ): Promise<ApiTokenResponse> {
    const { apiKey } = await this.create(userId, label, scopes);
    return this.issueTokenPair(apiKey);
  }

  list(userId: string): Promise<ApiKeySummary[]> {
    return this.keys.listByUser(userId) as unknown as Promise<ApiKeySummary[]>;
  }

  async revoke(id: string, userId: string): Promise<void> {
    const result = await this.keys.delete(id, userId);
    if (result.deletedCount === 0) {
      throw new NotFoundException('API key not found.');
    }
    await this.refresh.deleteByApiKey(id);
  }

  /**
   * Exchange a raw `sk-graphchat-...` API key for an access + refresh token pair.
   *
   * Uses a single generic error message for every failure mode (bad format,
   * unknown keyId, wrong secret) and always performs a hash verification so
   * that the response time does not leak which branch was taken.
   */
  async exchange(rawKey: string): Promise<ApiTokenResponse> {
    const match = KEY_REGEX.exec(rawKey);
    if (!match) {
      // Still burn time on a dummy verification so total request duration
      // matches the path taken when the regex matches but the key is wrong.
      this.verifySecret('invalid', DUMMY_SECRET_HASH);
      throw new UnauthorizedException(INVALID_KEY_MESSAGE);
    }
    const [, keyId, secret] = match;
    const stored = await this.keys.findByKeyId(keyId);
    if (!stored) {
      // Verify against a dummy hash so unknown-keyId timing matches
      // wrong-secret timing.
      this.verifySecret(secret, DUMMY_SECRET_HASH);
      throw new UnauthorizedException(INVALID_KEY_MESSAGE);
    }
    if (!this.verifySecret(secret, stored.secretHash)) {
      throw new UnauthorizedException(INVALID_KEY_MESSAGE);
    }
    await this.keys.touch(stored.id);
    return this.issueTokenPair(stored);
  }

  /**
   * Exchange a refresh token for a fresh access token. Returns ONLY the new
   * access token (the refresh token is reused until expiry).
   */
  async refreshAccess(rawRefresh: string): Promise<{
    access_token: string;
    expires_in: number;
    token_type: 'Bearer';
  }> {
    const tokenHash = this.hashOpaqueToken(rawRefresh);
    const record = await this.refresh.findByHash(tokenHash);
    if (!record) {
      throw new UnauthorizedException('Refresh token invalid or expired.');
    }
    if (record.expiresAt.getTime() < Date.now()) {
      await this.refresh.deleteByHash(tokenHash);
      throw new UnauthorizedException('Refresh token expired.');
    }
    const apiKey = await this.keys.findById(record.apiKeyId);
    if (!apiKey) {
      // API key was revoked.
      await this.refresh.deleteByHash(tokenHash);
      throw new UnauthorizedException('API key has been revoked.');
    }
    const { token, expiresIn } = this.accessTokens.sign({
      sub: apiKey.userId,
      apiKeyId: apiKey.id,
      scopes: apiKey.scopes,
    });
    return {
      access_token: token,
      expires_in: expiresIn,
      token_type: 'Bearer',
    };
  }

  /** Revoke a refresh token (logout). Best-effort: missing tokens succeed. */
  async revokeRefreshToken(rawRefresh: string): Promise<void> {
    if (!rawRefresh) return;
    await this.refresh.deleteByHash(this.hashOpaqueToken(rawRefresh));
  }

  private async issueTokenPair(apiKey: ApiKey): Promise<ApiTokenResponse> {
    const { token, expiresIn } = this.accessTokens.sign({
      sub: apiKey.userId,
      apiKeyId: apiKey.id,
      scopes: apiKey.scopes,
    });
    const refreshToken = randomBytes(REFRESH_BYTES).toString('hex');
    const record: RefreshTokenRecord = {
      tokenHash: this.hashOpaqueToken(refreshToken),
      userId: apiKey.userId,
      apiKeyId: apiKey.id,
      expiresAt: new Date(
        Date.now() + this.refreshTtlDays * 24 * 60 * 60 * 1000,
      ),
      createdAt: new Date().toISOString(),
    };
    await this.refresh.create(record);
    return {
      access_token: token,
      refresh_token: refreshToken,
      expires_in: expiresIn,
      token_type: 'Bearer',
    };
  }

  private hashSecret(secret: string): string {
    const salt = randomBytes(16).toString('hex');
    const derived = scryptSync(secret, salt, 64).toString('hex');
    return `${salt}:${derived}`;
  }

  private verifySecret(secret: string, encoded: string): boolean {
    const [salt, expected] = encoded.split(':');
    if (!salt || !expected) return false;
    const actual = scryptSync(secret, salt, 64);
    const expectedBuffer = Buffer.from(expected, 'hex');
    return (
      actual.length === expectedBuffer.length &&
      timingSafeEqual(actual, expectedBuffer)
    );
  }

  /** SHA-256 is sufficient for high-entropy opaque tokens. */
  private hashOpaqueToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
