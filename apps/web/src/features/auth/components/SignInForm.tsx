'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Badge } from '../../../components/atoms/Badge';
import { Button, buttonStyles } from '../../../components/atoms/Button';
import { Input } from '../../../components/atoms/Input';
import { Surface } from '../../../components/atoms/Surface';
import { BrandLogo } from '../../../components/molecules/BrandLogo';
import { FieldGroup } from '../../../components/molecules/FieldGroup';
import { Notice } from '../../../components/molecules/Notice';
import { cn } from '../../../lib/ui';

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(
    searchParams.get('githubAuth') === 'config-error'
      ? 'GitHub OAuth is not configured.'
      : '',
  );
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
        throw new Error(
          typeof payload?.message === 'string'
            ? payload.message
            : 'Unable to sign in.',
        );
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
    <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:gap-8">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Surface tone="hero" padding="xl">
          <BrandLogo className="w-fit" priority />
          <Badge tone="accent" className="mt-5">
            trchat
          </Badge>
          <h1 className="mt-4 font-display text-4xl leading-[1.02] text-foreground sm:text-5xl">
            Persistent repository graphs for humans and AI agents
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-foreground sm:text-lg">
            Sign in to manage branch-specific graphs, sync changes
            incrementally, and give agents API access to structured graph
            context instead of raw repository dumps.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              [
                'Multi-branch graphs',
                'Store one graph per branch and compare them over time.',
              ],
              [
                'Incremental sync',
                'Reuse previous graph state and only rebuild changed files.',
              ],
              [
                'Agent-ready API',
                'Serve graphs, semantic search, and exports through authenticated routes.',
              ],
            ].map(([title, copy]) => (
              <Surface key={title} tone="soft" padding="md">
                <div className="font-medium text-foreground">{title}</div>
                <div className="mt-2 text-sm text-muted-foreground">{copy}</div>
              </Surface>
            ))}
          </div>
        </Surface>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
      >
        <Surface tone="elevated" padding="xl">
          <Badge tone="warm">Sign in</Badge>
          <h2 className="mt-2 font-display text-3xl text-foreground">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Use your email and password or continue with GitHub.
          </p>
          {error ? (
            <div className="mt-4">
              <Notice tone="error">{error}</Notice>
            </div>
          ) : null}
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <FieldGroup label="Email">
              <Input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                required
              />
            </FieldGroup>
            <FieldGroup label="Password">
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
              />
            </FieldGroup>
            <Button type="submit" tone="primary" fullWidth disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <a
            href="/api/auth/github/login"
            className={cn(
              buttonStyles({ tone: 'secondary', fullWidth: true }),
              'mt-4 flex',
            )}
          >
            Continue with GitHub
          </a>
          <div className="mt-5 text-sm text-muted-foreground">
            New here?{' '}
            <Link
              href="/auth/sign-up"
              className="text-primary hover:text-primary/80"
            >
              Create an account
            </Link>
          </div>
        </Surface>
      </motion.div>
    </div>
  );
}
