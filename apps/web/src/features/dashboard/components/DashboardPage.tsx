'use client';

import { useEffect, useState } from 'react';
import { DashboardStats } from '@vectorgraph/shared-types';
import { api } from '../../../lib/api';
import { useAuth } from '../../auth/providers/AuthProvider';

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dashboard.stats().then((payload: DashboardStats) => setStats(payload)).finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Total repos', value: stats?.totals.repositories ?? 0, hint: 'Imported repositories across all branches' },
    { label: 'Graphs generated', value: stats?.totals.graphs ?? 0, hint: 'Stored branch graphs' },
    { label: 'Graph nodes', value: stats?.totals.graphNodes ?? 0, hint: 'Structural graph entities' },
    { label: 'Semantic nodes', value: stats?.totals.semanticNodes ?? 0, hint: 'Chunked context nodes used by search and AI' },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(56,189,248,0.15),rgba(15,23,42,0.88)_55%,rgba(16,185,129,0.14))] p-6">
          <div className="text-xs uppercase tracking-[0.24em] text-sky-200/70">Command center</div>
          <h2 className="mt-2 font-display text-4xl text-white">Hello, {user?.name?.split(' ')[0] ?? 'there'}</h2>
          <p className="mt-3 max-w-2xl text-slate-300">Your workspace now supports authenticated graph management, multi-branch graph storage, incremental graph sync, and API-ready exports for downstream AI agents.</p>
        </div>
        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
          <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Recent activity</div>
          <div className="mt-3 space-y-3">
            {(stats?.recentRepositories ?? []).slice(0, 3).map(repo => (
              <div key={repo.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <div className="font-medium text-white">{repo.name}</div>
                <div className="mt-1 text-sm text-slate-400">{repo.branch ? `Branch ${repo.branch}` : 'Graph snapshot'}</div>
                <div className="mt-2 text-xs text-slate-500">{new Date(repo.updatedAt).toLocaleString()}</div>
              </div>
            ))}
            {!stats?.recentRepositories?.length && !loading ? <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/50 p-4 text-sm text-slate-500">No graphs yet. Import a repository branch to populate this dashboard.</div> : null}
          </div>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(card => (
          <div key={card.label} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
            <div className="text-sm text-slate-400">{card.label}</div>
            <div className="mt-3 font-display text-4xl text-white">{loading ? '…' : card.value.toLocaleString()}</div>
            <div className="mt-2 text-xs text-slate-500">{card.hint}</div>
          </div>
        ))}
      </section>
      <section className="grid gap-6 xl:grid-cols-[1fr_0.92fr]">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Recent repositories</div>
              <h3 className="mt-2 font-display text-3xl text-white">Latest graph snapshots</h3>
            </div>
            <a href="/repos" className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/[0.04]">Manage repos</a>
          </div>
          <div className="mt-5 space-y-3">
            {(stats?.recentRepositories ?? []).map(repo => (
              <div key={repo.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-white">{repo.name}</div>
                    <div className="mt-1 text-sm text-slate-400">{repo.description || 'No repository description provided.'}</div>
                  </div>
                  <div className="text-right text-sm text-slate-400">
                    <div>{repo.nodes} nodes</div>
                    <div>{repo.branch ? `Branch ${repo.branch}` : 'Single snapshot'}</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {repo.techStack.slice(0, 4).map(tag => <span key={tag} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">{tag}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
          <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Operational notes</div>
          <h3 className="mt-2 font-display text-3xl text-white">What changed</h3>
          <div className="mt-5 space-y-4 text-sm text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">Authentication is now persistent across the app via a signed session cookie and protected routes.</div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">Each GitHub branch can now become its own stored graph, and branch imports can seed from an existing graph to avoid rereading unchanged files.</div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">API routes now enforce validation, auth, and rate limiting for new account/session features.</div>
          </div>
        </div>
      </section>
    </div>
  );
}