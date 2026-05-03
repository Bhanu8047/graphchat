import { Module } from '@nestjs/common';
import { PasswordService } from '../common/auth/password.service';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  providers: [UsersRepository, UsersService, PasswordService],
  controllers: [UsersController],
  exports: [UsersRepository, UsersService, PasswordService],
})
export class UsersModule {}
