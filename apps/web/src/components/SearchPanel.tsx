'use client';
import { useState } from 'react';
import { api } from '../lib/api';

export function SearchPanel() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const run = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try { setResults(await api.search.query(q)); } finally { setLoading(false); }
  };

  return (
    <div className="p-6 space-y-4">
      <form onSubmit={run} className="flex gap-2">
        <input className="bg-slate-700 p-2 rounded flex-1" placeholder="Semantic search…" value={q} onChange={e => setQ(e.target.value)} required />
        <button className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded" type="submit" disabled={loading}>{loading ? '…' : 'Search'}</button>
      </form>
      <ul className="space-y-2">
        {results.map((r, i) => (
          <li key={i} className="bg-slate-800 p-3 rounded">
            <div className="flex justify-between">
              <span className="font-medium">{r.node.label} <span className="text-xs text-slate-400">[{r.node.type}]</span></span>
              <span className="text-emerald-400 text-sm">{(r.score * 100).toFixed(1)}%</span>
            </div>
            <div className="text-sm text-slate-300 mt-1">{r.node.content}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
