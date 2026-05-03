import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { Public } from '../common/auth/public.decorator';
import { AuthenticatedUser } from '@vectorgraph/shared-types';
import { AuthService } from './auth.service';
import { GithubAuthDto } from './dto/github-auth.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Post('github')
  github(@Body() dto: GithubAuthDto) {
    return this.auth.github(dto);
  }

  @Get('session')
  session(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.session(user);
  }
}
