'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AuthSessionResponse } from '@graphchat/shared-types';

type AuthContextValue = {
  user: AuthSessionResponse['user'];
  authenticated: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  setUser: (user: AuthSessionResponse['user']) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSessionResponse>({
    authenticated: false,
  });
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/session', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      setSession(payload ?? { authenticated: false });
    } catch {
      setSession({ authenticated: false });
    } finally {
      setLoading(false);
    }
  };

  const setUser = (user: AuthSessionResponse['user']) => {
    setSession((current) => ({
      ...current,
      user,
      authenticated: Boolean(user),
    }));
  };

  useEffect(() => {
    refresh();
  }, []);

  const value = useMemo(
    () => ({
      user: session.user,
      authenticated: session.authenticated,
      loading,
      refresh,
      setUser,
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return ctx;
}
