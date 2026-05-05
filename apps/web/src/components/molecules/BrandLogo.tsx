import Image from 'next/image';
import Link from 'next/link';
import { cn } from '../../lib/ui';

type BrandLogoProps = {
  href?: string;
  className?: string;
  priority?: boolean;
  /** Hide the wordmark and show only the icon (e.g. compact contexts). */
  iconOnly?: boolean;
};

export function BrandLogo({
  href = '/',
  className,
  priority = false,
  iconOnly = false,
}: BrandLogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group inline-flex items-center gap-2.5 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]',
        className,
      )}
      aria-label="graphchat home"
    >
      <Image
        src="/logo.svg"
        alt=""
        aria-hidden
        width={44}
        height={48}
        priority={priority}
        className="h-9 w-auto transition-transform duration-300 group-hover:-rotate-6"
      />
      {!iconOnly ? (
        <span className="font-display text-[1.35rem] font-semibold leading-none tracking-tight">
          <span className="text-[var(--foreground)]">graph</span>
          <span className="gradient-text-hero">chat</span>
          <span
            aria-hidden
            className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full align-baseline"
            style={{ backgroundColor: 'var(--color-berry-crush-500)' }}
          />
        </span>
      ) : null}
    </Link>
  );
}
