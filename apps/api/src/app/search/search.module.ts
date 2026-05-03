import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { RuntimeConfigModule } from '../runtime/runtime-config.module';

@Module({
  imports: [RuntimeConfigModule],
  providers: [SearchService],
  controllers: [SearchController],
})
export class SearchModule {}
