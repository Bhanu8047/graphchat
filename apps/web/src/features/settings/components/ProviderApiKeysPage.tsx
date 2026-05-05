'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ProviderCredentialSummary } from '@graphchat/shared-types';
import { Badge } from '../../../components/atoms/Badge';
import { Button } from '../../../components/atoms/Button';
import { Input } from '../../../components/atoms/Input';
import { Select } from '../../../components/atoms/Select';
import { Surface } from '../../../components/atoms/Surface';
import { FieldGroup } from '../../../components/molecules/FieldGroup';
import { Notice } from '../../../components/molecules/Notice';
import { useConfirm } from '../../dialogs/providers/ConfirmDialogProvider';
import { api } from '../../../lib/api';

const PROVIDERS = [
  'claude',
  'openai',
  'gemini',
  'ollama',
  'openrouter',
  'voyage',
] as const;

export function ProviderApiKeysPage() {
  const [items, setItems] = useState<ProviderCredentialSummary[]>([]);
  const [form, setForm] = useState({
    provider: 'openai',
    label: 'Personal',
    apiKey: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const confirm = useConfirm();

  const refresh = () =>
    api.credentials
      .list()
      .then(setItems)
      .catch(() => setError('Failed to load credentials.'));

  useEffect(() => {
    refresh();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.credentials.upsert(form);
      setForm({ provider: form.provider, label: form.label, apiKey: '' });
      setMessage(`${form.provider} key saved.`);
      await refresh();
    } catch (err: any) {
      setError(err.message ?? 'Unable to save key.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const ok = await confirm({
      title: 'Delete credential?',
      description:
        'Pending requests using this provider key will fail until you add a new one.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    await api.credentials.delete(id);
    await refresh();
  };

  return (
    <div className="space-y-6">
      <Surface tone="soft" padding="lg">
        <Badge>BYOK</Badge>
        <h2 className="mt-2 font-display text-3xl text-foreground">
          Provider API keys
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Bring your own keys for OpenAI, Anthropic, Voyage, etc. Keys are
          encrypted at rest with AES-256-GCM and decrypted only when a request
          you authored needs them. Toggle <em>Use my API key</em> per service in
          Models & Agents.
        </p>
      </Surface>

      {message ? <Notice tone="success">{message}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      <Surface tone="default" padding="lg">
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-3">
          <FieldGroup label="Provider">
            <Select
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value })}
            >
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </FieldGroup>
          <FieldGroup label="Label">
            <Input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="Personal"
              required
            />
          </FieldGroup>
          <FieldGroup
            label="API key"
            hint="Plaintext is encrypted on save and never echoed back."
          >
            <Input
              type="password"
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              placeholder="sk-…"
              required
            />
          </FieldGroup>
          <div className="md:col-span-3">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save key'}
            </Button>
          </div>
        </form>
      </Surface>

      <Surface tone="soft" padding="lg">
        <h3 className="font-display text-xl text-foreground">Stored keys</h3>
        {items.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No keys yet. Saving a key for a provider replaces any existing one
            for that provider.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <Surface tone="default" padding="md">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium text-foreground">
                        {item.provider}{' '}
                        <span className="text-xs text-muted-foreground">
                          ({item.label})
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ••••{item.hint} · updated{' '}
                        {new Date(item.updatedAt).toLocaleString()}
                      </div>
                    </div>
                    <Button tone="danger" onClick={() => remove(item.id)}>
                      Delete
                    </Button>
                  </div>
                </Surface>
              </li>
            ))}
          </ul>
        )}
      </Surface>
    </div>
  );
}
