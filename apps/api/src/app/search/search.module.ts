import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { AiResolverModule } from '../ai-resolver/ai-resolver.module';
import { UsageModule } from '../usage/usage.module';

@Module({
  imports: [AiResolverModule, UsageModule],
  providers: [SearchService],
  controllers: [SearchController],
  exports: [SearchService],
})
export class SearchModule {}
