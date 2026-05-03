'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export function SignUpForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(typeof payload?.message === 'string' ? payload.message : 'Unable to create account.');
      }

      router.replace('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? 'Unable to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl rounded-[32px] border border-white/10 bg-slate-950/85 p-8 shadow-[0_24px_80px_rgba(2,8,23,0.6)]">
      <div className="text-xs uppercase tracking-[0.24em] text-emerald-300/70">Create account</div>
      <h1 className="mt-2 font-display text-4xl text-white">Start building persistent graphs</h1>
      <p className="mt-3 text-slate-400">Create an account to manage repository graphs, branch snapshots, and agent-facing API access from one dashboard.</p>
      {error ? <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <input className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white placeholder:text-slate-500 focus:border-sky-400/40" placeholder="Full name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} required />
        <input className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white placeholder:text-slate-500 focus:border-sky-400/40" placeholder="Email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} required />
        <input className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white placeholder:text-slate-500 focus:border-sky-400/40" type="password" placeholder="Password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} required />
        <button className="w-full rounded-2xl bg-emerald-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60" disabled={loading}>{loading ? 'Creating account…' : 'Create account'}</button>
      </form>
      <div className="mt-5 text-sm text-slate-400">Already have an account? <Link href="/auth/sign-in" className="text-sky-300 hover:text-sky-200">Sign in</Link></div>
    </div>
  );
}