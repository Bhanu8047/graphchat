import { type ReactNode } from 'react';
import { Surface } from '../atoms/Surface';

type NoticeProps = {
  tone: 'error' | 'success' | 'info';
  children: ReactNode;
};

const toneClassNames: Record<NoticeProps['tone'], string> = {
  error:
    'border-rose-300/60 bg-rose-50/90 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200',
  success:
    'border-emerald-300/60 bg-emerald-50/90 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
  info: 'border-cyan-300/60 bg-cyan-50/90 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-100',
};

export function Notice({ tone, children }: NoticeProps) {
  return (
    <Surface className={toneClassNames[tone]} padding="sm">
      {children}
    </Surface>
  );
}
