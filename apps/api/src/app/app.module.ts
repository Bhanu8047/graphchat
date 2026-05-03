import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ReposModule }  from './repos/repos.module';
import { NodesModule }  from './nodes/nodes.module';
import { SearchModule } from './search/search.module';
import { AiModule }     from './ai/ai.module';
import { ExportModule } from './export/export.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ReposModule, NodesModule, SearchModule, AiModule, ExportModule,
  ],
})
export class AppModule {}
