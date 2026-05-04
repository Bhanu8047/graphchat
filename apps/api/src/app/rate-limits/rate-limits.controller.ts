import { Controller, Get } from '@nestjs/common';
import { RateLimitsService } from './rate-limits.service';

/**
 * Read-only rate-limit lookup for any authenticated user.
 * Mutations live on AdminController (@Admin guarded).
 */
@Controller('rate-limits')
export class RateLimitsController {
  constructor(private readonly svc: RateLimitsService) {}

  @Get()
  list() {
    return this.svc.list();
  }
}
