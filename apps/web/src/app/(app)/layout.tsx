import type { Metadata } from 'next';
import { AppFrame } from '../../components/templates/AppFrame';
import { RequireAuth } from '../../features/auth/components/RequireAuth';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppFrame>
      <RequireAuth>{children}</RequireAuth>
    </AppFrame>
  );
}
