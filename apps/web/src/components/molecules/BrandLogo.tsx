import Image from 'next/image';
import Link from 'next/link';

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
      className={[
        'inline-flex items-center gap-3 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
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
