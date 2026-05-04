'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BrandLogo } from '../molecules/BrandLogo';
import { ThemeToggle } from '../molecules/ThemeToggle';
import { buttonStyles } from '../atoms/buttonStyles';
import { cn } from '../../lib/ui';

export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);

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
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Link
            href="/capabilities"
            className={cn(
              buttonStyles({ tone: 'ghost', size: 'sm' }),
              'hidden sm:inline-flex',
            )}
          >
            Capabilities
          </Link>
          <Link
            href="/docs"
            className={cn(
              buttonStyles({ tone: 'ghost', size: 'sm' }),
              'hidden sm:inline-flex',
            )}
          >
            Docs
          </Link>
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
            className={buttonStyles({ tone: 'primary', size: 'sm' })}
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
