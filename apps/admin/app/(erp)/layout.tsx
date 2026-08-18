import type { ReactNode } from 'react';
import { ErpShell } from '@/components/erp-shell';

export default function AuthenticatedLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return <ErpShell>{children}</ErpShell>;
}
