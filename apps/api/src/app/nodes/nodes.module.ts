import { Module } from '@nestjs/common';
import { NodesService } from './nodes.service';
import { NodesController } from './nodes.controller';
import { RuntimeConfigModule } from '../runtime/runtime-config.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [RuntimeConfigModule, SearchModule],
  providers: [NodesService],
  controllers: [NodesController],
})
export class NodesModule {}
