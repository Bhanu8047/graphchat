import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/ui';

export const selectClassName =
  'w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--foreground)] outline-none transition focus-visible:border-[var(--ring)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ring)_35%,transparent)]';

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
