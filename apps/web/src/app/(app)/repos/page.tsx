import { Suspense } from 'react';
import { RepositoriesPage } from '../../../features/repositories/components/RepositoriesPage';

export default function RepositoriesRoute() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-muted-foreground">Loading repositories…</div>
      }
    >
      <RepositoriesPage />
    </Suspense>
  );
}
