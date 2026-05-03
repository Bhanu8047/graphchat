import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ReposModule }  from './repos/repos.module';
import { NodesModule }  from './nodes/nodes.module';
import { SearchModule } from './search/search.module';
import { AiModule }     from './ai/ai.module';
import { ExportModule } from './export/export.module';
import { RuntimeConfigModule } from './runtime/runtime-config.module';
import { GraphModule } from './graph/graph.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RuntimeConfigModule,
    ReposModule, NodesModule, SearchModule, AiModule, ExportModule, GraphModule,
  ],
})
export class AppModule {}
