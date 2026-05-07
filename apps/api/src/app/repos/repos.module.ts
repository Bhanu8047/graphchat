import { Module } from '@nestjs/common';
import { ReposService } from './repos.service';
import { ReposController } from './repos.controller';
import { RuntimeConfigModule } from '../runtime/runtime-config.module';
import { GraphSidecarModule } from '../graph/graph-sidecar.module';
import { SearchModule } from '../search/search.module';
import { UsageModule } from '../usage/usage.module';

@Module({
  imports: [RuntimeConfigModule, GraphSidecarModule, SearchModule, UsageModule],
  providers: [ReposService],
  controllers: [ReposController],
  exports: [ReposService],
})
export class ReposModule {}
