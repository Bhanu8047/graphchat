import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/ui';

export const inputClassName =
  'w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400/60 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-slate-500';

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input ref={ref} className={cn(inputClassName, className)} {...props} />
  );
});
