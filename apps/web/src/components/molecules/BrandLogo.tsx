import Image from 'next/image';
import Link from 'next/link';
import { cn } from '../../lib/ui';

type BrandLogoProps = {
  href?: string;
  className?: string;
  priority?: boolean;
};

export function BrandLogo({
  href = '/',
  className,
  priority = false,
}: BrandLogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-3 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]',
        className,
      )}
      aria-label="trchat home"
    >
      <Image
        src="/logo.svg"
        alt="trchat"
        width={198}
        height={48}
        priority={priority}
        className="h-10 w-auto"
      />
    </Link>
  );
}
