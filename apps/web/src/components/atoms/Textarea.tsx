import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/ui';

export const textareaClassName =
  'w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)]/60 focus-visible:border-[var(--ring)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ring)_35%,transparent)]';

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
