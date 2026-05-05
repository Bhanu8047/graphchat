import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Admin } from '../common/auth/admin.decorator';
import { AdminGuard } from '../common/auth/admin.guard';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { AuthenticatedUser } from '@trchat/shared-types';
import { UpsertRateLimitDto } from '../rate-limits/dto/upsert-rate-limit.dto';
import { RateLimitsService } from '../rate-limits/rate-limits.service';
import { UsageService } from '../usage/usage.service';
import { UsersRepository } from '../users/users.repository';
import { SetRoleDto } from './dto/set-role.dto';

@Admin()
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly users: UsersRepository,
    private readonly rateLimits: RateLimitsService,
    private readonly usage: UsageService,
  ) {}

  // ── Users ────────────────────────────────────────────────────────────────
  @Get('users')
  listUsers() {
    return this.users.list();
  }

  @Patch('users/:id/role')
  async setRole(@Param('id') id: string, @Body() dto: SetRoleDto) {
    const updated = await this.users.setRole(id, dto.role);
    if (!updated) throw new NotFoundException('User not found.');
    const { passwordHash: _ignored, ...safe } = updated;
    return safe;
  }

  // ── Rate limits ──────────────────────────────────────────────────────────
  @Get('rate-limits')
  listRateLimits() {
    return this.rateLimits.list();
  }

  @Put('rate-limits')
  upsertRateLimit(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: UpsertRateLimitDto,
  ) {
    return this.rateLimits.upsert(admin.id, dto);
  }

  // ── Usage overview ───────────────────────────────────────────────────────
  @Get('usage')
  listUsage() {
    return this.usage.listAll();
  }
}
