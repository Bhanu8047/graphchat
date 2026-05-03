'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '../../lib/ui';

export const buttonStyles = tv({
  base: 'inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition duration-200 disabled:cursor-not-allowed disabled:opacity-60',
  variants: {
    tone: {
      primary:
        'bg-cyan-500 px-4 py-3 text-white hover:bg-cyan-600 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200',
      secondary:
        'border border-slate-300 bg-white/80 px-4 py-3 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-100 dark:hover:bg-white/[0.1]',
      ghost:
        'px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white',
      danger:
        'bg-rose-500 px-4 py-3 text-white hover:bg-rose-600 dark:bg-rose-300 dark:text-slate-950 dark:hover:bg-rose-200',
    },
    size: {
      sm: 'text-sm',
      md: 'text-sm',
      lg: 'px-5 py-3.5 text-base',
    },
    fullWidth: {
      true: 'w-full',
      false: '',
    },
  },
  defaultVariants: {
    tone: 'primary',
    size: 'md',
    fullWidth: false,
  },
});

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonStyles>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, tone, size, fullWidth, type = 'button', ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonStyles({ tone, size, fullWidth }), className)}
        {...props}
      />
    );
  },
);
