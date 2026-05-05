import { Body, Controller, Get, Put } from '@nestjs/common';
import { AuthenticatedUser } from '@graphchat/shared-types';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { UpsertModelSettingDto } from './dto/upsert-model-setting.dto';
import { ModelSettingsService } from './model-settings.service';

@Controller('model-settings')
export class ModelSettingsController {
  constructor(private readonly settings: ModelSettingsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.settings.list(user.id);
  }

  @Put()
  upsert(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertModelSettingDto,
  ) {
    return this.settings.upsert(user.id, dto);
  }
}
