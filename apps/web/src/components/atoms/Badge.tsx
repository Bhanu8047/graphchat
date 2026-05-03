import { type HTMLAttributes } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '../../lib/ui';

const badgeStyles = tv({
  base: 'inline-flex items-center rounded-full border px-3 py-1 text-[0.72rem] font-medium uppercase tracking-[0.22em]',
  variants: {
    tone: {
      neutral:
        'border-slate-300 bg-white/70 text-slate-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-400',
      accent:
        'border-cyan-300/60 bg-cyan-100 text-cyan-700 dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-100',
      warm: 'border-orange-300/60 bg-orange-100 text-orange-700 dark:border-orange-300/20 dark:bg-orange-300/10 dark:text-orange-100',
      success:
        'border-emerald-300/60 bg-emerald-100 text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100',
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
