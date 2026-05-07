import { Module } from '@nestjs/common';
import { NodesService } from './nodes.service';
import { NodesController } from './nodes.controller';
import { RuntimeConfigModule } from '../runtime/runtime-config.module';
import { SearchModule } from '../search/search.module';
import { UsageModule } from '../usage/usage.module';

@Module({
  imports: [RuntimeConfigModule, SearchModule, UsageModule],
  providers: [NodesService],
  controllers: [NodesController],
})
export class NodesModule {}
