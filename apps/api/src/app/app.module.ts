import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ReposModule }  from './repos/repos.module';
import { NodesModule }  from './nodes/nodes.module';
import { SearchModule } from './search/search.module';
import { AiModule }     from './ai/ai.module';
import { ExportModule } from './export/export.module';
import { RuntimeConfigModule } from './runtime/runtime-config.module';
import { GraphModule } from './graph/graph.module';
import { DatabaseModule } from './common/database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AppAuthGuard } from './common/auth/auth.guard';
import { SessionTokenService } from './common/auth/session-token.service';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    RuntimeConfigModule,
    UsersModule,
    AuthModule,
    DashboardModule,
    ReposModule, NodesModule, SearchModule, AiModule, ExportModule, GraphModule,
  ],
  providers: [
    SessionTokenService,
    { provide: APP_GUARD, useClass: AppAuthGuard },
  ],
})
export class AppModule {}
