import { Suspense } from 'react';
import { ConnectionsPage } from '../../../../features/settings/components/ConnectionsPage';

export default function Route() {
  return (
    <Suspense fallback={null}>
      <ConnectionsPage />
    </Suspense>
  );
}
