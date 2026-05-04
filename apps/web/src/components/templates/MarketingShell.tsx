import { type ReactNode } from 'react';
import { MarketingHeader } from '../organisms/MarketingHeader';
import { MarketingFooter } from '../organisms/MarketingFooter';

/**
 * MarketingShell — slot-based template for marketing pages.
 * Holds Header + main + Footer; consumers pass the page sections via children.
 */
export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
