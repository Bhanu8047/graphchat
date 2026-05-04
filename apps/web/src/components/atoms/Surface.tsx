import { type HTMLAttributes } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '../../lib/ui';

/**
 * Surface — semantic container atom.
 *
 * All tones are derived from semantic tokens (--surface, --border, ...) so a
 * single dark/light flip in `globals.css` re-themes every consumer.
 */
export const surfaceStyles = tv({
  base: 'rounded-[var(--radius-card)] border border-[var(--border)] text-[var(--foreground)] shadow-[0_18px_48px_-28px_color-mix(in_oklab,var(--color-space-indigo-900)_30%,transparent)] backdrop-blur-xl',
  variants: {
    tone: {
      default: 'bg-[var(--surface)]',
      elevated:
        'bg-[var(--surface)] shadow-[0_28px_80px_-30px_color-mix(in_oklab,var(--color-space-indigo-900)_40%,transparent)]',
      soft: 'bg-[var(--surface-muted)] border-transparent shadow-none',
      hero: 'gradient-hero text-white border-transparent shadow-[0_30px_80px_-30px_color-mix(in_oklab,var(--color-space-indigo-700)_60%,transparent)]',
      olive:
        'gradient-olive text-white border-transparent shadow-[0_30px_80px_-30px_color-mix(in_oklab,var(--color-dusty-olive-700)_60%,transparent)]',
      danger:
        'border-[var(--color-berry-crush-300)] bg-[color-mix(in_oklab,var(--color-berry-crush-50)_85%,transparent)] text-[var(--color-berry-crush-800)] dark:border-[var(--color-berry-crush-700)] dark:bg-[color-mix(in_oklab,var(--color-berry-crush-900)_70%,transparent)] dark:text-[var(--color-berry-crush-100)]',
    },
    padding: {
      none: 'p-0',
      sm: 'p-4',
      md: 'p-5',
      lg: 'p-6',
      xl: 'p-8',
    },
  },
  defaultVariants: {
    tone: 'default',
    padding: 'lg',
  },
});

type SurfaceProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof surfaceStyles>;

export function Surface({ className, tone, padding, ...props }: SurfaceProps) {
  return (
    <div
      className={cn(surfaceStyles({ tone, padding }), className)}
      {...props}
    />
  );
}
