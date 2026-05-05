import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthRateLimitMiddleware } from '../common/auth/rate-limit.middleware';
import { ApiAccessTokenService } from './api-access-token.service';
import { ApiKeysRepository } from './api-keys.repository';
import { ApiKeysService } from './api-keys.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CliAuthService } from './cli-auth.service';
import { CliSessionsRepository } from './cli-sessions.repository';
import { RefreshTokensRepository } from './refresh-tokens.repository';
import { UsersModule } from '../users/users.module';
import { SessionTokenService } from '../common/auth/session-token.service';

@Module({
  imports: [UsersModule],
  providers: [
    AuthService,
    SessionTokenService,
    ApiAccessTokenService,
    ApiKeysRepository,
    ApiKeysService,
    CliAuthService,
    CliSessionsRepository,
    RefreshTokensRepository,
  ],
  controllers: [AuthController],
  exports: [AuthService, ApiAccessTokenService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthRateLimitMiddleware).forRoutes(AuthController);
  }
}
