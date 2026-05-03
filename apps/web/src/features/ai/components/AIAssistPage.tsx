'use client';

import { useEffect, useState } from 'react';
import { Button } from '../../../components/atoms/Button';
import { Surface } from '../../../components/atoms/Surface';
import { Textarea } from '../../../components/atoms/Textarea';
import { Notice } from '../../../components/molecules/Notice';
import { PageIntro } from '../../../components/molecules/PageIntro';
import { RepositorySelect } from '../../../components/molecules/RepositorySelect';
import { api } from '../../../lib/api';

export function AIAssistPage() {
  const [repos, setRepos] = useState<any[]>([]);
  const [repoId, setRepoId] = useState('');
  const [input, setInput] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const run = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await api.ai.suggest(repoId, input);
      setResult(response);
    } catch (err: any) {
      setError(err.message ?? 'Unable to generate suggestion');
    } finally {
      setLoading(false);
    }
  };

  const accept = async () => {
    if (!result || !repoId) return;
    await api.nodes.create({ repoId, ...result });
    setResult(null);
    setInput('');
  };

  return (
    <div className="space-y-6">
      <Surface tone="hero" padding="xl">
        <PageIntro
          eyebrow="AI assist"
          title="Generate semantic nodes from code and docs"
          description="Paste a focused code sample, design note, or documentation block and turn it into a structured node attached to one of your repositories."
        />
      </Surface>

      {error ? <Notice tone="error">{error}</Notice> : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Surface tone="soft" padding="lg">
          <form onSubmit={run} className="space-y-4">
            <RepositorySelect
              repositories={repos}
              value={repoId}
              onChange={setRepoId}
              required
            />
            <Textarea
              className="min-h-56"
              placeholder="Paste code or docs..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              required
            />
            <Button type="submit" disabled={loading || !repoId}>
              {loading ? 'Thinking...' : 'Suggest node'}
            </Button>
          </form>
        </Surface>
        <Surface tone="default" padding="lg">
          <PageIntro
            eyebrow="Suggestion"
            title={result?.label ?? 'Awaiting input'}
            description={
              result
                ? 'Review the AI-generated label, type, and content before saving it as a semantic node.'
                : 'Run the assistant to create a candidate node you can save into the graph.'
            }
          />
          {result ? (
            <div className="mt-5 space-y-4 text-sm">
              <div className="font-medium text-slate-900 dark:text-white">
                {result.label}{' '}
                <span className="text-xs text-slate-500">[{result.type}]</span>
              </div>
              <div className="whitespace-pre-wrap text-slate-600 dark:text-slate-300">
                {result.content}
              </div>
              <div className="text-xs text-slate-500">
                Tags: {result.tags?.join(', ')}
              </div>
              <Button onClick={accept}>Accept and save</Button>
            </div>
          ) : null}
        </Surface>
      </div>
    </div>
  );
}
