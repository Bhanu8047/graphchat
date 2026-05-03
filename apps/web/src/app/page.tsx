'use client';
import { useEffect, useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Graph } from '../components/Graph';
import { ReposPanel } from '../components/ReposPanel';
import { SearchPanel } from '../components/SearchPanel';
import { AIPanel } from '../components/AIPanel';
import { ExportPanel } from '../components/ExportPanel';
import { api } from '../lib/api';

export default function Page() {
  const [tab, setTab] = useState('graph');
  const [repos, setRepos] = useState<any[]>([]);

  useEffect(() => {
    if (tab === 'graph') api.repos.list().then(setRepos).catch(() => {});
  }, [tab]);

  return (
    <div className="flex h-screen">
      <Sidebar active={tab} onChange={setTab} />
      <main className="flex-1 overflow-auto">
        {tab === 'graph'  && <div className="h-full p-6"><Graph repos={repos} /></div>}
        {tab === 'repos'  && <ReposPanel />}
        {tab === 'search' && <SearchPanel />}
        {tab === 'ai'     && <AIPanel />}
        {tab === 'export' && <ExportPanel />}
      </main>
    </div>
  );
}
