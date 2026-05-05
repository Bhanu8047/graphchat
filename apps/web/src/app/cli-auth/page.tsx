import { Suspense } from 'react';
import { AuthFrame } from '../../components/templates/AuthFrame';
import { CliAuthApprover } from '../../features/auth/components/CliAuthApprover';

export const dynamic = 'force-dynamic';

export default function CliAuthRoute() {
  return (
    <AuthFrame maxWidth="4xl">
      <Suspense
        fallback={
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-8 text-muted-foreground">
            Loading…
          </div>
        }
      >
        <CliAuthApprover />
      </Suspense>
    </AuthFrame>
  );
}
