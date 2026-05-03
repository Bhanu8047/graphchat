import { Suspense } from 'react';
import { HomeShell } from '../components/HomeShell';

export default function Page() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950 text-slate-300">Loading…</div>}>
      <HomeShell />
    </Suspense>
  );
}
