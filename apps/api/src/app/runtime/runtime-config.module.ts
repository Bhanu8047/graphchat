import { Module } from '@nestjs/common';
import { RuntimeConfigController } from './runtime-config.controller';
import { RuntimeConfigService } from './runtime-config.service';

@Module({
  providers: [RuntimeConfigService],
  controllers: [RuntimeConfigController],
  exports: [RuntimeConfigService],
})
export class RuntimeConfigModule {}
