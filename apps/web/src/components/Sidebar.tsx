'use client';

const tabs = [
  { id: 'graph',  label: 'Graph' },
  { id: 'repos',  label: 'Repos' },
  { id: 'search', label: 'Search' },
  { id: 'ai',     label: 'AI Assist' },
  { id: 'export', label: 'Export' },
];

export function Sidebar({ active, onChange }: { active: string; onChange: (id: string) => void }) {
  return (
    <aside className="w-48 bg-slate-950 border-r border-slate-800 p-4">
      <h1 className="text-xl font-bold mb-6 text-blue-400">VectorGraph</h1>
      <nav className="space-y-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`w-full text-left px-3 py-2 rounded ${active === t.id ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
