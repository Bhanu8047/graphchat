import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_ADMIN_ROUTE } from './admin.decorator';

/**
 * Run AFTER {@link AppAuthGuard}: assumes `request.user` is populated.
 * Only blocks when the route opted in via `@Admin()`.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requireAdmin = this.reflector.getAllAndOverride<boolean>(
      IS_ADMIN_ROUTE,
      [context.getHandler(), context.getClass()],
    );
    if (!requireAdmin) return true;

    const request = context.switchToHttp().getRequest();
    if (request.user?.role !== 'admin') {
      throw new ForbiddenException('Admin access required.');
    }
    return true;
  }
}
