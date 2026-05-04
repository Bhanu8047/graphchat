'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ModelService,
  RateLimit,
  UsageRecord,
} from '@vectorgraph/shared-types';
import { Badge } from '../../../components/atoms/Badge';
import { Surface } from '../../../components/atoms/Surface';
import { Notice } from '../../../components/molecules/Notice';
import { api } from '../../../lib/api';

type Bucket = {
  service: ModelService;
  provider: string;
  model: string;
  countToday: number;
  count30d: number;
  tokens: number;
};

const todayKey = (): string => new Date().toISOString().slice(0, 10);

/**
 * Aggregate raw daily records into one row per service+provider+model with
 * separate counters for today vs the full 30-day window.
 */
const aggregate = (records: UsageRecord[]): Bucket[] => {
  const today = todayKey();
  const map = new Map<string, Bucket>();
  for (const r of records) {
    const key = `${r.service}::${r.provider}::${r.model}`;
    const existing =
      map.get(key) ??
      ({
        service: r.service,
        provider: r.provider,
        model: r.model,
        countToday: 0,
        count30d: 0,
        tokens: 0,
      } as Bucket);
    existing.count30d += r.count;
    existing.tokens += r.tokens;
    if (r.day === today) existing.countToday += r.count;
    map.set(key, existing);
  }
  return [...map.values()].sort(
    (a, b) => b.count30d - a.count30d || a.service.localeCompare(b.service),
  );
};

export function UsagePage() {
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [limits, setLimits] = useState<RateLimit[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.usage.me(), api.rateLimits.list()])
      .then(([u, l]) => {
        setRecords(u);
        setLimits(l);
      })
      .catch(() => setError('Failed to load usage.'));
  }, []);

  const buckets = useMemo(() => aggregate(records), [records]);

  // Service-level totals so each Bucket can show how its service rolls up
  // against the admin-defined daily cap.
  const todayByService = useMemo(() => {
    const map = new Map<ModelService, number>();
    for (const b of buckets)
      map.set(b.service, (map.get(b.service) ?? 0) + b.countToday);
    return map;
  }, [buckets]);

  const limitFor = (service: ModelService): RateLimit | undefined =>
    limits.find((l) => l.service === service);

  return (
    <div className="space-y-6">
      <Surface tone="hero" padding="xl">
        <Badge>Usage</Badge>
        <h1 className="mt-2 font-display text-3xl text-foreground">
          Model usage
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Activity for the last 30 days, grouped by service, provider and model.
          The <strong>Daily limit</strong> column reflects the admin-configured
          cap per service — usage rolls up across all models inside the service.
        </p>
      </Surface>

      {error ? <Notice tone="error">{error}</Notice> : null}

      <Surface tone="default" padding="lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-xl text-foreground">All models</h3>
          <ServiceQuotaSummary
            limits={limits}
            todayByService={todayByService}
          />
        </div>
        {buckets.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No usage recorded yet.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="pb-2 pr-4">Service</th>
                  <th className="pb-2 pr-4">Provider</th>
                  <th className="pb-2 pr-4">Model</th>
                  <th className="pb-2 pr-4 text-right">Today</th>
                  <th className="pb-2 pr-4 text-right">30 days</th>
                  <th className="pb-2 pr-4 text-right">Tokens</th>
                  <th className="pb-2 text-right">Daily limit</th>
                </tr>
              </thead>
              <tbody>
                {buckets.map((b) => {
                  const limit = limitFor(b.service);
                  const dailyCap = limit?.dailyLimit ?? 0;
                  const usedToday = todayByService.get(b.service) ?? 0;
                  const ratio = dailyCap > 0 ? usedToday / dailyCap : 0;
                  return (
                    <tr
                      key={`${b.service}-${b.provider}-${b.model}`}
                      className="border-t border-border/50"
                    >
                      <td className="py-2 pr-4">{b.service}</td>
                      <td className="py-2 pr-4">{b.provider}</td>
                      <td className="py-2 pr-4">{b.model}</td>
                      <td className="py-2 pr-4 text-right">
                        {b.countToday.toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        {b.count30d.toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        {b.tokens.toLocaleString()}
                      </td>
                      <td className="py-2 text-right">
                        <LimitCell
                          dailyCap={dailyCap}
                          usedToday={usedToday}
                          ratio={ratio}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Surface>
    </div>
  );
}

function LimitCell({
  dailyCap,
  usedToday,
  ratio,
}: {
  dailyCap: number;
  usedToday: number;
  ratio: number;
}) {
  if (!dailyCap)
    return <span className="text-xs text-muted-foreground">unlimited</span>;
  const tone =
    ratio >= 1
      ? 'text-[var(--danger)]'
      : ratio >= 0.8
        ? 'text-amber-500'
        : 'text-foreground';
  return (
    <span className={`text-xs font-medium ${tone}`}>
      {usedToday.toLocaleString()} / {dailyCap.toLocaleString()}
    </span>
  );
}

function ServiceQuotaSummary({
  limits,
  todayByService,
}: {
  limits: RateLimit[];
  todayByService: Map<ModelService, number>;
}) {
  if (!limits.length) return null;
  return (
    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
      {limits.map((l) => {
        const used = todayByService.get(l.service) ?? 0;
        return (
          <span
            key={l.service}
            className="rounded-full border border-border/60 px-3 py-1"
          >
            {l.service}: {used.toLocaleString()}/
            {l.dailyLimit > 0 ? l.dailyLimit.toLocaleString() : '∞'} today ·{' '}
            {l.sessionLimit > 0 ? `${l.sessionLimit}/hr` : 'no hourly cap'}
          </span>
        );
      })}
    </div>
  );
}
