import { Body, Controller, Delete, Get, Patch } from '@nestjs/common';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { AuthenticatedUser } from '@vectorgraph/shared-types';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  @Patch('me')
  update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateUserDto) {
    return this.users.updateCurrentUser(user.id, dto);
  }

  @Delete('me')
  async remove(@CurrentUser() user: AuthenticatedUser) {
    await this.users.deleteCurrentUser(user.id);
    return { ok: true };
  }
}
