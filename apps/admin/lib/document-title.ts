import {
  ERP_NAV,
  ERP_NAV_SEARCH_EXTRA,
  type ErpNavItem,
} from '@jersey-commerce/types';

const TITLE_SUFFIX = 'Jerzyfy Admin';

const AUTH_TITLES: Record<string, string> = {
  '/login': 'Login',
  '/forgot-password': 'Forgot password',
  '/change-password': 'Change password',
};

function hrefPath(href: string): string {
  return href.split('?')[0] ?? href;
}

function allNavItems(): ErpNavItem[] {
  return [...ERP_NAV.flatMap((section) => section.items), ...ERP_NAV_SEARCH_EXTRA];
}

/** Best-matching ERP nav label for the current path (longest path prefix wins). */
export function adminTitleForPath(pathname: string): string {
  const clean = pathname.replace(/\/$/, '') || '/';
  if (AUTH_TITLES[clean]) {
    return AUTH_TITLES[clean];
  }
  if (clean === '/' || clean === '') {
    return 'Dashboard';
  }

  let best: { label: string; length: number } | null = null;
  for (const item of allNavItems()) {
    const path = hrefPath(item.href).replace(/\/$/, '') || '/';
    if (clean === path || clean.startsWith(`${path}/`)) {
      if (!best || path.length > best.length) {
        best = { label: item.label, length: path.length };
      }
    }
  }
  if (best) {
    return best.label;
  }

  const segment = clean.split('/').filter(Boolean)[0];
  if (!segment) {
    return 'Dashboard';
  }
  return segment
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatAdminDocumentTitle(pathname: string): string {
  return `${adminTitleForPath(pathname)} · ${TITLE_SUFFIX}`;
}
