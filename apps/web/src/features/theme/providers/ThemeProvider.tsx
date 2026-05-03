'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { ThemeMode } from '@vectorgraph/shared-types';
import { api } from '../../../lib/api';
import { useAuth } from '../../auth/providers/AuthProvider';

type ResolvedTheme = 'light' | 'dark';

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
};

const THEME_STORAGE_KEY = 'vectorgraph-theme';
const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function getStoredMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'system';
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }

  return 'system';
}

function applyTheme(mode: ThemeMode): ResolvedTheme {
  const resolvedTheme = mode === 'system' ? getSystemTheme() : mode;
  const root = document.documentElement;

  root.dataset.themeMode = mode;
  root.dataset.theme = resolvedTheme;

  return resolvedTheme;
}

export const themeInitScript = `
(() => {
  const storageKey = '${THEME_STORAGE_KEY}';
  const stored = window.localStorage.getItem(storageKey);
  const mode = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  const resolved = mode === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : mode;
  document.documentElement.dataset.themeMode = mode;
  document.documentElement.dataset.theme = resolved;
})();`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark');
  const { authenticated, loading, user, setUser } = useAuth();

  useEffect(() => {
    const initialMode = user?.themePreference ?? getStoredMode();
    setModeState(initialMode);
    setResolvedTheme(applyTheme(initialMode));

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const currentMode = document.documentElement.dataset.themeMode as
        | ThemeMode
        | undefined;
      if (currentMode === 'system') {
        setResolvedTheme(applyTheme('system'));
      }
    };

    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, [user?.themePreference]);

  const setMode = async (nextMode: ThemeMode) => {
    setModeState(nextMode);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextMode);
    setResolvedTheme(applyTheme(nextMode));

    if (!loading && authenticated && user) {
      try {
        const updated = await api.users.updateMe({ themePreference: nextMode });
        setUser(updated);
      } catch {
        // Keep the local preference even if the profile update fails.
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ mode, resolvedTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }

  return context;
}
