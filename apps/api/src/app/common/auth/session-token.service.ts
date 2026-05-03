import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedUser } from '@vectorgraph/shared-types';
import jwt from 'jsonwebtoken';

type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  authProvider: string;
};

@Injectable()
export class SessionTokenService {
  private readonly secret: string;

  constructor(config: ConfigService) {
    this.secret = config.get('AUTH_SESSION_SECRET') || 'vectorgraph-dev-session-secret';
  }

  sign(user: AuthenticatedUser): string {
    const payload: SessionPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      authProvider: user.authProvider,
    };

    return jwt.sign(payload, this.secret, { expiresIn: '30d' });
  }

  verify(token: string): SessionPayload | null {
    try {
      return jwt.verify(token, this.secret) as SessionPayload;
    } catch {
      return null;
    }
  }
}