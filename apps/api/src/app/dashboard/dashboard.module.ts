import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardRepository } from './dashboard.repository';
import { DashboardService } from './dashboard.service';

@Module({
  providers: [DashboardRepository, DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}