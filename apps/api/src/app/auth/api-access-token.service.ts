import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiAccessTokenPayload } from '@vectorgraph/shared-types';
import jwt from 'jsonwebtoken';

/**
 * Short-lived (default 15 min) bearer JWT minted in exchange for an API key.
 * Distinct from the long-lived browser session token; CLI clients pair it with
 * an opaque refresh token persisted in MongoDB.
 */
@Injectable()
export class ApiAccessTokenService {
  private readonly secret: string;
  private readonly expiresIn: string;

  constructor(config: ConfigService) {
    const configured =
      config.get<string>('API_JWT_SECRET') ??
      config.get<string>('AUTH_SESSION_SECRET');
    if (!configured) {
      const env =
        config.get<string>('NODE_ENV') ?? process.env.NODE_ENV ?? 'development';
      if (env === 'production') {
        throw new Error(
          'API_JWT_SECRET (or AUTH_SESSION_SECRET) must be set in production.',
        );
      }
      this.secret = 'vectorgraph-dev-api-secret';
    } else {
      this.secret = configured;
    }
    this.expiresIn = config.get<string>('API_JWT_EXPIRES_IN') ?? '15m';
  }

  /** Returns `[token, expiresInSeconds]`. */
  sign(payload: Omit<ApiAccessTokenPayload, 'iat' | 'exp'>): {
    token: string;
    expiresIn: number;
  } {
    const token = jwt.sign(payload, this.secret, {
      expiresIn: this.expiresIn as jwt.SignOptions['expiresIn'],
    });
    const decoded = jwt.decode(token) as ApiAccessTokenPayload | null;
    const expiresIn =
      decoded?.exp && decoded?.iat
        ? decoded.exp - decoded.iat
        : this.parseExpiresInSeconds();
    return { token, expiresIn };
  }

  verify(token: string): ApiAccessTokenPayload | null {
    try {
      return jwt.verify(token, this.secret) as ApiAccessTokenPayload;
    } catch {
      return null;
    }
  }

  private parseExpiresInSeconds(): number {
    const m = /^(\d+)([smhd])?$/.exec(this.expiresIn.trim());
    if (!m) return 900;
    const value = parseInt(m[1], 10);
    switch (m[2]) {
      case 's':
        return value;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      case 'm':
      default:
        return value * 60;
    }
  }
}
