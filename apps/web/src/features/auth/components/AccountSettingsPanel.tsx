'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { Badge } from '../../../components/atoms/Badge';
import { Button } from '../../../components/atoms/Button';
import { Input } from '../../../components/atoms/Input';
import { Surface } from '../../../components/atoms/Surface';
import { FieldGroup } from '../../../components/molecules/FieldGroup';
import { Notice } from '../../../components/molecules/Notice';
import { useConfirm } from '../../dialogs/providers/ConfirmDialogProvider';
import { useAuth } from '../providers/AuthProvider';

export function AccountSettingsPanel() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const confirm = useConfirm();

  useEffect(() => {
    setForm((current) => ({
      ...current,
      name: user?.name ?? '',
      email: user?.email ?? '',
    }));
  }, [user?.name, user?.email]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.users.updateMe(form);
      await refresh();
      setForm((current) => ({
        ...current,
        currentPassword: '',
        newPassword: '',
      }));
      setMessage('Profile updated.');
    } catch (err: any) {
      setError(err.message ?? 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: 'Delete your account?',
      description:
        'This permanently removes your user record and signs you out. Existing repository and graph data remains in storage but you will lose access to it. This cannot be undone.',
      confirmLabel: 'Delete account',
      tone: 'danger',
    });
    if (!ok) return;
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
      <form onSubmit={save}>
        <Surface tone="soft" padding="lg">
          <Badge>Profile</Badge>
          <h2 className="mt-2 font-display text-3xl text-foreground">
            Account settings
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Update your identity, email, or password. GitHub-connected accounts
            can still update name and email here.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Theme preference now persists at the account level and syncs when
            you change it from the app shell.
          </p>
          {message ? (
            <div className="mt-4">
              <Notice tone="success">{message}</Notice>
            </div>
          ) : null}
          {error ? (
            <div className="mt-4">
              <Notice tone="error">{error}</Notice>
            </div>
          ) : null}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <FieldGroup label="Name">
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="Name"
              />
            </FieldGroup>
            <FieldGroup label="Email">
              <Input
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
                placeholder="Email"
              />
            </FieldGroup>
            <FieldGroup
              label="Current password"
              hint="Required only when changing your password."
            >
              <Input
                type="password"
                value={form.currentPassword}
                onChange={(event) =>
                  setForm({ ...form, currentPassword: event.target.value })
                }
                placeholder="Current password"
              />
            </FieldGroup>
            <FieldGroup label="New password">
              <Input
                type="password"
                value={form.newPassword}
                onChange={(event) =>
                  setForm({ ...form, newPassword: event.target.value })
                }
                placeholder="New password"
              />
            </FieldGroup>
          </div>
          <Button type="submit" className="mt-6" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </Surface>
      </form>
      <Surface tone="danger" padding="lg">
        <Badge tone="warm">Danger zone</Badge>
        <h2 className="mt-2 font-display text-3xl text-foreground">
          Delete account
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This removes your user record and signs you out. Repository and graph
          ownership cleanup is not implemented yet, so existing graph data
          remains in storage.
        </p>
        <Button
          tone="danger"
          className="mt-6"
          onClick={remove}
          disabled={deleting}
        >
          {deleting ? 'Deleting…' : 'Delete account'}
        </Button>
      </Surface>
    </div>
  );
}
