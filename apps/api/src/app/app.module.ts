import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ReposModule } from './repos/repos.module';
import { NodesModule } from './nodes/nodes.module';
import { SearchModule } from './search/search.module';
import { AiModule } from './ai/ai.module';
import { ExportModule } from './export/export.module';
import { RuntimeConfigModule } from './runtime/runtime-config.module';
import { GraphModule } from './graph/graph.module';
import { GraphSidecarModule } from './graph/graph-sidecar.module';
import { DatabaseModule } from './common/database/database.module';
import { EncryptionModule } from './common/encryption/encryption.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ApiAccessTokenService } from './auth/api-access-token.service';
import { AppAuthGuard } from './common/auth/auth.guard';
import { AdminGuard } from './common/auth/admin.guard';
import { SessionTokenService } from './common/auth/session-token.service';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';
import { CredentialsModule } from './credentials/credentials.module';
import { ModelSettingsModule } from './model-settings/model-settings.module';
import { UsageModule } from './usage/usage.module';
import { ModelQuotasModule } from './model-quotas/model-quotas.module';
import { ModelCatalogModule } from './model-catalog/model-catalog.module';
import { RateLimitsModule } from './rate-limits/rate-limits.module';
import { AiResolverModule } from './ai-resolver/ai-resolver.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      // Default ceiling for every endpoint — well above normal UI/CLI use,
      // tight enough to stop credential stuffing or scraping bursts.
      { name: 'default', ttl: 60_000, limit: 120 },
      // Tighter bucket explicitly applied to auth endpoints via @Throttle.
      { name: 'auth', ttl: 60_000, limit: 10 },
    ]),
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    EncryptionModule,
    RuntimeConfigModule,
    UsersModule,
    AuthModule,
    DashboardModule,
    HealthModule,
    ReposModule,
    NodesModule,
    SearchModule,
    AiModule,
    ExportModule,
    GraphModule,
    GraphSidecarModule,
    CredentialsModule,
    ModelSettingsModule,
    UsageModule,
    ModelQuotasModule,
    ModelCatalogModule,
    RateLimitsModule,
    AiResolverModule,
    AdminModule,
  ],
  providers: [
    SessionTokenService,
    ApiAccessTokenService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AppAuthGuard },
    { provide: APP_GUARD, useClass: AdminGuard },
  ],
})
export class AppModule {}
