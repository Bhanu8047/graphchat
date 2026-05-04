import Link from 'next/link';
import { BrandLogo } from '../molecules/BrandLogo';
import { ThemeToggle } from '../molecules/ThemeToggle';

const columns = [
  {
    title: 'Product',
    links: [
      { href: '#features', label: 'Features' },
      { href: '#how-it-works', label: 'How it works' },
      { href: '#showcase', label: 'Visualization' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/auth/sign-up', label: 'Get started' },
      { href: '/auth/sign-in', label: 'Sign in' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '#', label: 'Privacy' },
      { href: '#', label: 'Terms' },
    ],
  },
] as const;

export function MarketingFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface-muted)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-8">
        <div>
          <BrandLogo href="/" />
          <p className="mt-4 max-w-sm text-sm leading-6 text-[var(--muted-foreground)]">
            Persistent repository graphs for humans and AI agents — minimal,
            fast, and built for incremental sync.
          </p>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              {column.title}
            </div>
            <ul className="mt-4 space-y-2">
              {column.links.map((link) => (
                <li key={`${column.title}-${link.label}`}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--foreground)] transition hover:text-[var(--primary)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <div className="text-xs text-[var(--muted-foreground)]">
            © {new Date().getFullYear()} trchat. All rights reserved.
          </div>
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
