'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BrandLogo } from '../molecules/BrandLogo';
import { ThemeToggle } from '../molecules/ThemeToggle';
import { Button } from '../atoms/Button';
import { buttonStyles } from '../atoms/buttonStyles';
import { MenuIcon } from '../atoms/Icon';
import { cn } from '../../lib/ui';

const navLinks = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#showcase', label: 'Visualization' },
  // TODO: replace with a real `/docs` route once the docs site exists.
  { href: '#features', label: 'Docs' },
] as const;

/**
 * MarketingHeader — sticky, becomes hairline-bordered + blurred on scroll.
 * Composes BrandLogo, ThemeToggle (compact), and Buttons.
 */
export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-colors duration-300',
        scrolled
          ? 'border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--background)_82%,transparent)] backdrop-blur-xl'
          : 'border-b border-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <BrandLogo href="/" priority />
        <nav className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Link
            href="/auth/sign-in"
            className={cn(
              buttonStyles({ tone: 'ghost', size: 'sm' }),
              'hidden sm:inline-flex',
            )}
          >
            Sign in
          </Link>
          <Link
            href="/auth/sign-up"
            className={cn(
              buttonStyles({ tone: 'primary', size: 'sm' }),
              'hidden sm:inline-flex',
            )}
          >
            Get started
          </Link>
          <Button
            tone="ghost"
            size="sm"
            className="md:hidden"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <MenuIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>
      {open ? (
        <div className="border-t border-[var(--border)] bg-[var(--surface)] md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 pt-2">
              <Link
                href="/auth/sign-in"
                className={buttonStyles({
                  tone: 'secondary',
                  size: 'md',
                  fullWidth: true,
                })}
              >
                Sign in
              </Link>
              <Link
                href="/auth/sign-up"
                className={buttonStyles({
                  tone: 'primary',
                  size: 'md',
                  fullWidth: true,
                })}
              >
                Get started
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
