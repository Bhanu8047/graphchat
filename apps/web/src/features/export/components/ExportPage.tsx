'use client';

import { useEffect, useState } from 'react';
import { Button } from '../../../components/atoms/Button';
import { Surface } from '../../../components/atoms/Surface';
import { Notice } from '../../../components/molecules/Notice';
import { PageIntro } from '../../../components/molecules/PageIntro';
import { RepositorySelect } from '../../../components/molecules/RepositorySelect';
import { api } from '../../../lib/api';

export function ExportPage() {
  const [repos, setRepos] = useState<any[]>([]);
  const [repoId, setRepoId] = useState('');
  const [payload, setPayload] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.repos
      .list()
      .then((nextRepos) => {
        setRepos(nextRepos);
        setRepoId(nextRepos[0]?.id ?? '');
      })
      .catch(() => {
        /* ignored */
      });
  }, []);

  const run = async () => {
    if (!repoId) return;
    setLoading(true);
    setError('');
    try {
      setPayload(await api.export.repo(repoId));
    } catch (err: any) {
      setError(err.message ?? 'Unable to export graph payload');
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
  };

  return (
    <div className="space-y-6">
      <Surface tone="hero" padding="xl">
        <PageIntro
          eyebrow="Agent export"
          title="Produce graph payloads for downstream agents"
          description="Export structural and semantic graph context as JSON so low-cost agents can navigate a precomputed repository map instead of reading the full codebase."
        />
      </Surface>

      {error ? <Notice tone="error">{error}</Notice> : null}

      <Surface tone="soft" padding="lg">
        <div className="flex flex-col gap-3 lg:flex-row">
          <RepositorySelect
            repositories={repos}
            value={repoId}
            onChange={setRepoId}
            className="flex-1"
          />
          <Button onClick={run} disabled={!repoId || loading}>
            {loading ? 'Exporting...' : 'Export'}
          </Button>
          {payload ? (
            <Button tone="secondary" onClick={copy}>
              Copy JSON
            </Button>
          ) : null}
        </div>
      </Surface>

      {payload ? (
        <Surface tone="default" padding="lg">
          <PageIntro
            eyebrow="Payload"
            title="Agent-ready JSON"
            description="This export can be persisted or passed directly to clients and agents that need graph context."
          />
          <pre className="mt-5 max-h-[70vh] overflow-auto rounded-[22px] border border-border bg-surface p-4 text-xs text-muted-foreground">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </Surface>
      ) : null}
    </div>
  );
}
