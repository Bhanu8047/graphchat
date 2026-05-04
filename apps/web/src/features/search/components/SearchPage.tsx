'use client';

import { useEffect, useState } from 'react';
import { Button } from '../../../components/atoms/Button';
import { Input } from '../../../components/atoms/Input';
import { Surface } from '../../../components/atoms/Surface';
import { Notice } from '../../../components/molecules/Notice';
import { PageIntro } from '../../../components/molecules/PageIntro';
import { RepositorySelect } from '../../../components/molecules/RepositorySelect';
import { api } from '../../../lib/api';

export function SearchPage() {
  const [q, setQ] = useState('');
  const [repoId, setRepoId] = useState('');
  const [repos, setRepos] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.repos
      .list()
      .then(setRepos)
      .catch(() => {
        setRepos([]);
      });
  }, []);

  const run = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      setResults(await api.search.query(q, repoId || undefined));
    } catch (err: any) {
      setError(err.message ?? 'Unable to run semantic search');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Surface tone="hero" padding="xl">
        <PageIntro
          eyebrow="Retrieval"
          title="Semantic search across your stored graphs"
          description="Query the semantic graph without rereading the full repository. Results are already scoped to your account's indexed repositories."
        />
        <form onSubmit={run} className="mt-6 flex flex-col gap-3 lg:flex-row">
          <Input
            className="flex-1"
            placeholder="Search semantic graph context..."
            value={q}
            onChange={(event) => setQ(event.target.value)}
            required
          />
          <RepositorySelect
            repositories={repos}
            value={repoId}
            onChange={setRepoId}
            placeholder="All repositories"
            className="lg:max-w-[280px]"
          />
          <Button type="submit" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </form>
      </Surface>

      {error ? <Notice tone="error">{error}</Notice> : null}

      <Surface tone="soft" padding="lg">
        <PageIntro
          eyebrow="Matches"
          title={`Results (${results.length})`}
          description="Similarity-ranked semantic nodes ready for downstream AI or manual exploration."
        />
        <ul className="mt-5 space-y-3">
          {results.map((result, index) => (
            <li key={index}>
              <Surface tone="default" padding="md">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <span className="font-medium text-foreground">
                    {result.node.label}{' '}
                    <span className="text-xs text-muted-foreground">
                      [{result.node.type}]
                    </span>
                  </span>
                  <span className="rounded-full border border-success bg-[color-mix(in_oklab,var(--success)_15%,transparent)] px-3 py-1 text-sm text-success">
                    {(result.score * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {result.node.content}
                </div>
              </Surface>
            </li>
          ))}
        </ul>
      </Surface>
    </div>
  );
}
