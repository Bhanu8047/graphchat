import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthRateLimitMiddleware } from '../common/auth/rate-limit.middleware';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { SessionTokenService } from '../common/auth/session-token.service';

@Module({
  imports: [UsersModule],
  providers: [AuthService, SessionTokenService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthRateLimitMiddleware).forRoutes(AuthController);
  }
}
