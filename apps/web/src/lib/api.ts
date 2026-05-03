const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

const json = async (res: Response) => {
  if (res.ok) return res.json();

  const payload = await res.json().catch(() => null);
  const message = typeof payload?.message === 'string'
    ? payload.message
    : Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : res.statusText;

  throw new Error(message || 'Request failed');
};
const h = { 'Content-Type': 'application/json' };

export const api = {
  runtime: {
    config: () => fetch(`${BASE}/runtime/config`).then(json),
  },
  repos: {
    list:    ()           => fetch(`${BASE}/repos`).then(json),
    get:     (id: string) => fetch(`${BASE}/repos/${id}`).then(json),
    create:  (body: any)  => fetch(`${BASE}/repos`, { method: 'POST', headers: h, body: JSON.stringify(body) }).then(json),
    importGithub: (body: any) => fetch('/api/github/import', { method: 'POST', headers: h, body: JSON.stringify(body) }).then(json),
    delete:  (id: string) => fetch(`${BASE}/repos/${id}`, { method: 'DELETE' }),
  },
  nodes: {
    create: (body: any)  => fetch(`${BASE}/nodes`, { method: 'POST', headers: h, body: JSON.stringify(body) }).then(json),
    delete: (id: string) => fetch(`${BASE}/nodes/${id}`, { method: 'DELETE' }),
  },
  search: {
    query: (q: string, repoId?: string, type?: string, k?: number) => {
      const params = new URLSearchParams({ q, ...(repoId && { repoId }), ...(type && { type }), ...(k && { k: String(k) }) });
      return fetch(`${BASE}/search?${params}`).then(json);
    },
  },
  ai: {
    suggest: (repoId: string, input: string) =>
      fetch(`${BASE}/ai/suggest`, { method: 'POST', headers: h, body: JSON.stringify({ repoId, input }) }).then(json),
  },
  export: {
    repo: (id: string) => fetch(`${BASE}/export/${id}`).then(json),
  },
};
