import { Controller, Get } from '@nestjs/common';
import { RuntimeConfigService } from './runtime-config.service';

@Controller('runtime')
export class RuntimeConfigController {
  constructor(private readonly runtimeConfig: RuntimeConfigService) {}

  @Get('config')
  getConfig() {
    return this.runtimeConfig.getPublicConfig();
  }
}