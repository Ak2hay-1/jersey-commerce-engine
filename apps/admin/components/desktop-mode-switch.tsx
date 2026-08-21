'use client';

import { useEffect, useState } from 'react';
import { Button, cn } from '@jersey-commerce/ui';

export type DesktopStaffMode = 'pos' | 'erp';

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

export function DesktopModeSwitch({ active }: { active: DesktopStaffMode }): React.JSX.Element | null {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isDesktopApp());
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 rounded-md border p-0.5" role="group" aria-label="App mode">
      <Button
        type="button"
        size="sm"
        variant={active === 'pos' ? 'default' : 'ghost'}
        className={cn('h-8 px-3')}
        onClick={() => void window.jceDesktop?.switchMode('pos')}
      >
        POS
      </Button>
      <Button
        type="button"
        size="sm"
        variant={active === 'erp' ? 'default' : 'ghost'}
        className={cn('h-8 px-3')}
        onClick={() => void window.jceDesktop?.switchMode('erp')}
      >
        ERP
      </Button>
    </div>
  );
}
