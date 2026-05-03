'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { useAuth } from '../providers/AuthProvider';

export function AccountSettingsPanel() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', currentPassword: '', newPassword: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setForm(current => ({ ...current, name: user?.name ?? '', email: user?.email ?? '' }));
  }, [user?.name, user?.email]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.users.updateMe(form);
      await refresh();
      setForm(current => ({ ...current, currentPassword: '', newPassword: '' }));
      setMessage('Profile updated.');
    } catch (err: any) {
      setError(err.message ?? 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    setError('');
    try {
      await api.users.deleteMe();
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/auth/sign-up';
    } catch (err: any) {
      setError(err.message ?? 'Unable to delete account.');
      setDeleting(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <form onSubmit={save} className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
        <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Profile</div>
        <h2 className="mt-2 font-display text-3xl text-white">Account settings</h2>
        <p className="mt-2 text-sm text-slate-400">Update your identity, email, or password. GitHub-connected accounts can still update name and email here.</p>
        {message ? <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</div> : null}
        {error ? <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <input className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Name" />
          <input className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} placeholder="Email" />
          <input className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white" type="password" value={form.currentPassword} onChange={event => setForm({ ...form, currentPassword: event.target.value })} placeholder="Current password" />
          <input className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white" type="password" value={form.newPassword} onChange={event => setForm({ ...form, newPassword: event.target.value })} placeholder="New password" />
        </div>
        <button className="mt-6 rounded-2xl bg-sky-400 px-4 py-3 font-medium text-slate-950 disabled:opacity-60" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
      </form>
      <div className="rounded-[28px] border border-red-400/20 bg-red-500/5 p-6">
        <div className="text-xs uppercase tracking-[0.24em] text-red-300/70">Danger zone</div>
        <h2 className="mt-2 font-display text-3xl text-white">Delete account</h2>
        <p className="mt-2 text-sm text-slate-400">This removes your user record and signs you out. Repository and graph ownership cleanup is not implemented yet, so existing graph data remains in storage.</p>
        <button className="mt-6 rounded-2xl border border-red-400/40 px-4 py-3 font-medium text-red-200 transition hover:bg-red-500/10 disabled:opacity-60" onClick={remove} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete account'}</button>
      </div>
    </div>
  );
}