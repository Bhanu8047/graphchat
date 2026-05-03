import { Module } from '@nestjs/common';
import { NodesService } from './nodes.service';
import { NodesController } from './nodes.controller';
import { RuntimeConfigModule } from '../runtime/runtime-config.module';

@Module({
  imports: [RuntimeConfigModule],
  providers: [NodesService],
  controllers: [NodesController],
})
export class NodesModule {}
