import { type ReactNode } from 'react';
import { MarketingShell } from '../../components/templates/MarketingShell';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <MarketingShell>{children}</MarketingShell>;
}
