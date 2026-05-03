'use client';

import { ThemeMode } from '@vectorgraph/shared-types';
import { Button } from '../atoms/Button';
import { Surface } from '../atoms/Surface';
import { useTheme } from '../../features/theme/providers/ThemeProvider';

const themeOptions: Array<{ value: ThemeMode; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export function ThemeToggle() {
  const { mode, resolvedTheme, setMode } = useTheme();

  return (
    <div>
      <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-500">
        Theme
      </div>
      <Surface
        tone="soft"
        padding="sm"
        className="flex items-center gap-1 rounded-full"
      >
        {themeOptions.map((option) => (
          <Button
            key={option.value}
            tone={mode === option.value ? 'primary' : 'ghost'}
            size="sm"
            className="rounded-full px-3 py-2"
            onClick={() => setMode(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </Surface>
      <div className="mt-2 text-xs text-slate-500 dark:text-slate-500">
        Resolved {resolvedTheme}
      </div>
    </div>
  );
}
