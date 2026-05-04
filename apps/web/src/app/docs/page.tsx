import Link from 'next/link';
import { Badge } from '../../components/atoms/Badge';
import { buttonStyles } from '../../components/atoms/buttonStyles';
import { Surface } from '../../components/atoms/Surface';
import { MarketingShell } from '../../components/templates/MarketingShell';

export const metadata = {
  title: 'Docs — trchat',
  description:
    'Quick-start documentation for repository ingestion, graph querying, and deployment in trchat.',
};

const quickstartSteps = [
  {
    title: 'Authenticate',
    description:
      'Create an account or sign in with GitHub to connect repositories and manage graph builds.',
  },
  {
    title: 'Import a repository',
    description:
      'Select a repository and branch, then trigger ingestion to build the initial graph snapshot.',
  },
  {
    title: 'Query the graph',
    description:
      'Use semantic search, graph views, and export endpoints to retrieve the exact context you need.',
  },
] as const;

const apiSections = [
  {
    title: 'Authentication',
    items: [
      'POST /api/auth/login',
      'POST /api/auth/register',
      'GET /api/auth/session',
    ],
  },
  {
    title: 'GitHub import',
    items: ['GET /api/github/branches', 'POST /api/github/import'],
  },
  {
    title: 'System',
    items: [
      'GET /api/health',
      'Dashboard, graph, export, and search routes under the app shell',
    ],
  },
] as const;

const deploymentNotes = [
  'Run the web app through Nx so builds, caching, and task wiring stay consistent with the workspace.',
  'Use the Docker files in the repository root when deploying the API, web app, and graph service together.',
  'Treat exports as branch-specific artifacts so agent context stays aligned with the graph snapshot that produced it.',
] as const;

export default function DocsPage() {
  return (
    <MarketingShell>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-70"
          style={{
            backgroundImage:
              'radial-gradient(42rem 22rem at 10% 0%, color-mix(in oklab, var(--color-space-indigo-200) 55%, transparent), transparent 60%), radial-gradient(36rem 18rem at 90% 10%, color-mix(in oklab, var(--color-rosy-taupe-300) 55%, transparent), transparent 60%)',
          }}
        />
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <Badge tone="primary">Documentation</Badge>
          <h1 className="mt-5 max-w-3xl font-display text-4xl font-medium leading-tight tracking-tight text-[var(--foreground)] sm:text-5xl">
            Build repository graphs once, then query them with precision.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted-foreground)] sm:text-lg">
            This page covers the quickest path from authentication to graph
            ingestion, querying, and deployment for the current trchat
            workspace.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/auth/sign-up"
              className={buttonStyles({ tone: 'primary', size: 'lg' })}
            >
              Get started
            </Link>
            <Link
              href="/#how-it-works"
              className={buttonStyles({ tone: 'secondary', size: 'lg' })}
            >
              View product overview
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-3 lg:px-8 lg:py-16">
        {quickstartSteps.map((step, index) => (
          <Surface key={step.title} tone="elevated" padding="lg">
            <div className="text-sm font-medium text-[var(--primary)]">
              Step {index + 1}
            </div>
            <h2 className="mt-3 text-xl font-semibold text-[var(--foreground)]">
              {step.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
              {step.description}
            </p>
          </Surface>
        ))}
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:pb-16">
        <Surface padding="xl">
          <Badge tone="accent">API surface</Badge>
          <div className="mt-6 space-y-6">
            {apiSections.map((section) => (
              <div key={section.title}>
                <h2 className="text-lg font-semibold text-[var(--foreground)]">
                  {section.title}
                </h2>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--muted-foreground)]">
                  {section.items.map((item) => (
                    <li
                      key={item}
                      className="rounded-xl bg-[var(--surface-muted)] px-4 py-3"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Surface>

        <Surface tone="soft" padding="xl">
          <Badge tone="success">Deployment notes</Badge>
          <ul className="mt-6 space-y-4 text-sm leading-6 text-[var(--muted-foreground)]">
            {deploymentNotes.map((note) => (
              <li
                key={note}
                className="border-b border-[var(--border)] pb-4 last:border-b-0 last:pb-0"
              >
                {note}
              </li>
            ))}
          </ul>
        </Surface>
      </section>
    </MarketingShell>
  );
}
