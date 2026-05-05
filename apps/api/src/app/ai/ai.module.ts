import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiResolverModule } from '../ai-resolver/ai-resolver.module';

@Module({
  imports: [AiResolverModule],
  providers: [AiService],
  controllers: [AiController],
})
export class AiModule {}
