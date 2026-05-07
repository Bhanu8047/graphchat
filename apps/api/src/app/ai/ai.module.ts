import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiResolverModule } from '../ai-resolver/ai-resolver.module';
import { UsageModule } from '../usage/usage.module';

@Module({
  imports: [AiResolverModule, UsageModule],
  providers: [AiService],
  controllers: [AiController],
})
export class AiModule {}
