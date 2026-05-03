import { Controller, Get } from '@nestjs/common';
import { RuntimeConfigService } from './runtime-config.service';
import { Public } from '../common/auth/public.decorator';

@Controller('runtime')
export class RuntimeConfigController {
  constructor(private readonly runtimeConfig: RuntimeConfigService) {}

  @Public()
  @Get('config')
  getConfig() {
    return this.runtimeConfig.getPublicConfig();
  }
}