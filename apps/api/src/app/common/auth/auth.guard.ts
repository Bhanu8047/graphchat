import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiAccessTokenService } from '../../auth/api-access-token.service';
import { APP_SESSION_COOKIE } from './auth.constants';
import { IS_PUBLIC_ROUTE } from './public.decorator';
import { SessionTokenService } from './session-token.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class AppAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionTokenService,
    private readonly apiAccessTokens: ApiAccessTokenService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_ROUTE,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    const bearerToken =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice('Bearer '.length)
        : undefined;
    const cookieToken = request.cookies?.[APP_SESSION_COOKIE];
    const token = bearerToken || cookieToken;

    if (!token) {
      if (isPublic) return true;
      throw new UnauthorizedException('Authentication is required.');
    }

    // Try a browser session token first; fall back to a CLI API access token.
    const userId =
      this.sessions.verify(token)?.sub ??
      this.apiAccessTokens.verify(token)?.sub;

    if (!userId) {
      if (isPublic) return true;
      throw new UnauthorizedException('Session is invalid or expired.');
    }

    const user = await this.users.findPublicById(userId);
    if (!user) {
      if (isPublic) return true;
      throw new UnauthorizedException('User no longer exists.');
    }

    request.user = user;
    return true;
  }
}
