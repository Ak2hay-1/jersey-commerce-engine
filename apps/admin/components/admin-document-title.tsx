'use client';

import { useAdminDocumentTitle } from '@/lib/use-document-title';

/** Keeps document.title route-specific under the static-export SPA shell. */
export function AdminDocumentTitle(): null {
  useAdminDocumentTitle();
  return null;
}
