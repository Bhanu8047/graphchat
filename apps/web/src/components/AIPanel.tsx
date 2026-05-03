'use client';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export function AIPanel() {
  const [repos, setRepos] = useState<any[]>([]);
  const [repoId, setRepoId] = useState('');
  const [input, setInput] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.repos.list().then(setRepos).catch(() => {}); }, []);

  const run = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      const repo = repos.find(r => r.id === repoId);
      const res = await api.ai.suggest(repo?.name ?? repoId, input);
      setResult(res);
    } finally { setLoading(false); }
  };

  const accept = async () => {
    if (!result || !repoId) return;
    await api.nodes.create({ repoId, ...result });
    setResult(null); setInput('');
  };

  return (
    <div className="p-6 space-y-4">
      <form onSubmit={run} className="space-y-2">
        <select className="bg-slate-700 p-2 rounded w-full" value={repoId} onChange={e => setRepoId(e.target.value)} required>
          <option value="">Select repo…</option>
          {repos.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <textarea className="bg-slate-700 p-2 rounded w-full h-40" placeholder="Paste code or docs…" value={input} onChange={e => setInput(e.target.value)} required />
        <button className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded" type="submit" disabled={loading}>{loading ? 'Thinking…' : 'Suggest'}</button>
      </form>
      {result && (
        <div className="bg-slate-800 p-4 rounded space-y-2">
          <div className="font-semibold">{result.label} <span className="text-xs text-slate-400">[{result.type}]</span></div>
          <div className="text-sm">{result.content}</div>
          <div className="text-xs text-slate-400">Tags: {result.tags?.join(', ')}</div>
          <button onClick={accept} className="bg-emerald-600 hover:bg-emerald-500 px-3 py-1 rounded text-sm">Accept &amp; Save</button>
        </div>
      )}
    </div>
  );
}
