'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { formatAdminDocumentTitle } from './document-title';

/** Static export has one HTML shell — keep the tab title in sync with the route. */
export function useAdminDocumentTitle(): void {
  const pathname = usePathname();
  useEffect(() => {
    document.title = formatAdminDocumentTitle(pathname);
  }, [pathname]);
}
