import { type HTMLAttributes } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '../../lib/ui';

const badgeStyles = tv({
  base: 'inline-flex items-center rounded-full border px-3 py-1 text-[0.72rem] font-medium uppercase tracking-[0.22em]',
  variants: {
    tone: {
      neutral:
        'border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted-foreground)]',
      accent:
        'border-transparent bg-[color-mix(in_oklab,var(--accent)_18%,transparent)] text-[var(--accent)] dark:bg-[color-mix(in_oklab,var(--accent)_22%,transparent)] dark:text-[var(--color-berry-crush-100)]',
      warm: 'border-transparent bg-[color-mix(in_oklab,var(--color-rosy-taupe-300)_30%,transparent)] text-[var(--color-rosy-taupe-700)] dark:bg-[color-mix(in_oklab,var(--color-rosy-taupe-700)_45%,transparent)] dark:text-[var(--color-rosy-taupe-100)]',
      success:
        'border-transparent bg-[color-mix(in_oklab,var(--color-dusty-olive-300)_35%,transparent)] text-[var(--color-dusty-olive-800)] dark:bg-[color-mix(in_oklab,var(--color-dusty-olive-700)_50%,transparent)] dark:text-[var(--color-dusty-olive-100)]',
      primary:
        'border-transparent bg-[color-mix(in_oklab,var(--primary)_18%,transparent)] text-[var(--primary)] dark:text-[var(--color-space-indigo-100)]',
    },
  },
  defaultVariants: {
    tone: 'neutral',
  },
});

type BadgeProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof badgeStyles>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <div className={cn(badgeStyles({ tone }), className)} {...props} />;
}
