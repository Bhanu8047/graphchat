import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/ui';

export const textareaClassName =
  'w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400/60 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-slate-500';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(textareaClassName, className)}
      {...props}
    />
  );
});
