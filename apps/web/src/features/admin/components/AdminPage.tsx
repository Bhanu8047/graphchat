'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AppUser,
  ModelService,
  RateLimit,
  UsageRecord,
} from '@graphchat/shared-types';
import { Badge } from '../../../components/atoms/Badge';
import { Button } from '../../../components/atoms/Button';
import { Input } from '../../../components/atoms/Input';
import { Surface } from '../../../components/atoms/Surface';
import { FieldGroup } from '../../../components/molecules/FieldGroup';
import { Notice } from '../../../components/molecules/Notice';
import { api } from '../../../lib/api';
import { useAuth } from '../../auth/providers/AuthProvider';

const SERVICES: ModelService[] = ['ai-assist', 'embedding'];

export function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [limits, setLimits] = useState<RateLimit[]>([]);
  const [usage, setUsage] = useState<UsageRecord[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [savingId, setSavingId] = useState<ModelService | ''>('');

  const refresh = () =>
    Promise.all([
      api.admin.listUsers(),
      api.admin.listRateLimits(),
      api.admin.listUsage(),
    ])
      .then(([u, l, us]) => {
        setUsers(u);
        setLimits(l);
        setUsage(us);
      })
      .catch((err) => setError(err.message ?? 'Failed to load admin data.'));

  useEffect(() => {
    if (user?.role === 'admin') refresh();
  }, [user?.role]);

  const totalsByService = useMemo(() => {
    const map = new Map<ModelService, number>();
    for (const r of usage)
      map.set(r.service, (map.get(r.service) ?? 0) + r.count);
    return map;
  }, [usage]);

  if (!user) return null;
  if (user.role !== 'admin') {
    return (
      <Surface tone="danger" padding="lg">
        <h2 className="font-display text-3xl text-foreground">Forbidden</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You need admin access to view this page.
        </p>
      </Surface>
    );
  }

  const limitFor = (service: ModelService): RateLimit =>
    limits.find((l) => l.service === service) ?? {
      id: '',
      service,
      dailyLimit: 0,
      sessionLimit: 0,
      updatedAt: '',
      updatedBy: '',
    };

  const updateLimit = async (
    service: ModelService,
    patch: Partial<RateLimit>,
  ) => {
    setSavingId(service);
    setError('');
    setMessage('');
    try {
      const current = limitFor(service);
      await api.admin.upsertRateLimit({
        service,
        dailyLimit: patch.dailyLimit ?? current.dailyLimit,
        sessionLimit: patch.sessionLimit ?? current.sessionLimit,
      });
      setMessage(`${service} limits updated.`);
      await refresh();
    } catch (err: any) {
      setError(err.message ?? 'Unable to update limit.');
    } finally {
      setSavingId('');
    }
  };

  const setRole = async (id: string, role: 'user' | 'admin') => {
    setError('');
    setMessage('');
    try {
      await api.admin.setRole(id, role);
      setMessage('Role updated.');
      await refresh();
    } catch (err: any) {
      setError(err.message ?? 'Unable to update role.');
    }
  };

  return (
    <div className="space-y-6">
      <Surface tone="hero" padding="xl">
        <Badge>Admin</Badge>
        <h1 className="mt-2 font-display text-3xl text-foreground">
          Admin console
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Configure per-service rate limits, promote/demote users, and review
          aggregate platform usage.
        </p>
      </Surface>

      {message ? <Notice tone="success">{message}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      <Surface tone="default" padding="lg">
        <h2 className="font-display text-xl text-foreground">Rate limits</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set <strong>0</strong> to disable a cap.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {SERVICES.map((service) => {
            const limit = limitFor(service);
            return (
              <RateLimitCard
                key={service}
                service={service}
                limit={limit}
                used={totalsByService.get(service) ?? 0}
                saving={savingId === service}
                onSave={(patch) => updateLimit(service, patch)}
              />
            );
          })}
        </div>
      </Surface>

      <Surface tone="soft" padding="lg">
        <h2 className="font-display text-xl text-foreground">
          Users ({users.length})
        </h2>
        <table className="mt-4 w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="pb-2 pr-4">Name</th>
              <th className="pb-2 pr-4">Email</th>
              <th className="pb-2 pr-4">Provider</th>
              <th className="pb-2 pr-4">Role</th>
              <th className="pb-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border/50">
                <td className="py-2 pr-4">{u.name}</td>
                <td className="py-2 pr-4">{u.email}</td>
                <td className="py-2 pr-4">{u.authProvider}</td>
                <td className="py-2 pr-4">{u.role}</td>
                <td className="py-2 text-right">
                  {u.id === user.id ? (
                    <span className="text-xs text-muted-foreground">(you)</span>
                  ) : u.role === 'admin' ? (
                    <Button
                      tone="secondary"
                      onClick={() => setRole(u.id, 'user')}
                    >
                      Demote
                    </Button>
                  ) : (
                    <Button onClick={() => setRole(u.id, 'admin')}>
                      Promote
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Surface>
    </div>
  );
}

function RateLimitCard({
  service,
  limit,
  used,
  saving,
  onSave,
}: {
  service: ModelService;
  limit: RateLimit;
  used: number;
  saving: boolean;
  onSave: (patch: Partial<RateLimit>) => void;
}) {
  const [daily, setDaily] = useState(limit.dailyLimit);
  const [session, setSession] = useState(limit.sessionLimit);

  useEffect(() => {
    setDaily(limit.dailyLimit);
    setSession(limit.sessionLimit);
  }, [limit.dailyLimit, limit.sessionLimit]);

  return (
    <Surface tone="default" padding="md">
      <div className="font-medium text-foreground">{service}</div>
      <div className="mt-1 text-xs text-muted-foreground">
        30-day requests across all users: {used.toLocaleString()}
      </div>
      <div className="mt-4 grid gap-3">
        <FieldGroup label="Daily limit / user">
          <Input
            type="number"
            min={0}
            value={daily}
            onChange={(e) => setDaily(Number(e.target.value))}
          />
        </FieldGroup>
        <FieldGroup label="Hourly limit / user">
          <Input
            type="number"
            min={0}
            value={session}
            onChange={(e) => setSession(Number(e.target.value))}
          />
        </FieldGroup>
      </div>
      <div className="mt-4">
        <Button
          onClick={() => onSave({ dailyLimit: daily, sessionLimit: session })}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </Surface>
  );
}
