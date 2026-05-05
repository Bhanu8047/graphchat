import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import { Community, CommunityMeta, ContextNode } from '@graphchat/shared-types';

const CACHE_TTL_SECONDS = 60 * 60 * 24; // 24 hours — rebuilt on re-index

/**
 * Pre-builds and caches per-community context prompts in Redis so AI agents
 * can fetch a compact, ready-to-use string with a single GET instead of
 * re-summarising hundreds of nodes per request.
 */
@Injectable()
export class CommunityCacheService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;

  constructor(private cfg: ConfigService) {
    this.client = createClient({
      url: this.cfg.get('REDIS_URL', 'redis://localhost:6379'),
    });
  }

  async onModuleInit() {
    await this.client.connect();
  }

  async onModuleDestroy() {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  async setCommunityPrompt(
    community: Community,
    nodes: ContextNode[],
  ): Promise<void> {
    const prompt = this.buildCommunityPrompt(community, nodes);
    await this.client.setEx(
      `community:${community.id}:prompt`,
      CACHE_TTL_SECONDS,
      prompt,
    );

    const meta: CommunityMeta = {
      id: community.id,
      repoId: community.repoId,
      label: community.label,
      godNodeId: community.godNodeId,
      nodeCount: community.nodeIds.length,
    };
    await this.client.setEx(
      `community:${community.id}:meta`,
      CACHE_TTL_SECONDS,
      JSON.stringify(meta),
    );
  }

  async getCommunityPrompt(communityId: string): Promise<string | null> {
    return this.client.get(`community:${communityId}:prompt`);
  }

  async getRepoCommunities(repoId: string): Promise<CommunityMeta[]> {
    // Use SCAN (non-blocking) instead of KEYS to avoid stalling Redis on
    // large keyspaces.
    const results: CommunityMeta[] = [];
    for await (const key of this.client.scanIterator({
      MATCH: 'community:*:meta',
      COUNT: 200,
    })) {
      const raw = await this.client.get(key as string);
      if (!raw) continue;
      try {
        const meta = JSON.parse(raw) as CommunityMeta;
        if (meta.repoId === repoId) results.push(meta);
      } catch {
        // ignore malformed entries
      }
    }
    return results;
  }

  async invalidateRepo(repoId: string): Promise<void> {
    const communities = await this.getRepoCommunities(repoId);
    for (const c of communities) {
      await this.client.del(`community:${c.id}:prompt`);
      await this.client.del(`community:${c.id}:meta`);
    }
  }

  private buildCommunityPrompt(
    community: Community,
    nodes: ContextNode[],
  ): string {
    const godNode = nodes.find((n) => n.id === community.godNodeId);
    const extracted = nodes.filter((n) => n.confidence === 'EXTRACTED');
    const inferred = nodes.filter((n) => n.confidence === 'INFERRED');

    return [
      `## Community: ${community.label}`,
      `God node: ${godNode?.label ?? 'unknown'} (highest connectivity)`,
      `Nodes: ${nodes.length} total (${extracted.length} AST-extracted, ${inferred.length} inferred)`,
      '',
      '### AST-Extracted Nodes (confidence: EXTRACTED)',
      ...extracted
        .slice(0, 10)
        .map((n) => `- [${n.type}] ${n.label}: ${n.content.slice(0, 120)}`),
      '',
      '### Inferred Nodes (confidence: INFERRED)',
      ...inferred
        .slice(0, 5)
        .map((n) => `- [${n.type}] ${n.label}: ${n.content.slice(0, 80)}`),
    ].join('\n');
  }
}
