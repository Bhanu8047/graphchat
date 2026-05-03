import { type HTMLAttributes } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '../../lib/ui';

export const surfaceStyles = tv({
  base: 'rounded-[28px] border shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:shadow-[0_24px_80px_rgba(2,8,23,0.32)]',
  variants: {
    tone: {
      default:
        'border-slate-200/80 bg-white/82 text-slate-900 dark:border-white/10 dark:bg-slate-950/58 dark:text-slate-100',
      elevated:
        'border-slate-200 bg-white/92 text-slate-900 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(8,15,28,0.96),rgba(6,10,18,0.88))] dark:text-slate-100',
      hero: 'border-cyan-200/80 bg-[linear-gradient(140deg,rgba(103,232,249,0.38),rgba(255,255,255,0.96)_45%,rgba(251,146,60,0.22))] text-slate-900 dark:border-white/10 dark:bg-[linear-gradient(140deg,rgba(34,211,238,0.18),rgba(12,20,35,0.94)_48%,rgba(249,115,22,0.16))] dark:text-slate-100',
      soft: 'border-slate-200/80 bg-white/66 text-slate-900 dark:border-white/10 dark:bg-white/[0.045] dark:text-slate-100',
      danger:
        'border-rose-200/80 bg-rose-50/80 text-slate-900 dark:border-rose-400/20 dark:bg-rose-500/5 dark:text-slate-100',
    },
    padding: {
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
