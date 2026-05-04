import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
} from '@nestjs/common';
import { AuthenticatedUser } from '@vectorgraph/shared-types';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { CredentialsService } from './credentials.service';
import { UpsertCredentialDto } from './dto/upsert-credential.dto';

@Controller('credentials')
export class CredentialsController {
  constructor(private readonly credentials: CredentialsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.credentials.list(user.id);
  }

  @Put()
  upsert(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertCredentialDto,
  ) {
    return this.credentials.upsert(user.id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.credentials.remove(user.id, id);
  }
}
