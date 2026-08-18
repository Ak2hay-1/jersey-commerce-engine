'use client';

import { useEffect, type ReactNode } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

export function SmoothScroll({ children }: { children: ReactNode }): React.JSX.Element {
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) {
      return;
    }
    const lenis = new Lenis({
      lerp: 0.14,
      smoothWheel: true,
    });
    let frame = 0;
    const tick = (time: number) => {
      lenis.raf(time);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
