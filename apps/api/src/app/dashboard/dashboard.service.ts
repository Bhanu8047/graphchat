import { Injectable } from '@nestjs/common';
import { DashboardRepository } from './dashboard.repository';

@Injectable()
export class DashboardService {
  constructor(private readonly repository: DashboardRepository) {}

  getStats(ownerId: string) {
    return this.repository.getStats(ownerId);
  }
}
