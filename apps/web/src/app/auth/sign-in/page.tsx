import { Suspense } from 'react';
import { AuthFrame } from '../../../components/templates/AuthFrame';
import { SignInForm } from '../../../features/auth/components/SignInForm';

export default function SignInRoute() {
  return (
    <AuthFrame maxWidth="7xl">
      <Suspense
        fallback={
          <div className="rounded-[32px] border border-white/10 bg-slate-950/85 p-8 text-slate-400">
            Loading sign-in…
          </div>
        }
      >
        <SignInForm />
      </Suspense>
    </AuthFrame>
  );
}
