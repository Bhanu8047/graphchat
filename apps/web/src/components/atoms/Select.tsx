import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/ui';

export const selectClassName =
  'w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-400/60 dark:border-white/10 dark:bg-white/[0.04] dark:text-white';

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(selectClassName, className)} {...props}>
      {children}
    </select>
  );
});
