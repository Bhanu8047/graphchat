import { Module } from '@nestjs/common';
import { CredentialsModule } from '../credentials/credentials.module';
import { ModelSettingsModule } from '../model-settings/model-settings.module';
import { RateLimitsModule } from '../rate-limits/rate-limits.module';
import { RuntimeConfigModule } from '../runtime/runtime-config.module';
import { UsageModule } from '../usage/usage.module';
import { AiResolverService } from './ai-resolver.service';

@Module({
  imports: [
    RuntimeConfigModule,
    CredentialsModule,
    ModelSettingsModule,
    UsageModule,
    RateLimitsModule,
  ],
  providers: [AiResolverService],
  exports: [AiResolverService],
})
export class AiResolverModule {}
