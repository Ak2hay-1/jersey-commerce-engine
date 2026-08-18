'use client';

import { useEffect, useState } from 'react';

export function canCreateWebGLContext(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export function useAccentCssColor(): string {
  const [color, setColor] = useState('hsl(24 95% 53%)');

  useEffect(() => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    if (raw) {
      setColor(`hsl(${raw})`);
    }
  }, []);

  return color;
}

export function useOffscreenFrameloop(element: HTMLElement | null): 'always' | 'demand' {
  const [loop, setLoop] = useState<'always' | 'demand'>('demand');

  useEffect(() => {
    if (!element) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setLoop(entry?.isIntersecting ? 'always' : 'demand');
      },
      { rootMargin: '80px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return loop;
}
