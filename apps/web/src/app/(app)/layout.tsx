import { AppFrame } from '../../components/templates/AppFrame';
import { RequireAuth } from '../../features/auth/components/RequireAuth';

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
