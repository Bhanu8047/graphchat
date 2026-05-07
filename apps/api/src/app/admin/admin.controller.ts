import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Admin } from '../common/auth/admin.decorator';
import { AdminGuard } from '../common/auth/admin.guard';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { AuthenticatedUser, CredentialKind } from '@graphchat/shared-types';
import { ModelQuotasService } from '../model-quotas/model-quotas.service';
import { UpdateModelQuotaDto } from '../model-quotas/dto/update-model-quota.dto';
import { ModelCatalogService } from '../model-catalog/model-catalog.service';
import {
  UpdateCatalogVisibilityDto,
  BulkUpdateCatalogDto,
} from '../model-catalog/dto/update-catalog.dto';
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
    private readonly modelQuotas: ModelQuotasService,
    private readonly modelCatalog: ModelCatalogService,
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
  listUsage(
    @Query('userId') userId?: string,
    @Query('provider') provider?: CredentialKind,
    @Query('month') month?: string,
  ) {
    if (userId || provider || month) {
      return this.usage.aggregateModelUsage({ userId, provider, month });
    }
    return this.usage.listAll();
  }

  // ── Model quotas ─────────────────────────────────────────────────────────
  @Get('models')
  listModels() {
    return this.modelQuotas.list();
  }

  @Patch('models/:id')
  async updateModel(@Param('id') id: string, @Body() dto: UpdateModelQuotaDto) {
    return this.modelQuotas.update(id, dto);
  }

  // ── Model catalog ─────────────────────────────────────────────────────────
  @Get('models/catalog')
  listCatalog() {
    return this.modelCatalog.list();
  }

  @Patch('models/catalog/bulk')
  bulkUpdateCatalog(@Body() dto: BulkUpdateCatalogDto) {
    return this.modelCatalog.bulkUpdateVisibility(dto);
  }

  @Patch('models/catalog/:id')
  updateCatalog(
    @Param('id') id: string,
    @Body() dto: UpdateCatalogVisibilityDto,
  ) {
    return this.modelCatalog.updateVisibility(id, dto);
  }
}
