import type { ReactNode } from 'react';
import { PosShell } from '@/components/pos-shell';
import { PosSessionProvider } from '@/lib/session';

export default function AuthenticatedLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <PosSessionProvider>
      <PosShell>{children}</PosShell>
    </PosSessionProvider>
  );
}
