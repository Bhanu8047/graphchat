'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(searchParams.get('githubAuth') === 'config-error' ? 'GitHub OAuth is not configured.' : '');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(typeof payload?.message === 'string' ? payload.message : 'Unable to sign in.');
      }

      router.replace('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,20,35,0.92),rgba(8,14,25,0.96))] p-8 shadow-[0_24px_80px_rgba(2,8,23,0.55)]">
        <div className="text-xs uppercase tracking-[0.24em] text-sky-300/70">VectorGraph Cloud</div>
        <h1 className="mt-3 font-display text-5xl leading-[1.02] text-white">Persistent repository graphs for humans and AI agents</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-300">Sign in to manage branch-specific graphs, sync changes incrementally, and give agents API access to structured graph context instead of raw repository dumps.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ['Multi-branch graphs', 'Store one graph per branch and compare them over time.'],
            ['Incremental sync', 'Reuse previous graph state and only rebuild changed files.'],
            ['Agent-ready API', 'Serve graphs, semantic search, and exports through authenticated routes.'],
          ].map(([title, copy]) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="font-medium text-white">{title}</div>
              <div className="mt-2 text-sm text-slate-400">{copy}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-[32px] border border-white/10 bg-slate-950/85 p-8 shadow-[0_24px_80px_rgba(2,8,23,0.6)]">
        <div className="text-xs uppercase tracking-[0.24em] text-emerald-300/70">Sign in</div>
        <h2 className="mt-2 font-display text-3xl text-white">Welcome back</h2>
        <p className="mt-2 text-sm text-slate-400">Use your email and password or continue with GitHub.</p>
        {error ? <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div>
            <label className="mb-2 block text-sm text-slate-400">Email</label>
            <input className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none ring-0 transition placeholder:text-slate-500 focus:border-sky-400/40" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@company.com" required />
          </div>
          <div>
            <label className="mb-2 block text-sm text-slate-400">Password</label>
            <input className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none ring-0 transition placeholder:text-slate-500 focus:border-sky-400/40" type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="••••••••" required />
          </div>
          <button className="w-full rounded-2xl bg-sky-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-sky-300 disabled:opacity-60" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <a href="/api/auth/github/login" className="mt-4 flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 font-medium text-white transition hover:bg-white/[0.06]">Continue with GitHub</a>
        <div className="mt-5 text-sm text-slate-400">New here? <Link href="/auth/sign-up" className="text-sky-300 hover:text-sky-200">Create an account</Link></div>
      </div>
    </div>
  );
}