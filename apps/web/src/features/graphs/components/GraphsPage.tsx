'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphSnapshot } from '@vectorgraph/shared-types';
import { Button } from '../../../components/atoms/Button';
import { Surface } from '../../../components/atoms/Surface';
import { Notice } from '../../../components/molecules/Notice';
import { PageIntro } from '../../../components/molecules/PageIntro';
import { RepositorySelect } from '../../../components/molecules/RepositorySelect';
import { api } from '../../../lib/api';

type GraphNodeDatum = {
  id: string;
  label: string;
  group: string;
  depth: number;
  path?: string;
  tags?: string[];
};
type GraphLinkDatum = { source: string; target: string; type: string };

export function GraphsPage() {
  const ref = useRef<SVGSVGElement>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [repoId, setRepoId] = useState('');
  const [snapshot, setSnapshot] = useState<GraphSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadRepos = async () => {
    const nextRepos = await api.repos.list();
    setRepos(nextRepos);
    setRepoId((current) => current || nextRepos[0]?.id || '');
  };

  const loadGraph = async (nextRepoId: string) => {
    if (!nextRepoId) {
      setSnapshot(null);
      return;
    }

    setLoading(true);
    setError('');
    try {
      setSnapshot(await api.graph.get(nextRepoId));
    } catch (err: any) {
      setError(err.message ?? 'Unable to load graph');
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  };

  const syncGraph = async () => {
    if (!repoId) return;
    setLoading(true);
    setError('');
    try {
      await api.graph.syncGithub(repoId);
      await Promise.all([loadRepos(), loadGraph(repoId)]);
    } catch (err: any) {
      setError(err.message ?? 'Unable to sync graph');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRepos().catch(() => {
      setRepos([]);
    });
  }, []);

  useEffect(() => {
    if (repoId) {
      loadGraph(repoId).catch(() => {
        setSnapshot(null);
      });
    }
  }, [repoId]);

  useEffect(() => {
    if (!ref.current) return;
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();

    const width = ref.current.clientWidth || 800;
    const height = ref.current.clientHeight || 600;

    const nodes: GraphNodeDatum[] = (snapshot?.nodes ?? []).map((node) => ({
      id: node.id,
      label: node.label,
      group: node.type,
      depth: node.depth,
      path: node.path,
      tags: node.tags,
    }));
    const links: GraphLinkDatum[] = (snapshot?.edges ?? []).map((edge) => ({
      source: edge.sourceId,
      target: edge.targetId,
      type: edge.type,
    }));

    if (nodes.length === 0) {
      return;
    }

    const color = d3
      .scaleOrdinal<string>()
      .domain([
        'repo',
        'directory',
        'file',
        'module',
        'api',
        'schema',
        'entry',
        'config',
        'note',
      ])
      .range([
        '#554686',
        '#59735e',
        '#cb7867',
        '#6f9075',
        '#b84760',
        '#6a58a7',
        '#c66c80',
        '#be5641',
        '#8ca691',
      ]);

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.35, 2.5])
      .on('zoom', (event) => {
        canvas.attr('transform', event.transform.toString());
      });
    svg.call(zoom as any);

    const canvas = svg.append('g');

    const sim = d3
      .forceSimulation(nodes as any)
      .force(
        'link',
        d3
          .forceLink(links)
          .id((datum: any) => datum.id)
          .distance(80),
      )
      .force(
        'charge',
        d3
          .forceManyBody()
          .strength((datum: any) =>
            datum.group === 'repo'
              ? -500
              : datum.group === 'directory'
                ? -250
                : -150,
          ),
      )
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = canvas
      .append('g')
      .attr('stroke', 'var(--border-strong)')
      .attr('stroke-opacity', 0.55)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke-width', (datum: any) =>
        datum.type === 'summarizes' ? 1.6 : 1,
      );

    const node = canvas
      .append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(
        d3
          .drag<any, any>()
          .on('start', (event, datum) => {
            if (!event.active) sim.alphaTarget(0.3).restart();
            datum.fx = datum.x;
            datum.fy = datum.y;
          })
          .on('drag', (event, datum) => {
            datum.fx = event.x;
            datum.fy = event.y;
          })
          .on('end', (event, datum) => {
            if (!event.active) sim.alphaTarget(0);
            datum.fx = null;
            datum.fy = null;
          }),
      );

    node
      .append('circle')
      .attr('r', (datum: any) =>
        datum.group === 'repo'
          ? 18
          : datum.group === 'directory'
            ? 10
            : datum.group === 'file'
              ? 8
              : 6,
      )
      .attr('fill', (datum: any) => color(datum.group));
    node
      .append('title')
      .text((datum: any) =>
        [datum.label, datum.path, datum.tags?.join(', ')]
          .filter(Boolean)
          .join('\n'),
      );
    node
      .append('text')
      .text((datum: any) => datum.label)
      .attr('x', 12)
      .attr('y', 4)
      .attr('fill', 'var(--muted-foreground)')
      .attr('font-size', 11);

    sim.on('tick', () => {
      link
        .attr('x1', (datum: any) => datum.source.x)
        .attr('y1', (datum: any) => datum.source.y)
        .attr('x2', (datum: any) => datum.target.x)
        .attr('y2', (datum: any) => datum.target.y);
      node.attr(
        'transform',
        (datum: any) => `translate(${datum.x},${datum.y})`,
      );
    });

    return () => {
      sim.stop();
    };
  }, [snapshot]);

  return (
    <div className="space-y-6">
      <Surface tone="hero" padding="xl">
        <PageIntro
          eyebrow="Explorer"
          title="Inspect graph structure by repository and branch"
          description="Traverse structural nodes and semantic leaf nodes without having to reload the repository manually."
        />
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <RepositorySelect
            repositories={repos}
            value={repoId}
            onChange={setRepoId}
            className="min-w-[260px] max-w-[420px]"
          />
          <Button
            tone="secondary"
            onClick={() => repoId && loadGraph(repoId)}
            disabled={!repoId || loading}
          >
            Refresh graph
          </Button>
          <Button
            onClick={syncGraph}
            disabled={
              !repoId ||
              loading ||
              snapshot?.repository.source?.provider !== 'github'
            }
          >
            Sync from GitHub
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {snapshot?.repository.sync?.lastSyncedAt ? (
            <span>
              Last sync{' '}
              {new Date(snapshot.repository.sync.lastSyncedAt).toLocaleString()}
            </span>
          ) : null}
          {snapshot?.repository.sync?.changedPaths?.length ? (
            <span>
              Recent changes:{' '}
              {snapshot.repository.sync.changedPaths.slice(0, 3).join(', ')}
            </span>
          ) : null}
        </div>
      </Surface>

      {error ? <Notice tone="error">{error}</Notice> : null}

      <div className="grid min-h-0 gap-4 xl:grid-cols-[1fr_300px]">
        <Surface
          tone="default"
          padding="sm"
          className="min-h-[460px] lg:min-h-[620px]"
        >
          {loading && !snapshot ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Loading graph...
            </div>
          ) : (
            <svg
              ref={ref}
              className="h-full w-full rounded-[22px] bg-surface-muted"
            />
          )}
        </Surface>
        <Surface tone="soft" padding="md" className="space-y-3 text-sm">
          <PageIntro
            eyebrow="Summary"
            title={snapshot?.repository.name ?? 'No repository selected'}
            description={
              snapshot
                ? 'The graph keeps repository structure as persistent graph nodes and semantic chunks as leaf nodes.'
                : 'Import a repository to create a stored graph that agents can query through the API.'
            }
          />
          {snapshot ? (
            <div className="space-y-3 text-muted-foreground">
              <div>{snapshot.stats.structuralNodeCount} structural nodes</div>
              <div>{snapshot.stats.semanticNodeCount} semantic nodes</div>
              <div>{snapshot.stats.edgeCount} edges</div>
              <div>
                {snapshot.repository.sync?.fileCount ?? 0} tracked files
              </div>
            </div>
          ) : null}
        </Surface>
      </div>
    </div>
  );
}
