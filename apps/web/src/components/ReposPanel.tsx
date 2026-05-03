'use client';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export function ReposPanel() {
  const [repos, setRepos] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', description: '', techStack: '', agent: 'claude' });
  const [nodeForm, setNodeForm] = useState({ repoId: '', type: 'module', label: '', content: '', tags: '' });

  const load = () => api.repos.list().then(setRepos).catch(() => {});
  useEffect(() => { load(); }, []);

  const createRepo = async (e: any) => {
    e.preventDefault();
    await api.repos.create({ ...form, techStack: form.techStack.split(',').map(s => s.trim()).filter(Boolean) });
    setForm({ name: '', description: '', techStack: '', agent: 'claude' });
    load();
  };

  const deleteRepo = async (id: string) => { await api.repos.delete(id); load(); };

  const createNode = async (e: any) => {
    e.preventDefault();
    await api.nodes.create({ ...nodeForm, tags: nodeForm.tags.split(',').map(s => s.trim()).filter(Boolean) });
    setNodeForm({ ...nodeForm, label: '', content: '', tags: '' });
    load();
  };

  return (
    <div className="p-6 space-y-6">
      <section className="bg-slate-800 p-4 rounded">
        <h2 className="text-lg font-semibold mb-3">Add Repository</h2>
        <form onSubmit={createRepo} className="grid grid-cols-2 gap-2">
          <input className="bg-slate-700 p-2 rounded" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <input className="bg-slate-700 p-2 rounded" placeholder="Tech stack (comma)" value={form.techStack} onChange={e => setForm({ ...form, techStack: e.target.value })} />
          <input className="bg-slate-700 p-2 rounded col-span-2" placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <select className="bg-slate-700 p-2 rounded" value={form.agent} onChange={e => setForm({ ...form, agent: e.target.value })}>
            <option value="claude">Claude</option><option value="gpt">GPT</option><option value="gemini">Gemini</option><option value="all">All</option>
          </select>
          <button className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded" type="submit">Create</button>
        </form>
      </section>

      <section className="bg-slate-800 p-4 rounded">
        <h2 className="text-lg font-semibold mb-3">Add Context Node</h2>
        <form onSubmit={createNode} className="grid grid-cols-2 gap-2">
          <select className="bg-slate-700 p-2 rounded" value={nodeForm.repoId} onChange={e => setNodeForm({ ...nodeForm, repoId: e.target.value })} required>
            <option value="">Select repo…</option>
            {repos.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select className="bg-slate-700 p-2 rounded" value={nodeForm.type} onChange={e => setNodeForm({ ...nodeForm, type: e.target.value })}>
            {['module','api','schema','entry','config','note'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input className="bg-slate-700 p-2 rounded" placeholder="Label" value={nodeForm.label} onChange={e => setNodeForm({ ...nodeForm, label: e.target.value })} required />
          <input className="bg-slate-700 p-2 rounded" placeholder="Tags (comma)" value={nodeForm.tags} onChange={e => setNodeForm({ ...nodeForm, tags: e.target.value })} />
          <textarea className="bg-slate-700 p-2 rounded col-span-2" placeholder="Content" value={nodeForm.content} onChange={e => setNodeForm({ ...nodeForm, content: e.target.value })} required />
          <button className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded col-span-2" type="submit">Add Node</button>
        </form>
      </section>

      <section className="bg-slate-800 p-4 rounded">
        <h2 className="text-lg font-semibold mb-3">Repositories ({repos.length})</h2>
        <ul className="space-y-2">
          {repos.map(r => (
            <li key={r.id} className="flex items-center justify-between bg-slate-700 p-3 rounded">
              <div>
                <div className="font-medium">{r.name} <span className="text-xs text-slate-400">({r.nodes?.length ?? 0} nodes)</span></div>
                <div className="text-sm text-slate-400">{r.description}</div>
              </div>
              <button onClick={() => deleteRepo(r.id)} className="text-red-400 hover:text-red-300 text-sm">Delete</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
