import { Suspense } from 'react';
import { SignInForm } from '../../../features/auth/components/SignInForm';

export default function SignInRoute() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.14),_transparent_26%),linear-gradient(180deg,_#08111f_0%,_#04070f_100%)] px-4 py-8 text-slate-100 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Suspense fallback={<div className="rounded-[32px] border border-white/10 bg-slate-950/85 p-8 text-slate-400">Loading sign-in…</div>}><SignInForm /></Suspense>
      </div>
    </div>
  );
}