import { Module } from '@nestjs/common';
import { ReposService } from './repos.service';
import { ReposController } from './repos.controller';
import { RuntimeConfigModule } from '../runtime/runtime-config.module';
import { GraphSidecarModule } from '../graph/graph-sidecar.module';

@Module({
  imports: [RuntimeConfigModule, GraphSidecarModule],
  providers: [ReposService],
  controllers: [ReposController],
  exports: [ReposService],
})
export class ReposModule {}
