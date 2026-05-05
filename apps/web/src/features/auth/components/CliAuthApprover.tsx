'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../../components/atoms/Button';
import { Input } from '../../../components/atoms/Input';
import { Notice } from '../../../components/molecules/Notice';
import { Surface } from '../../../components/atoms/Surface';
import { useAuth } from '../providers/AuthProvider';

export function CliAuthApprover() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading, authenticated } = useAuth();
  const [code, setCode] = useState(
    (params.get('code') ?? '').toUpperCase().replace(/-/g, ''),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!loading && !authenticated) {
      const next = encodeURIComponent(
        `/cli-auth${code ? `?code=${code}` : ''}`,
      );
      router.replace(`/auth/sign-in?next=${next}`);
    }
  }, [loading, authenticated, code, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/cli/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_code: code.toUpperCase() }),
      });
      if (res.status === 204) {
        setDone(true);
      } else {
        const payload = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        setError(payload?.message ?? 'Could not authorize CLI.');
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !authenticated) {
    return <Surface className="p-8 text-muted-foreground">Loading…</Surface>;
  }

  if (done) {
    return (
      <Surface className="space-y-4 p-8">
        <h1 className="text-2xl font-semibold">CLI authorized</h1>
        <p className="text-muted-foreground">
          You can return to your terminal — the CLI will continue automatically.
        </p>
        <Link
          href="/dashboard"
          className="text-sm text-(--accent) hover:underline"
        >
          Go to dashboard →
        </Link>
      </Surface>
    );
  }

  return (
    <Surface className="space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Authorize the GRAPHCHAT CLI</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as <span className="font-medium">{user?.email}</span>.
          Confirm the code shown in your terminal.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="user_code">
            Verification code
          </label>
          <Input
            id="user_code"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.toUpperCase().replace(/-/g, ''))
            }
            placeholder="ABCDEFGH"
            autoComplete="off"
            autoFocus
            required
            minLength={8}
            maxLength={12}
            className="font-mono tracking-[0.3em]"
          />
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        <Button type="submit" disabled={submitting || code.length < 8}>
          {submitting ? 'Authorizing…' : 'Authorize CLI'}
        </Button>
      </form>
    </Surface>
  );
}
