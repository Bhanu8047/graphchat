'use client';
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphSnapshot } from '@vectorgraph/shared-types';
import { api } from '../lib/api';

type GraphNodeDatum = { id: string; label: string; group: string; depth: number; path?: string; tags?: string[]; };
type GraphLinkDatum = { source: string; target: string; type: string; };

export function Graph() {
  const ref = useRef<SVGSVGElement>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [repoId, setRepoId] = useState('');
  const [snapshot, setSnapshot] = useState<GraphSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadRepos = async () => {
    const nextRepos = await api.repos.list();
    setRepos(nextRepos);
    setRepoId(current => current || nextRepos[0]?.id || '');
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

    const nodes: GraphNodeDatum[] = (snapshot?.nodes ?? []).map(node => ({
      id: node.id,
      label: node.label,
      group: node.type,
      depth: node.depth,
      path: node.path,
      tags: node.tags,
    }));
    const links: GraphLinkDatum[] = (snapshot?.edges ?? []).map(edge => ({
      source: edge.sourceId,
      target: edge.targetId,
      type: edge.type,
    }));

    if (nodes.length === 0) {
      return;
    }

    const color = d3.scaleOrdinal<string>()
      .domain(['repo', 'directory', 'file', 'module', 'api', 'schema', 'entry', 'config', 'note'])
      .range(['#38bdf8', '#22c55e', '#f59e0b', '#34d399', '#fb7185', '#a78bfa', '#f97316', '#f43f5e', '#94a3b8']);

    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.35, 2.5]).on('zoom', event => {
      canvas.attr('transform', event.transform.toString());
    });
    svg.call(zoom as any);

    const canvas = svg.append('g');

    const sim = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength((d: any) => d.group === 'repo' ? -500 : d.group === 'directory' ? -250 : -150))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = canvas.append('g').attr('stroke', '#475569').attr('stroke-opacity', 0.55)
      .selectAll('line').data(links).join('line').attr('stroke-width', (d: any) => d.type === 'summarizes' ? 1.6 : 1);

    const node = canvas.append('g').selectAll('g').data(nodes).join('g')
      .call(d3.drag<any, any>()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end',   (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));

    node.append('circle').attr('r', (d: any) => d.group === 'repo' ? 18 : d.group === 'directory' ? 10 : d.group === 'file' ? 8 : 6)
      .attr('fill', (d: any) => color(d.group));
    node.append('title').text((d: any) => [d.label, d.path, d.tags?.join(', ')].filter(Boolean).join('\n'));
    node.append('text').text((d: any) => d.label).attr('x', 12).attr('y', 4)
      .attr('fill', '#e5e7eb').attr('font-size', 11);

    sim.on('tick', () => {
      link.attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y);
      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => { sim.stop(); };
  }, [snapshot]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 rounded border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-300">
        <select className="rounded bg-slate-800 px-3 py-2" value={repoId} onChange={e => setRepoId(e.target.value)}>
          <option value="">Select repo…</option>
          {repos.map((repo: any) => <option key={repo.id} value={repo.id}>{repo.name}</option>)}
        </select>
        <button className="rounded bg-sky-600 px-3 py-2 text-white hover:bg-sky-500 disabled:opacity-60" onClick={() => repoId && loadGraph(repoId)} disabled={!repoId || loading}>Refresh Graph</button>
        <button className="rounded bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-500 disabled:opacity-60" onClick={syncGraph} disabled={!repoId || loading || snapshot?.repository.source?.provider !== 'github'}>Sync from GitHub</button>
        {snapshot?.repository.sync?.lastSyncedAt ? <span className="text-xs text-slate-400">Last sync {new Date(snapshot.repository.sync.lastSyncedAt).toLocaleString()}</span> : null}
        {snapshot?.repository.sync?.changedPaths?.length ? <span className="text-xs text-slate-500">Recent changes: {snapshot.repository.sync.changedPaths.slice(0, 3).join(', ')}</span> : null}
      </div>
      {error ? <div className="rounded border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">{error}</div> : null}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_280px]">
        <div className="min-h-[520px] rounded border border-slate-800 bg-slate-900 p-2">
          {loading && !snapshot ? <div className="flex h-full items-center justify-center text-slate-400">Loading graph…</div> : <svg ref={ref} className="h-full w-full rounded bg-slate-900" />}
        </div>
        <aside className="space-y-3 rounded border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-300">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Graph</div>
            <div className="mt-1 text-lg font-semibold text-slate-100">{snapshot?.repository.name ?? 'No repo selected'}</div>
          </div>
          {snapshot ? (
            <>
              <div className="space-y-1 text-slate-400">
                <div>{snapshot.stats.structuralNodeCount} structural nodes</div>
                <div>{snapshot.stats.semanticNodeCount} semantic nodes</div>
                <div>{snapshot.stats.edgeCount} edges</div>
                <div>{snapshot.repository.sync?.fileCount ?? 0} tracked files</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Why This Shape</div>
                <p className="mt-1 text-slate-400">The graph keeps repository structure as persistent graph nodes and semantic chunks as leaf nodes. Agents can traverse folders and files first, then drop into summarized chunks only where needed.</p>
              </div>
            </>
          ) : (
            <p className="text-slate-500">Import a repository to create a stored graph that agents can query through the API.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
