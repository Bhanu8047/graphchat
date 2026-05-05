'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { DashboardStats } from '@graphchat/shared-types';
import { api } from '../../../lib/api';
import { useAuth } from '../../auth/providers/AuthProvider';
import { Surface } from '../../../components/atoms/Surface';
import { Badge } from '../../../components/atoms/Badge';
import { buttonStyles } from '../../../components/atoms/Button';
import {
  ActivityIcon,
  ExportIcon,
  GraphIcon,
  PlusIcon,
  RepoIcon,
  SearchIcon,
  SparkleIcon,
} from '../../../components/atoms/Icon';
import { EmptyState } from '../../../components/molecules/EmptyState';
import { staggered } from '../../../lib/motion-presets';
import { cn } from '../../../lib/ui';

function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const quickActions = [
  {
    href: '/repos',
    label: 'Import repository',
    description: 'Pull a GitHub branch into a graph',
    icon: PlusIcon,
  },
  {
    href: '/graphs',
    label: 'Inspect graphs',
    description: 'Browse and explore stored graphs',
    icon: GraphIcon,
  },
  {
    href: '/search',
    label: 'Run search',
    description: 'Semantic retrieval across graphs',
    icon: SearchIcon,
  },
  {
    href: '/export',
    label: 'Export bundle',
    description: 'Agent-ready graph payloads',
    icon: ExportIcon,
  },
] as const;

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

  const metrics = [
    {
      label: 'Repositories',
      value: stats?.totals.repositories ?? 0,
      hint: 'Imported',
    },
    {
      label: 'Branch graphs',
      value: stats?.totals.graphs ?? 0,
      hint: 'Stored snapshots',
    },
    {
      label: 'Structural nodes',
      value: stats?.totals.graphNodes ?? 0,
      hint: 'Files + entities',
    },
    {
      label: 'Semantic nodes',
      value: stats?.totals.semanticNodes ?? 0,
      hint: 'Vector chunks',
    },
  ];

  const recentRepositories = stats?.recentRepositories ?? [];
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="space-y-6">
      {/* Welcome strip */}
      <motion.section
        {...staggered(0)}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div className="min-w-0">
          <Badge tone="primary">Dashboard</Badge>
          <h1 className="mt-3 truncate font-display text-2xl font-medium tracking-tight text-[var(--foreground)] sm:text-3xl">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {recentRepositories.length
              ? `${recentRepositories.length} ${recentRepositories.length === 1 ? 'repository' : 'repositories'} in your workspace.`
              : 'Connect a repository to populate your workspace.'}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href="/repos"
            className={buttonStyles({ tone: 'primary', size: 'sm' })}
          >
            <PlusIcon className="h-4 w-4" />
            Import repository
          </Link>
        </div>
      </motion.section>

      {/* Metrics */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => (
          <motion.div key={metric.label} {...staggered(index + 1)}>
            <Surface tone="default" padding="md" className="h-full">
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                {metric.label}
              </div>
              <div className="mt-3 truncate font-display text-3xl tabular-nums text-[var(--foreground)]">
                {loading ? '—' : metric.value.toLocaleString()}
              </div>
              <div className="mt-1 text-xs text-[var(--muted-foreground)]/80">
                {metric.hint}
              </div>
            </Surface>
          </motion.div>
        ))}
      </section>

      {/* Activity + Quick actions */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <motion.div {...staggered(5)} className="lg:col-span-2 min-w-0">
          <Surface tone="default" padding="lg" className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-medium text-[var(--foreground)]">
                  Recent activity
                </h2>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  Latest repository updates across your workspace
                </p>
              </div>
              <Link
                href="/repos"
                className="shrink-0 text-xs font-medium text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
              >
                View all
              </Link>
            </div>

            <div className="mt-4 max-h-[420px] flex-1 overflow-y-auto">
              {recentRepositories.length === 0 && !loading ? (
                <EmptyState message="No activity yet. Import a repository to get started." />
              ) : (
                <ul className="space-y-2">
                  {recentRepositories.slice(0, 8).map((repo) => (
                    <li
                      key={repo.id}
                      className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 transition hover:border-[var(--border-strong)]"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] text-[var(--primary)]">
                        <ActivityIcon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate text-sm font-medium text-[var(--foreground)]">
                            {repo.name}
                          </div>
                          <div className="shrink-0 text-xs tabular-nums text-[var(--muted-foreground)]">
                            {new Date(repo.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="truncate text-xs text-[var(--muted-foreground)]">
                          {repo.branch ? `Branch ${repo.branch}` : 'Snapshot'}
                          {' · '}
                          {repo.nodes} nodes
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Surface>
        </motion.div>

        <motion.div {...staggered(6)} className="min-w-0">
          <Surface tone="default" padding="lg" className="flex h-full flex-col">
            <h2 className="text-base font-medium text-[var(--foreground)]">
              Quick actions
            </h2>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Jump into common tasks
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className={cn(
                      'group flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 transition',
                      'hover:border-[var(--border-strong)] hover:shadow-[0_8px_28px_-18px_color-mix(in_oklab,var(--color-space-indigo-700)_40%,transparent)]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
                    )}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] text-[var(--primary)] transition group-hover:bg-[var(--primary)] group-hover:text-[var(--primary-foreground)]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="text-sm font-medium text-[var(--foreground)]">
                        {action.label}
                      </div>
                      <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                        {action.description}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Surface>
        </motion.div>
      </section>

      {/* Recent graphs rail */}
      <motion.section {...staggered(7)} className="min-w-0">
        <Surface tone="default" padding="lg">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-medium text-[var(--foreground)]">
                Recent graphs
              </h2>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Latest snapshots across your repositories
              </p>
            </div>
            <Link
              href="/graphs"
              className="shrink-0 text-xs font-medium text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
            >
              Browse all
            </Link>
          </div>

          {recentRepositories.length === 0 && !loading ? (
            <div className="mt-4">
              <EmptyState message="No graphs yet. Import a repository to build your first graph." />
            </div>
          ) : (
            <div
              className="mt-4 -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2"
              style={{ scrollbarWidth: 'thin' }}
            >
              {recentRepositories.slice(0, 8).map((repo) => (
                <article
                  key={repo.id}
                  className="flex w-64 shrink-0 snap-start flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 transition hover:border-[var(--border-strong)]"
                >
                  <div className="flex h-24 items-center justify-center rounded-lg bg-[color-mix(in_oklab,var(--color-dusty-olive-200)_60%,transparent)] text-[var(--color-dusty-olive-700)] dark:bg-[color-mix(in_oklab,var(--color-space-indigo-700)_50%,transparent)] dark:text-[var(--color-dusty-olive-200)]">
                    <GraphIcon className="h-8 w-8" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-[var(--foreground)]">
                      {repo.name}
                    </div>
                    <div className="truncate text-xs text-[var(--muted-foreground)]">
                      {repo.branch ? `Branch ${repo.branch}` : 'Snapshot'}
                      {' · '}
                      {repo.nodes} nodes
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {repo.techStack.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[0.65rem] text-[var(--muted-foreground)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </Surface>
      </motion.section>

      {/* Footer hint */}
      <motion.div
        {...staggered(8)}
        className="flex flex-col gap-2 rounded-xl border border-dashed border-[var(--border)] px-4 py-3 text-xs text-[var(--muted-foreground)] sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-2">
          <SparkleIcon className="h-4 w-4 text-[var(--accent)]" />
          New to Vector Graph? Read the quickstart to import your first repo.
        </div>
        <Link
          href="/repos"
          className="font-medium text-[var(--foreground)] underline-offset-4 hover:underline"
        >
          Get started →
        </Link>
      </motion.div>
    </div>
  );
}
