import { Module } from '@nestjs/common';
import { ReposService } from './repos.service';
import { ReposController } from './repos.controller';
import { RuntimeConfigModule } from '../runtime/runtime-config.module';

@Module({
  imports: [RuntimeConfigModule],
  providers: [ReposService],
  controllers: [ReposController],
  exports: [ReposService],
})
export class ReposModule {}
