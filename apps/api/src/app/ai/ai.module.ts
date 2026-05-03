import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { RuntimeConfigModule } from '../runtime/runtime-config.module';

@Module({
  imports: [RuntimeConfigModule],
  providers: [AiService],
  controllers: [AiController],
})
export class AiModule {}
