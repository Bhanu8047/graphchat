import { Suspense } from 'react';
import { AuthFrame } from '../../../components/templates/AuthFrame';
import { SignInForm } from '../../../features/auth/components/SignInForm';

export default function SignInRoute() {
  return (
    <AuthFrame maxWidth="7xl">
      <Suspense
        fallback={
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-8 text-muted-foreground">
            Loading sign-in…
          </div>
        }
      >
        <SignInForm />
      </Suspense>
    </AuthFrame>
  );
}
