'use client';
import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface GraphNode { id: string; label: string; group: string; }
interface GraphLink { source: string; target: string; }

export function Graph({ repos }: { repos: any[] }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();

    const width = ref.current.clientWidth || 800;
    const height = ref.current.clientHeight || 600;

    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    repos.forEach((r: any) => {
      nodes.push({ id: r.id, label: r.name, group: 'repo' });
      (r.nodes ?? []).forEach((n: any) => {
        nodes.push({ id: n.id, label: n.label, group: n.type });
        links.push({ source: r.id, target: n.id });
      });
    });

    const color = d3.scaleOrdinal<string>()
      .domain(['repo', 'module', 'api', 'schema', 'entry', 'config', 'note'])
      .range(['#60a5fa', '#34d399', '#f59e0b', '#a78bfa', '#f472b6', '#fb7185', '#94a3b8']);

    const sim = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = svg.append('g').attr('stroke', '#475569').attr('stroke-opacity', 0.5)
      .selectAll('line').data(links).join('line').attr('stroke-width', 1);

    const node = svg.append('g').selectAll('g').data(nodes).join('g')
      .call(d3.drag<any, any>()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end',   (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));

    node.append('circle').attr('r', (d: any) => d.group === 'repo' ? 14 : 8)
      .attr('fill', (d: any) => color(d.group));
    node.append('text').text((d: any) => d.label).attr('x', 12).attr('y', 4)
      .attr('fill', '#e5e7eb').attr('font-size', 11);

    sim.on('tick', () => {
      link.attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y);
      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => { sim.stop(); };
  }, [repos]);

  return <svg ref={ref} className="w-full h-full bg-slate-900 rounded" />;
}
