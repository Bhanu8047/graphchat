import Link from 'next/link';
import { Badge } from '../../../components/atoms/Badge';
import { MarketingShell } from '../../../components/templates/MarketingShell';

export const metadata = {
  title: 'Privacy Policy — trchat',
  description: 'How trchat stores and protects your data.',
};

const EFFECTIVE_DATE = 'May 5, 2026';

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-10 font-display text-xl font-semibold text-[var(--foreground)]">
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-6 font-semibold text-[var(--foreground)]">{children}</h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
      {children}
    </p>
  );
}

function UL({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-3 space-y-1.5 pl-5 text-sm leading-7 text-[var(--muted-foreground)]">
      {items.map((item) => (
        <li key={item} className="list-disc">
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function PrivacyPage() {
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="border-b border-[var(--border)]">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <Badge>Legal</Badge>
          <h1 className="mt-4 font-display text-4xl font-medium tracking-tight text-[var(--foreground)]">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">
            Effective date: {EFFECTIVE_DATE}
          </p>
        </div>
      </section>

      {/* Body */}
      <section className="mx-auto max-w-3xl px-4 py-12 pb-24 sm:px-6 lg:px-8">
        <P>
          trchat (&quot;we&quot;, &quot;our&quot;, or &quot;the service&quot;)
          is an open-source tool that builds and stores repository knowledge
          graphs so that you — and the AI agents you authorise — can query
          structured context efficiently. This policy explains what data we
          store, why, and what we never do with it.
        </P>
        <P>
          <strong className="font-semibold text-[var(--foreground)]">
            Short version:
          </strong>{' '}
          Your data belongs to you. We store it on your behalf so your tools can
          use it. We do not analyse, sell, share, or monetise it in any way.
        </P>

        <H2>1. What data we store</H2>

        <H3>Account information</H3>
        <P>
          When you create an account we store your email address, a bcrypt hash
          of your password (never the plaintext), and an optional display name.
          If you sign in via GitHub OAuth we store your GitHub user ID and email
          instead of a password.
        </P>

        <H3>Repository graph data</H3>
        <P>
          When you connect a repository we store the following — exclusively for
          serving your own queries:
        </P>
        <UL
          items={[
            'Repository metadata: name, remote URL, branch name, last-sync timestamp.',
            'Graph nodes: file paths, symbol names, docstrings, and code chunks extracted by static analysis.',
            'Graph edges: call-site relationships, import links, and inferred connections.',
            'Vector embeddings: numeric representations of code chunks used for semantic search.',
            'Community and cluster labels produced by the Leiden algorithm.',
          ]}
        />
        <P>
          This data is stored solely so you and the agents you authorise can
          query it. It is never read, analysed, or used by us for any purpose
          beyond serving your requests.
        </P>

        <H3>API keys and session tokens</H3>
        <P>
          API keys (
          <code className="rounded bg-[var(--surface-muted)] px-1 font-mono text-xs">
            sk-trchat-…
          </code>
          ) are stored as bcrypt hashes only. The plaintext key is shown once at
          creation and is not stored anywhere in our system. JWT access and
          refresh tokens are stored hashed and expire automatically.
        </P>

        <H3>Operational logs</H3>
        <P>We collect minimal data to keep the service running:</P>
        <UL
          items={[
            'Request logs (endpoint, HTTP status, response latency) — retained for up to 30 days for debugging.',
            'Error traces — retained for up to 14 days.',
            'Aggregated Redis cache counters — not tied to individual users.',
          ]}
        />
        <P>
          We do not use tracking cookies. Session cookies maintain your
          authenticated browser session only and expire on sign-out.
        </P>

        <H2>2. What we do not do</H2>
        <UL
          items={[
            'We do not sell, rent, or share your data with any third party.',
            'We do not run analytics or machine-learning models on your repository content.',
            'We do not use your code or graph data to train any AI model.',
            'We do not serve advertising of any kind.',
            'We do not track you across other websites or services.',
            'We do not process your data for any purpose other than fulfilling your own requests.',
          ]}
        />

        <H2>3. Open-source transparency</H2>
        <P>
          trchat is open-source software. The full server-side code — including
          every data-access path — is publicly available for inspection. You can
          verify exactly what queries run against your data and where results
          go. If you find a discrepancy between this policy and the code, please
          file an issue in the repository.
        </P>

        <H2>4. Data sharing</H2>
        <P>We share data only in the following narrow circumstances:</P>
        <UL
          items={[
            'GitHub OAuth: if you choose GitHub sign-in, GitHub shares your public email and user ID with us per their OAuth flow. We do not send your repository data back to GitHub beyond the standard API calls needed to list branches you explicitly select.',
            'Infrastructure providers: your data is hosted on servers running the trchat software. Infrastructure providers have no access to application-layer data.',
            'Legal obligation: if required by a valid court order we may disclose the minimum data necessary, and we will notify you in advance where legally permitted.',
          ]}
        />

        <H2>5. Data retention and deletion</H2>
        <P>
          Your data is retained for as long as your account is active. You can
          delete individual repositories — and all associated graph data — from
          the dashboard at any time. To delete your entire account, email{' '}
          <a
            href="mailto:privacy@trchat.co"
            className="text-[var(--primary)] underline underline-offset-2"
          >
            privacy@trchat.co
          </a>
          . We will permanently erase all data within 30 days.
        </P>
        <P>
          Operational logs are deleted on the schedules above. Database backups
          are purged within 90 days of account deletion.
        </P>

        <H2>6. Security</H2>
        <P>We protect your data using:</P>
        <UL
          items={[
            'TLS encryption in transit for all API and web traffic.',
            'Bcrypt hashing for passwords and API keys — no plaintext secrets are ever stored.',
            'Per-user rate limiting via a Redis sliding-window counter.',
            'SSRF protection on all repository URLs — only public http/https hosts are accepted.',
            'Path containment checks to prevent directory traversal in file operations.',
            'HTML entity escaping on all user-supplied node labels to prevent XSS in exported graphs.',
          ]}
        />
        <P>
          No system is perfectly secure. If you discover a vulnerability please
          disclose it responsibly by opening a security advisory in the
          repository or emailing{' '}
          <a
            href="mailto:security@trchat.co"
            className="text-[var(--primary)] underline underline-offset-2"
          >
            security@trchat.co
          </a>
          .
        </P>

        <H2>7. Your rights</H2>
        <P>Regardless of where you are located, you have the right to:</P>
        <UL
          items={[
            'Access: request a copy of the data we hold about you.',
            'Correction: update incorrect account information via the Settings page.',
            'Deletion: remove individual repositories from the dashboard, or request full account deletion.',
            'Export: use gph export or the REST API to download your graph data at any time in machine-readable JSON.',
            'Portability: graph data is stored in open formats (node-link JSON, GraphML) with no vendor lock-in.',
          ]}
        />

        <H2>8. Children</H2>
        <P>
          trchat is not directed at children under 13. We do not knowingly
          collect data from anyone under 13. If you believe we have
          inadvertently done so, contact us and we will delete it promptly.
        </P>

        <H2>9. Changes to this policy</H2>
        <P>
          If we make material changes we will update the effective date above
          and, where feasible, notify active users by email at least 14 days
          before the change takes effect. Continued use of the service after
          that date constitutes acceptance of the revised policy.
        </P>

        <H2>10. Contact</H2>
        <P>Questions about this policy or data requests:</P>
        <P>
          <a
            href="mailto:privacy@trchat.co"
            className="text-[var(--primary)] underline underline-offset-2"
          >
            privacy@trchat.co
          </a>
        </P>

        <div className="mt-12 border-t border-[var(--border)] pt-6 text-xs text-[var(--muted-foreground)]">
          See also:{' '}
          <Link
            href="/legal/terms"
            className="text-[var(--primary)] underline underline-offset-2"
          >
            Terms of Service
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}
