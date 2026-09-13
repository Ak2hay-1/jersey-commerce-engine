'use client';

import { resolveStaffModeUrl, type StaffMode } from '@jersey-commerce/utils';
import { Button, cn } from '@jersey-commerce/ui';

export type DesktopStaffMode = StaffMode;

declare global {
  interface Window {
    jceDesktop?: {
      isDesktop: boolean;
      getMode: () => Promise<DesktopStaffMode>;
      switchMode: (mode: DesktopStaffMode) => Promise<DesktopStaffMode>;
      getApiUrl: () => Promise<string>;
    };
  }
}

export function isDesktopApp(): boolean {
  return typeof window !== 'undefined' && Boolean(window.jceDesktop?.isDesktop);
}

function staffModeUrl(mode: StaffMode): string {
  return resolveStaffModeUrl(mode, {
    origin: window.location.origin,
    pathname: window.location.pathname,
    port: window.location.port,
    posUrlOverride: process.env.NEXT_PUBLIC_POS_URL,
    staffUrlOverride: process.env.NEXT_PUBLIC_STAFF_URL,
  });
}

function switchStaffMode(mode: StaffMode, active: StaffMode): void {
  if (mode === active) {
    return;
  }
  if (isDesktopApp()) {
    void window.jceDesktop?.switchMode(mode);
    return;
  }
  window.location.assign(staffModeUrl(mode));
}

export function DesktopModeSwitch({
  active,
  showPos = true,
}: {
  active: StaffMode;
  showPos?: boolean;
}): React.JSX.Element | null {
  if (!showPos && active !== 'pos') {
    return null;
  }

  return (
    <div className="flex items-center gap-1 rounded-md border p-0.5" role="group" aria-label="Staff mode">
      {showPos ? (
        <Button
          type="button"
          size="sm"
          variant={active === 'pos' ? 'default' : 'ghost'}
          className={cn('h-8 px-3')}
          aria-pressed={active === 'pos'}
          onClick={() => switchStaffMode('pos', active)}
        >
          POS
        </Button>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant={active === 'erp' ? 'default' : 'ghost'}
        className={cn('h-8 px-3')}
        aria-pressed={active === 'erp'}
        onClick={() => switchStaffMode('erp', active)}
      >
        ERP
      </Button>
    </div>
  );
}
