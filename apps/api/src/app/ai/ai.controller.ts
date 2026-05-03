import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private svc: AiService) {}
  @Post('suggest') suggest(@Body() dto: any) { return this.svc.suggest(dto); }
}
