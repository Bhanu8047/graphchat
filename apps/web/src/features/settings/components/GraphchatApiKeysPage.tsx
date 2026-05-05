'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ApiKeySummary } from '@graphchat/shared-types';
import { Badge } from '../../../components/atoms/Badge';
import { Button } from '../../../components/atoms/Button';
import { Input } from '../../../components/atoms/Input';
import { Surface } from '../../../components/atoms/Surface';
import { CopyButton } from '../../../components/molecules/CopyButton';
import { FieldGroup } from '../../../components/molecules/FieldGroup';
import { Notice } from '../../../components/molecules/Notice';
import { useConfirm } from '../../dialogs/providers/ConfirmDialogProvider';
import { api } from '../../../lib/api';

const SCOPES = ['read', 'write', 'analyze'];

export function GraphchatApiKeysPage() {
  const [items, setItems] = useState<ApiKeySummary[]>([]);
  const [label, setLabel] = useState('');
  const [scopes, setScopes] = useState<string[]>([...SCOPES]);
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [error, setError] = useState('');
  const confirm = useConfirm();

  const refresh = () =>
    api.graphchatKeys
      .list()
      .then(setItems)
      .catch(() => setError('Failed to load keys.'));

  useEffect(() => {
    refresh();
  }, []);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setError('');
    setRevealed(null);
    try {
      const result = await api.graphchatKeys.create({ label, scopes });
      setRevealed(result.key);
      setLabel('');
      await refresh();
    } catch (err: any) {
      setError(err.message ?? 'Unable to create key.');
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id: string) => {
    const ok = await confirm({
      title: 'Revoke graphchat key?',
      description:
        'CLI sessions using this key will stop working immediately. This cannot be undone.',
      confirmLabel: 'Revoke',
      tone: 'danger',
    });
    if (!ok) return;
    await api.graphchatKeys.delete(id);
    await refresh();
  };

  const toggleScope = (scope: string) =>
    setScopes((current) =>
      current.includes(scope)
        ? current.filter((s) => s !== scope)
        : [...current, scope],
    );

  return (
    <div className="space-y-6">
      <Surface tone="soft" padding="lg">
        <Badge>CLI</Badge>
        <h2 className="mt-2 font-display text-3xl text-foreground">
          graphchat API keys
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Personal access tokens for the <code>graphchat</code> CLI. The
          plaintext key is shown <strong>once</strong> at creation — copy it
          before leaving this page.
        </p>
      </Surface>

      {error ? <Notice tone="error">{error}</Notice> : null}
      {revealed ? (
        <Notice tone="warn">
          <span className="text-sm">
            New key (copy now, it will not be shown again):
          </span>
          <div className="mt-2 flex items-center gap-2">
            <pre className="flex-1 overflow-x-auto rounded bg-background px-3 py-2 text-xs text-foreground">
              {revealed}
            </pre>
            <CopyButton value={revealed} />
          </div>
        </Notice>
      ) : null}

      <Surface tone="default" padding="lg">
        <form onSubmit={create} className="grid gap-4 md:grid-cols-2">
          <FieldGroup label="Label">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="My Laptop"
              required
            />
          </FieldGroup>
          <FieldGroup label="Scopes">
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              {SCOPES.map((scope) => (
                <label key={scope} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={scopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                  />
                  {scope}
                </label>
              ))}
            </div>
          </FieldGroup>
          <div className="md:col-span-2">
            <Button type="submit" disabled={creating || !label.trim()}>
              {creating ? 'Creating…' : 'Create key'}
            </Button>
          </div>
        </form>
      </Surface>

      <Surface tone="soft" padding="lg">
        <h3 className="font-display text-xl text-foreground">Existing keys</h3>
        {items.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No keys yet. Each key prefix (sk-graphchat-…) is shown for
            identification.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <Surface tone="default" padding="md">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-medium text-foreground">
                        {item.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        sk-graphchat-{item.keyId} · scopes:{' '}
                        {item.scopes.join(', ')} · created{' '}
                        {new Date(item.createdAt).toLocaleString()}
                        {item.lastUsed
                          ? ` · last used ${new Date(item.lastUsed).toLocaleString()}`
                          : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CopyButton
                        value={`sk-graphchat-${item.keyId}`}
                        label="Copy ID"
                      />
                      <Button tone="danger" onClick={() => remove(item.id)}>
                        Revoke
                      </Button>
                    </div>
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
