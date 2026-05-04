import { type ReactNode } from 'react';
import { cn } from '../../lib/ui';

type AuthFrameProps = {
  children: ReactNode;
  maxWidth?: '4xl' | '7xl';
};

const widthMap: Record<NonNullable<AuthFrameProps['maxWidth']>, string> = {
  '4xl': 'max-w-4xl',
  '7xl': 'max-w-7xl',
};

export function AuthFrame({ children, maxWidth = '7xl' }: AuthFrameProps) {
  return (
    <div className="min-h-screen px-4 py-6 text-[var(--foreground)] sm:py-8 lg:px-8">
      <div className={cn('mx-auto', widthMap[maxWidth])}>{children}</div>
    </div>
  );
}
