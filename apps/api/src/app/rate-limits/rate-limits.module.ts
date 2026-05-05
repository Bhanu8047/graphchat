import { Module } from '@nestjs/common';
import { RateLimitsController } from './rate-limits.controller';
import { RateLimitsRepository } from './rate-limits.repository';
import { RateLimitsService } from './rate-limits.service';

@Module({
  controllers: [RateLimitsController],
  providers: [RateLimitsService, RateLimitsRepository],
  exports: [RateLimitsService],
})
export class RateLimitsModule {}
