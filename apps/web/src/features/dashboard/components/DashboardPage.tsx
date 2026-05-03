'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { DashboardStats } from '@vectorgraph/shared-types';
import { api } from '../../../lib/api';
import { useAuth } from '../../auth/providers/AuthProvider';
import { Badge } from '../../../components/atoms/Badge';
import { buttonStyles } from '../../../components/atoms/Button';
import { Surface } from '../../../components/atoms/Surface';
import { EmptyState } from '../../../components/molecules/EmptyState';
import { MetricCard } from '../../../components/molecules/MetricCard';

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dashboard
      .stats()
      .then((payload: DashboardStats) => setStats(payload))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    {
      label: 'Repositories',
      value: stats?.totals.repositories ?? 0,
      hint: 'Imported repositories in your account',
    },
    {
      label: 'Branch graphs',
      value: stats?.totals.graphs ?? 0,
      hint: 'Stored graph snapshots you can revisit',
    },
    {
      label: 'Structural nodes',
      value: stats?.totals.graphNodes ?? 0,
      hint: 'Files, directories, and graph entities',
    },
    {
      label: 'Semantic nodes',
      value: stats?.totals.semanticNodes ?? 0,
      hint: 'Chunked context for search and AI flows',
    },
  ];
  const recentRepositories = stats?.recentRepositories ?? [];

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <Surface tone="hero" padding="xl">
            <Badge tone="accent">Command center</Badge>
            <h2 className="mt-4 font-display text-4xl leading-[1.02] text-slate-900 dark:text-white sm:text-5xl">
              Hello, {user?.name?.split(' ')[0] ?? 'there'}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700 dark:text-slate-200/90">
              Your account now owns its own repositories, graph snapshots, and
              semantic search index. Import a branch once, sync incrementally,
              and reuse the graph everywhere from the dashboard to agent
              exports.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/repos" className={buttonStyles({ tone: 'primary' })}>
                Import repository
              </Link>
              <Link
                href="/graphs"
                className={buttonStyles({ tone: 'secondary' })}
              >
                Inspect graphs
              </Link>
            </div>
          </Surface>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          <Surface tone="soft" padding="lg">
            <Badge>Recent activity</Badge>
            <div className="mt-4 space-y-3">
              {recentRepositories.slice(0, 3).map((repo) => (
                <Surface key={repo.id} tone="default" padding="md">
                  <div className="font-medium text-slate-900 dark:text-white">
                    {repo.name}
                  </div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {repo.branch ? `Branch ${repo.branch}` : 'Graph snapshot'}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {new Date(repo.updatedAt).toLocaleString()}
                  </div>
                </Surface>
              ))}
              {!recentRepositories.length && !loading ? (
                <EmptyState message="No graphs yet. Import a repository branch to populate this dashboard." />
              ) : null}
            </div>
          </Surface>
        </motion.div>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 + index * 0.05 }}
          >
            <MetricCard
              label={card.label}
              value={loading ? '…' : card.value.toLocaleString()}
              hint={card.hint}
            />
          </motion.div>
        ))}
      </section>
      <section className="grid gap-6 xl:grid-cols-[1fr_0.92fr]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.18 }}
        >
          <Surface tone="soft" padding="lg">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Badge>Recent repositories</Badge>
                <h3 className="mt-2 font-display text-3xl text-slate-900 dark:text-white">
                  Latest graph snapshots
                </h3>
              </div>
              <Link
                href="/repos"
                className={buttonStyles({ tone: 'secondary' })}
              >
                Manage repos
              </Link>
            </div>
            <div className="mt-5 space-y-3">
              {recentRepositories.map((repo) => (
                <Surface key={repo.id} tone="default" padding="md">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">
                        {repo.name}
                      </div>
                      <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        {repo.description ||
                          'No repository description provided.'}
                      </div>
                    </div>
                    <div className="text-right text-sm text-slate-600 dark:text-slate-400">
                      <div>{repo.nodes} nodes</div>
                      <div>
                        {repo.branch
                          ? `Branch ${repo.branch}`
                          : 'Single snapshot'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {repo.techStack.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 dark:border-white/10 dark:text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </Surface>
              ))}
            </div>
          </Surface>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.24 }}
        >
          <Surface tone="elevated" padding="lg">
            <Badge tone="warm">Operational notes</Badge>
            <h3 className="mt-2 font-display text-3xl text-slate-900 dark:text-white">
              What changed
            </h3>
            <div className="mt-5 space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <Surface tone="default" padding="md">
                Data isolation now happens at the storage boundary, so
                repositories, graphs, search results, and exports are scoped to
                the signed-in account.
              </Surface>
              <Surface tone="default" padding="md">
                Each GitHub branch can become its own stored graph, and branch
                imports can seed from an existing graph to avoid rereading
                unchanged files.
              </Surface>
              <Surface tone="default" padding="md">
                GitHub sign-in now requests the email scope needed to prefer the
                user’s verified email over the noreply fallback.
              </Surface>
            </div>
          </Surface>
        </motion.div>
      </section>
    </div>
  );
}
