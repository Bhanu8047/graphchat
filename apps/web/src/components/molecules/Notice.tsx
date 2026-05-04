import { type ReactNode } from 'react';
import { Surface } from '../atoms/Surface';
import { cn } from '../../lib/ui';

type NoticeProps = {
  tone: 'error' | 'success' | 'info';
  children: ReactNode;
};

const toneClassNames: Record<NoticeProps['tone'], string> = {
  error:
    'border-[color-mix(in_oklab,var(--color-berry-crush-400)_60%,transparent)] bg-[color-mix(in_oklab,var(--color-berry-crush-50)_85%,transparent)] text-[var(--color-berry-crush-800)] dark:border-[color-mix(in_oklab,var(--color-berry-crush-500)_55%,transparent)] dark:bg-[color-mix(in_oklab,var(--color-berry-crush-900)_70%,transparent)] dark:text-[var(--color-berry-crush-100)]',
  success:
    'border-[color-mix(in_oklab,var(--color-dusty-olive-400)_60%,transparent)] bg-[color-mix(in_oklab,var(--color-dusty-olive-50)_85%,transparent)] text-[var(--color-dusty-olive-800)] dark:border-[color-mix(in_oklab,var(--color-dusty-olive-500)_50%,transparent)] dark:bg-[color-mix(in_oklab,var(--color-dusty-olive-900)_70%,transparent)] dark:text-[var(--color-dusty-olive-100)]',
  info: 'border-[color-mix(in_oklab,var(--color-space-indigo-400)_60%,transparent)] bg-[color-mix(in_oklab,var(--color-space-indigo-50)_85%,transparent)] text-[var(--color-space-indigo-800)] dark:border-[color-mix(in_oklab,var(--color-space-indigo-500)_50%,transparent)] dark:bg-[color-mix(in_oklab,var(--color-space-indigo-900)_70%,transparent)] dark:text-[var(--color-space-indigo-100)]',
};

export function Notice({ tone, children }: NoticeProps) {
  return (
    <Surface className={cn(toneClassNames[tone], 'shadow-none')} padding="sm">
      {children}
    </Surface>
  );
}
