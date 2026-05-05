import { Suspense, type ReactNode } from 'react';
import { MarketingShell } from '../../components/templates/MarketingShell';
import { GuestOnly } from '../../features/auth/components/GuestOnly';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <MarketingShell>
      <Suspense fallback={null}>
        <GuestOnly>{children}</GuestOnly>
      </Suspense>
    </MarketingShell>
  );
}
