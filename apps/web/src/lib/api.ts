const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
const apiFetch = (input: string, init?: RequestInit) => fetch(input, { credentials: 'include', ...init });

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
    config: () => apiFetch(`${BASE}/runtime/config`).then(json),
  },
  graph: {
    get: (repoId: string) => apiFetch(`${BASE}/graphs/${repoId}`).then(json),
    syncGithub: (repoId: string, body?: any) => apiFetch(`${BASE}/graphs/${repoId}/sync/github`, { method: 'POST', headers: h, body: JSON.stringify(body ?? {}) }).then(json),
  },
  repos: {
    list:    ()           => apiFetch(`${BASE}/repos`).then(json),
    get:     (id: string) => apiFetch(`${BASE}/repos/${id}`).then(json),
    create:  (body: any)  => apiFetch(`${BASE}/repos`, { method: 'POST', headers: h, body: JSON.stringify(body) }).then(json),
    listGithubBranches: (url: string) => fetch('/api/github/branches', { method: 'POST', headers: h, body: JSON.stringify({ url }) }).then(json),
    importGithub: (body: any) => fetch('/api/github/import', { method: 'POST', headers: h, body: JSON.stringify(body) }).then(json),
    delete:  (id: string) => apiFetch(`${BASE}/repos/${id}`, { method: 'DELETE' }),
  },
  nodes: {
    create: (body: any)  => apiFetch(`${BASE}/nodes`, { method: 'POST', headers: h, body: JSON.stringify(body) }).then(json),
    delete: (id: string) => apiFetch(`${BASE}/nodes/${id}`, { method: 'DELETE' }),
  },
  search: {
    query: (q: string, repoId?: string, type?: string, k?: number) => {
      const params = new URLSearchParams({ q, ...(repoId && { repoId }), ...(type && { type }), ...(k && { k: String(k) }) });
      return apiFetch(`${BASE}/search?${params}`).then(json);
    },
  },
  ai: {
    suggest: (repoId: string, input: string) =>
      apiFetch(`${BASE}/ai/suggest`, { method: 'POST', headers: h, body: JSON.stringify({ repoId, input }) }).then(json),
  },
  export: {
    repo: (id: string) => apiFetch(`${BASE}/export/${id}`).then(json),
  },
  dashboard: {
    stats: () => apiFetch(`${BASE}/dashboard/stats`).then(json),
  },
  users: {
    me: () => apiFetch(`${BASE}/users/me`).then(json),
    updateMe: (body: any) => apiFetch(`${BASE}/users/me`, { method: 'PATCH', headers: h, body: JSON.stringify(body) }).then(json),
    deleteMe: () => apiFetch(`${BASE}/users/me`, { method: 'DELETE' }).then(json),
  },
};
