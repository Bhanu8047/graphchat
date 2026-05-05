import Link from 'next/link';
import { Badge } from '../../../components/atoms/Badge';
import { MarketingShell } from '../../../components/templates/MarketingShell';

export const metadata = {
  title: 'Terms of Service — trchat',
  description: 'Terms governing your use of the trchat service.',
};

const EFFECTIVE_DATE = 'May 5, 2026';

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-10 font-display text-xl font-semibold text-[var(--foreground)]">
      {children}
    </h2>
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

export default function TermsPage() {
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="border-b border-[var(--border)]">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <Badge>Legal</Badge>
          <h1 className="mt-4 font-display text-4xl font-medium tracking-tight text-[var(--foreground)]">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">
            Effective date: {EFFECTIVE_DATE}
          </p>
        </div>
      </section>

      {/* Body */}
      <section className="mx-auto max-w-3xl px-4 py-12 pb-24 sm:px-6 lg:px-8">
        <P>
          By accessing or using trchat (&quot;the service&quot;) you agree to
          these Terms of Service. If you do not agree, do not use the service.
        </P>

        <H2>1. Open-source software</H2>
        <P>
          trchat is open-source software released under the{' '}
          <strong className="font-medium text-[var(--foreground)]">
            MIT License
          </strong>
          . The source code is publicly available and you are free to inspect,
          fork, self-host, and modify it under the terms of that licence. Using
          this hosted instance is governed by these Terms; self-hosting is
          governed solely by the MIT License.
        </P>
        <P>
          The MIT License grants you a perpetual, worldwide, royalty-free right
          to use, copy, modify, merge, publish, distribute, sublicense, and sell
          copies of the software, subject to retaining the copyright notice and
          this permission notice in all copies.
        </P>

        <H2>2. Your data and your ownership</H2>
        <P>
          <strong className="font-medium text-[var(--foreground)]">
            You own all data you bring to trchat.
          </strong>{' '}
          Repository content, graph nodes, embeddings, and exports belong to you
          or to the rights holders of the repositories you connect. By using the
          service you grant us a limited, non-exclusive licence to store and
          process that data solely for the purpose of fulfilling your queries
          and returning results to you.
        </P>
        <P>
          We do not claim any rights over your data beyond what is strictly
          necessary to operate the service. We will never use your repository
          content to train models, run analytics, or derive insights for our own
          benefit. See the{' '}
          <Link
            href="/legal/privacy"
            className="text-[var(--primary)] underline underline-offset-2"
          >
            Privacy Policy
          </Link>{' '}
          for full details.
        </P>

        <H2>3. Accounts and API keys</H2>
        <UL
          items={[
            'You are responsible for maintaining the confidentiality of your password and any API keys you generate.',
            'API keys (sk-trchat-…) are shown once at creation. Store them securely; we cannot recover them.',
            'You must notify us immediately at security@trchat.co if you suspect unauthorised access to your account.',
            'You may not share your account or API keys with others in a way that circumvents per-user rate limits or access controls.',
            'You may create multiple API keys with different scopes for different use-cases (CI, local CLI, agent workflows).',
          ]}
        />

        <H2>4. Acceptable use</H2>
        <P>You may use trchat for any lawful purpose. You must not:</P>
        <UL
          items={[
            'Connect repositories or data you do not have the right to access or index.',
            "Attempt to access other users' data, graphs, or accounts.",
            'Use the service to scrape, probe, or map infrastructure beyond what the API explicitly provides.',
            'Circumvent rate limits, authentication, or other security controls.',
            'Upload malicious code or data designed to exploit the service or other users.',
            'Use the service for any purpose that violates applicable law or the rights of third parties.',
          ]}
        />
        <P>
          Repositories you connect must comply with the terms of the platform
          hosting them (e.g. GitHub Terms of Service). We are not responsible
          for content in repositories you choose to index.
        </P>

        <H2>5. Third-party services</H2>
        <P>
          trchat integrates with GitHub for repository access and OAuth sign-in.
          Your use of GitHub is subject to{' '}
          <a
            href="https://docs.github.com/en/site-policy/github-terms/github-terms-of-service"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--primary)] underline underline-offset-2"
          >
            GitHub&apos;s Terms of Service
          </a>
          . We are not affiliated with or endorsed by GitHub.
        </P>
        <P>
          The service may depend on third-party infrastructure (hosting,
          databases, caches). We select providers carefully but are not
          responsible for their availability or policies.
        </P>

        <H2>6. Rate limits and fair use</H2>
        <P>
          We apply per-user rate limits to protect the service for all users.
          Limits are enforced via a Redis sliding-window counter and are
          configurable by administrators on self-hosted instances. Sustained
          abuse of the API may result in temporary or permanent suspension of
          your account.
        </P>

        <H2>7. Service availability</H2>
        <P>
          We aim for high availability but provide the service &quot;as-is&quot;
          without uptime guarantees. We may perform maintenance, updates, or
          emergency changes at any time. We will provide reasonable advance
          notice of planned downtime where possible.
        </P>

        <H2>8. Disclaimer of warranties</H2>
        <P>
          To the maximum extent permitted by applicable law, trchat is provided
          &quot;as is&quot; and &quot;as available&quot;, without warranty of
          any kind, express or implied, including but not limited to warranties
          of merchantability, fitness for a particular purpose, or
          non-infringement. This is standard for open-source software under the
          MIT License.
        </P>
        <P>
          We do not warrant that the service will be error-free, uninterrupted,
          or that graph outputs will be accurate, complete, or suitable for any
          particular purpose. You are responsible for validating any graph data
          before acting on it in production systems.
        </P>

        <H2>9. Limitation of liability</H2>
        <P>
          To the maximum extent permitted by law, we are not liable for any
          indirect, incidental, special, consequential, or punitive damages
          arising from your use of the service, including but not limited to
          loss of data, lost profits, or service interruption — even if we have
          been advised of the possibility of such damages.
        </P>
        <P>
          Our total liability for any claim arising out of or relating to these
          Terms shall not exceed the amount you paid us in the twelve months
          preceding the event giving rise to the claim (or USD $50 if you have
          paid nothing).
        </P>

        <H2>10. Indemnification</H2>
        <P>
          You agree to indemnify and hold harmless trchat and its contributors
          from any claim, loss, or damage arising from: (a) your use of the
          service in violation of these Terms; (b) data you submit to the
          service; or (c) your violation of any third-party rights.
        </P>

        <H2>11. Termination</H2>
        <P>
          You may stop using the service and delete your account at any time. We
          may suspend or terminate accounts that violate these Terms, with or
          without notice depending on severity. On termination, your data will
          be deleted per the schedule in the{' '}
          <Link
            href="/legal/privacy"
            className="text-[var(--primary)] underline underline-offset-2"
          >
            Privacy Policy
          </Link>
          .
        </P>

        <H2>12. Changes to these Terms</H2>
        <P>
          We may update these Terms from time to time. Material changes will be
          communicated by email and by updating the effective date above, with
          at least 14 days&apos; notice. Continued use after that date
          constitutes acceptance of the revised Terms.
        </P>

        <H2>13. Governing law</H2>
        <P>
          These Terms are governed by the laws of the jurisdiction in which the
          service operator is established, without regard to conflict-of-law
          principles. Disputes that cannot be resolved informally will be
          submitted to the courts of that jurisdiction.
        </P>

        <H2>14. Contact</H2>
        <P>
          Questions about these Terms:{' '}
          <a
            href="mailto:legal@trchat.co"
            className="text-[var(--primary)] underline underline-offset-2"
          >
            legal@trchat.co
          </a>
        </P>

        <div className="mt-12 border-t border-[var(--border)] pt-6 text-xs text-[var(--muted-foreground)]">
          See also:{' '}
          <Link
            href="/legal/privacy"
            className="text-[var(--primary)] underline underline-offset-2"
          >
            Privacy Policy
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}
