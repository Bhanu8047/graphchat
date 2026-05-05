import { Module } from '@nestjs/common';
import { UsageController } from './usage.controller';
import { UsageRepository } from './usage.repository';
import { UsageService } from './usage.service';

@Module({
  controllers: [UsageController],
  providers: [UsageService, UsageRepository],
  exports: [UsageService],
})
export class UsageModule {}
