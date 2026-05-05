import { Controller, Post, Body } from '@nestjs/common';
import {
  AuthenticatedUser,
  ExplainDto,
  SuggestDto,
} from '@graphchat/shared-types';
import { AiService } from './ai.service';
import { CurrentUser } from '../common/auth/current-user.decorator';

@Controller('ai')
export class AiController {
  constructor(private svc: AiService) {}
  @Post('suggest') suggest(
    @Body() dto: SuggestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.suggest(dto, user.id);
  }
  @Post('explain') explain(
    @Body() dto: ExplainDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.explain(dto, user.id);
  }
}
