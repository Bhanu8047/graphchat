'use client';

import { useEffect, useState } from 'react';
import {
  EmbeddingProvider,
  LLMProvider,
  ModelService,
  ModelSetting,
  RuntimeProviderConfig,
} from '@trchat/shared-types';
import { Badge } from '../../../components/atoms/Badge';
import { Button } from '../../../components/atoms/Button';
import { Input } from '../../../components/atoms/Input';
import { Select } from '../../../components/atoms/Select';
import { Surface } from '../../../components/atoms/Surface';
import { FieldGroup } from '../../../components/molecules/FieldGroup';
import { Notice } from '../../../components/molecules/Notice';
import { api } from '../../../lib/api';

const SERVICES: ReadonlyArray<{
  id: ModelService;
  title: string;
  blurb: string;
}> = [
  {
    id: 'ai-assist',
    title: 'AI Assist',
    blurb:
      'Used for context-node suggestions and explanations. Pick the chat model that powers /ai.',
  },
  {
    id: 'embedding',
    title: 'Embeddings',
    blurb:
      'Used for semantic search and ingestion. Different repos may have been ingested with different embedding providers — switching here only affects new search queries and new ingestions.',
  },
];

type FormState = Record<ModelService, ModelSetting>;

/**
 * Curated model hints per provider. Surfaced via a native <datalist> so users
 * still get a free-text input but can pick a sane default with one click.
 * Update this list when providers ship new GA models.
 */
const MODEL_SUGGESTIONS: Record<string, string[]> = {
  // LLM providers (ai-assist)
  claude: [
    'claude-sonnet-4-5-20250929', // balanced default
    'claude-haiku-4-5', // fast / cheap
    'claude-opus-4-1-20250805', // highest quality
  ],
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'o4-mini'],
  gemini: ['gemini-2.0-flash', 'gemini-2.5-pro', 'gemini-2.5-flash'],
  ollama: ['llama3.2', 'llama3.1', 'qwen2.5-coder:7b'],
  openrouter: [
    'meta-llama/llama-3.1-8b-instruct:free',
    'anthropic/claude-sonnet-4.5',
    'openai/gpt-4o-mini',
  ],
  // Embedding providers
  voyage: ['voyage-code-3', 'voyage-3-large', 'voyage-3'],
  // openai/gemini/ollama overlap with LLM dropdown but use embedding models:
  'openai-embed': ['text-embedding-3-small', 'text-embedding-3-large'],
  'gemini-embed': ['text-embedding-004', 'gemini-embedding-001'],
  'ollama-embed': ['nomic-embed-text', 'mxbai-embed-large'],
};

const suggestionsFor = (
  service: ModelService,
  provider: string | undefined,
): string[] => {
  if (!provider) return [];
  if (service === 'embedding') {
    if (provider === 'openai') return MODEL_SUGGESTIONS['openai-embed'];
    if (provider === 'gemini') return MODEL_SUGGESTIONS['gemini-embed'];
    if (provider === 'ollama') return MODEL_SUGGESTIONS['ollama-embed'];
  }
  return MODEL_SUGGESTIONS[provider] ?? [];
};

const blank = (service: ModelService): ModelSetting => ({
  userId: '',
  service,
  enabled: true,
  provider: undefined,
  model: undefined,
  useOwnKey: false,
  updatedAt: new Date().toISOString(),
});

export function ModelsPage() {
  const [runtime, setRuntime] = useState<RuntimeProviderConfig | null>(null);
  const [form, setForm] = useState<FormState>({
    'ai-assist': blank('ai-assist'),
    embedding: blank('embedding'),
  });
  const [savingId, setSavingId] = useState<ModelService | ''>('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.runtime.config(), api.modelSettings.list()])
      .then(([rt, list]: [RuntimeProviderConfig, ModelSetting[]]) => {
        setRuntime(rt);
        const next: FormState = {
          'ai-assist': blank('ai-assist'),
          embedding: blank('embedding'),
        };
        for (const item of list ?? []) next[item.service] = item;
        setForm(next);
      })
      .catch(() => setError('Failed to load model settings.'));
  }, []);

  const providerOptions = (service: ModelService) =>
    service === 'ai-assist'
      ? (runtime?.llmProviders ?? [])
      : (runtime?.embeddingProviders ?? []);

  const update = (service: ModelService, patch: Partial<ModelSetting>) =>
    setForm((current) => ({
      ...current,
      [service]: { ...current[service], ...patch },
    }));

  const save = async (service: ModelService) => {
    setSavingId(service);
    setError('');
    setMessage('');
    try {
      const value = form[service];
      await api.modelSettings.upsert({
        service,
        enabled: value.enabled,
        provider: value.provider,
        model: value.model,
        useOwnKey: value.useOwnKey,
      });
      setMessage(`${service} settings saved.`);
    } catch (err: any) {
      setError(err.message ?? 'Unable to save settings.');
    } finally {
      setSavingId('');
    }
  };

  return (
    <div className="space-y-6">
      <Surface tone="soft" padding="lg">
        <Badge>Models</Badge>
        <h2 className="mt-2 font-display text-3xl text-foreground">
          Models & agents
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Activate which AI services run for your account and pin a specific
          provider/model per service. AI Assist (chat) and Embeddings (search)
          are configured independently.
        </p>
      </Surface>

      {message ? <Notice tone="success">{message}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      {SERVICES.map((svc) => {
        const value = form[svc.id];
        const providers = providerOptions(svc.id) as Array<
          LLMProvider | EmbeddingProvider
        >;
        return (
          <Surface key={svc.id} tone="default" padding="lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-xl text-foreground">
                  {svc.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {svc.blurb}
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={value.enabled}
                  onChange={(e) =>
                    update(svc.id, { enabled: e.target.checked })
                  }
                />
                Enabled
              </label>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <FieldGroup label="Provider">
                <Select
                  value={value.provider ?? ''}
                  onChange={(e) =>
                    update(svc.id, {
                      provider: (e.target.value || undefined) as never,
                    })
                  }
                  disabled={!value.enabled}
                >
                  <option value="">Use platform default</option>
                  {providers.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              </FieldGroup>
              <FieldGroup
                label="Model"
                hint="Optional. Leave blank for default. Click the input for suggestions."
              >
                <Input
                  list={`models-${svc.id}-${value.provider ?? 'default'}`}
                  value={value.model ?? ''}
                  onChange={(e) => update(svc.id, { model: e.target.value })}
                  placeholder={
                    svc.id === 'ai-assist'
                      ? 'e.g. claude-sonnet-4-5-20250929, gpt-4o-mini'
                      : 'e.g. voyage-code-3'
                  }
                  disabled={!value.enabled}
                />
                <datalist
                  id={`models-${svc.id}-${value.provider ?? 'default'}`}
                >
                  {suggestionsFor(svc.id, value.provider).map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </FieldGroup>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={value.useOwnKey}
                onChange={(e) =>
                  update(svc.id, { useOwnKey: e.target.checked })
                }
                disabled={!value.enabled}
              />
              Use my API key for this provider (manage keys in Provider API
              Keys)
            </label>
            <div className="mt-5">
              <Button
                onClick={() => save(svc.id)}
                disabled={savingId === svc.id}
              >
                {savingId === svc.id ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </Surface>
        );
      })}
    </div>
  );
}
