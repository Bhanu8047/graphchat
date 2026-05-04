import { Module } from '@nestjs/common';
import { CommunityCacheService } from './community-cache.service';
import { GraphBridgeService } from './graph-bridge.service';
import { GraphSidecarController } from './graph-sidecar.controller';
import { IgnoreService } from '../shared/ignore.service';

/**
 * Holds services that bridge to the Python `graph-service` sidecar
 * (Tree-sitter + Leiden) and the `.trchatignore` filter helper.
 *
 * Kept separate from the existing structural `GraphModule` to avoid
 * a circular dependency with `ReposModule`.
 */
@Module({
  providers: [CommunityCacheService, GraphBridgeService, IgnoreService],
  controllers: [GraphSidecarController],
  exports: [CommunityCacheService, GraphBridgeService, IgnoreService],
})
export class GraphSidecarModule {}
