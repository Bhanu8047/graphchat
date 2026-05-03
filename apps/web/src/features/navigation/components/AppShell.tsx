'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '../../auth/providers/AuthProvider';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', description: 'Overview and recent graphs' },
  { href: '/repos', label: 'Repositories', description: 'Import and sync GitHub branches' },
  { href: '/graphs', label: 'Graphs', description: 'Explore generated graph structure' },
  { href: '/search', label: 'Search', description: 'Semantic retrieval across graphs' },
  { href: '/ai', label: 'AI Assist', description: 'Generate nodes and graph context' },
  { href: '/export', label: 'Export', description: 'Agent-ready graph payloads' },
  { href: '/settings', label: 'Settings', description: 'Account and session controls' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.replace('/auth/sign-in');
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.14),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(56,189,248,0.16),_transparent_26%),linear-gradient(180deg,_#08111f_0%,_#050912_100%)] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-4 lg:px-6">
        <aside className="hidden w-80 shrink-0 flex-col justify-between rounded-[28px] border border-white/10 bg-slate-950/70 p-5 shadow-[0_24px_80px_rgba(2,8,23,0.55)] backdrop-blur lg:flex">
          <div>
            <div className="mb-8 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
              <div className="text-xs uppercase tracking-[0.24em] text-emerald-200/80">VectorGraph</div>
              <div className="mt-2 font-display text-3xl leading-tight text-white">Repository graphs for persistent AI context</div>
              <p className="mt-3 text-sm text-slate-300">Store multiple branch graphs, sync them incrementally, and let agents query a structural context instead of rereading whole repos.</p>
            </div>
            <nav className="space-y-2">
              {navItems.map(item => {
                const active = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} className={`block rounded-2xl border px-4 py-3 transition ${active ? 'border-sky-400/50 bg-sky-400/15 text-white' : 'border-white/5 bg-white/[0.02] text-slate-300 hover:border-white/10 hover:bg-white/[0.04]'}`}>
                    <div className="font-medium">{item.label}</div>
                    <div className="mt-1 text-xs text-slate-400">{item.description}</div>
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Signed in</div>
            <div className="mt-2 font-medium text-white">{user?.name ?? 'Unknown user'}</div>
            <div className="text-sm text-slate-400">{user?.email}</div>
            <button className="mt-4 w-full rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-white disabled:opacity-60" onClick={signOut} disabled={signingOut}>{signingOut ? 'Signing out…' : 'Sign out'}</button>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="mb-4 rounded-[28px] border border-white/10 bg-slate-950/65 px-5 py-4 shadow-[0_18px_50px_rgba(2,8,23,0.35)] backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Workspace</div>
                <h1 className="font-display text-2xl text-white">{navItems.find(item => item.href === pathname)?.label ?? 'VectorGraph'}</h1>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300">Persistent auth, branch-aware graphs, and API-first context delivery</div>
            </div>
          </header>
          <main className="min-h-[calc(100vh-4rem)] rounded-[28px] border border-white/10 bg-slate-950/55 p-4 shadow-[0_24px_80px_rgba(2,8,23,0.48)] backdrop-blur lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}