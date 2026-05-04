'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/ui';
import { buttonStyles, type ButtonVariantProps } from './buttonStyles';

// Re-export so existing `import { buttonStyles } from '.../atoms/Button'`
// callers keep working (Liskov: callers swap in/out without breaking).
export { buttonStyles } from './buttonStyles';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & ButtonVariantProps;

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
