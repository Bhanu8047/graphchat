'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Badge } from '../../../components/atoms/Badge';
import { Button } from '../../../components/atoms/Button';
import { Input } from '../../../components/atoms/Input';
import { Surface } from '../../../components/atoms/Surface';
import { FieldGroup } from '../../../components/molecules/FieldGroup';
import { Notice } from '../../../components/molecules/Notice';

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
        throw new Error(
          typeof payload?.message === 'string'
            ? payload.message
            : 'Unable to create account.',
        );
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
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Surface tone="elevated" padding="xl" className="mx-auto max-w-2xl">
        <Badge tone="warm">Create account</Badge>
        <h1 className="mt-2 font-display text-4xl text-slate-900 dark:text-white">
          Start building persistent graphs
        </h1>
        <p className="mt-3 text-slate-600 dark:text-slate-400">
          Create an account to manage repository graphs, branch snapshots, and
          agent-facing API access from one dashboard.
        </p>
        {error ? (
          <div className="mt-4">
            <Notice tone="error">{error}</Notice>
          </div>
        ) : null}
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <FieldGroup label="Full name">
            <Input
              placeholder="Full name"
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              required
            />
          </FieldGroup>
          <FieldGroup label="Email">
            <Input
              placeholder="Email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
              required
            />
          </FieldGroup>
          <FieldGroup label="Password">
            <Input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
              }
              required
            />
          </FieldGroup>
          <Button type="submit" tone="primary" fullWidth disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
        <div className="mt-5 text-sm text-slate-600 dark:text-slate-400">
          Already have an account?{' '}
          <Link
            href="/auth/sign-in"
            className="text-cyan-600 hover:text-cyan-700 dark:text-cyan-300 dark:hover:text-cyan-200"
          >
            Sign in
          </Link>
        </div>
      </Surface>
    </motion.div>
  );
}
