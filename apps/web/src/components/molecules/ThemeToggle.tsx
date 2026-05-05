'use client';

import { ThemeMode } from '@trchat/shared-types';
import { MonitorIcon, MoonIcon, SunIcon } from '../atoms/Icon';
import { useTheme } from '../../features/theme/providers/ThemeProvider';
import { cn } from '../../lib/ui';

type ThemeOption = {
  value: ThemeMode;
  label: string;
  Icon: typeof SunIcon;
};

const themeOptions: readonly ThemeOption[] = [
  { value: 'light', label: 'Light', Icon: SunIcon },
  { value: 'dark', label: 'Dark', Icon: MoonIcon },
  { value: 'system', label: 'System', Icon: MonitorIcon },
];

type ThemeToggleProps = {
  /** Render as a stacked label-and-segmented control (sidebars) vs. a compact pill (headers). */
  variant?: 'compact' | 'labeled';
  className?: string;
};

export function ThemeToggle({
  variant = 'compact',
  className,
}: ThemeToggleProps) {
  const { mode, setMode } = useTheme();

  const segmented = (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1',
        className,
      )}
    >
      {themeOptions.map(({ value, label, Icon }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setMode(value)}
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
              active
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_4px_12px_-4px_color-mix(in_oklab,var(--primary)_60%,transparent)]'
                : 'text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]',
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );

  if (variant === 'compact') {
    return segmented;
  }

  return (
    <div className={className}>
      <div className="mb-2 text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
        Theme
      </div>
      {segmented}
    </div>
  );
}
