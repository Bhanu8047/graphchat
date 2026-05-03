'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Graph } from './Graph';
import { ReposPanel } from './ReposPanel';
import { SearchPanel } from './SearchPanel';
import { AIPanel } from './AIPanel';
import { ExportPanel } from './ExportPanel';
import { api } from '../lib/api';

const validTabs = new Set(['graph', 'repos', 'search', 'ai', 'export']);

export function HomeShell() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const [tab, setTab] = useState(() => (requestedTab && validTabs.has(requestedTab) ? requestedTab : 'graph'));

  useEffect(() => {
    const nextTab = requestedTab && validTabs.has(requestedTab) ? requestedTab : 'graph';
    if (nextTab !== tab) {
      setTab(nextTab);
    }
  }, [requestedTab, tab]);

  const handleTabChange = (nextTab: string) => {
    setTab(nextTab);
    const params = new URLSearchParams(searchParams.toString());
    if (nextTab === 'graph') {
      params.delete('tab');
    } else {
      params.set('tab', nextTab);
    }
    params.delete('githubAuth');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };
  return (
    <div className="flex h-screen">
      <Sidebar active={tab} onChange={handleTabChange} />
      <main className="flex-1 overflow-auto">
        {tab === 'graph'  && <div className="h-full p-6"><Graph /></div>}
        {tab === 'repos'  && <ReposPanel />}
        {tab === 'search' && <SearchPanel />}
        {tab === 'ai'     && <AIPanel />}
        {tab === 'export' && <ExportPanel />}
      </main>
    </div>
  );
}