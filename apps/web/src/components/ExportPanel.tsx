'use client';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export function ExportPanel() {
  const [repos, setRepos] = useState<any[]>([]);
  const [repoId, setRepoId] = useState('');
  const [payload, setPayload] = useState<any>(null);

  useEffect(() => { api.repos.list().then(setRepos).catch(() => {}); }, []);

  const run = async () => {
    if (!repoId) return;
    setPayload(await api.export.repo(repoId));
  };

  const copy = () => navigator.clipboard.writeText(JSON.stringify(payload, null, 2));

  return (
    <div className="p-6 space-y-4">
      <div className="flex gap-2">
        <select className="bg-slate-700 p-2 rounded flex-1" value={repoId} onChange={e => setRepoId(e.target.value)}>
          <option value="">Select repo…</option>
          {repos.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <button onClick={run} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded">Export</button>
        {payload && <button onClick={copy} className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded">Copy JSON</button>}
      </div>
      {payload && (
        <pre className="bg-slate-900 p-4 rounded overflow-auto text-xs max-h-[70vh]">
          {JSON.stringify(payload, null, 2)}
        </pre>
      )}
    </div>
  );
}
