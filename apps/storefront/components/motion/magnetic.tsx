'use client';

import { useReducedMotion } from 'motion/react';
import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';

export function Magnetic({ children, className }: { children: ReactNode; className?: string }): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const frameRef = useRef(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    function onResize() {
      if (rectRef.current && ref.current) {
        rectRef.current = ref.current.getBoundingClientRect();
      }
    }
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  function onEnter() {
    if (ref.current) {
      rectRef.current = ref.current.getBoundingClientRect();
      ref.current.style.transition = 'none';
    }
  }

  function onMove(event: MouseEvent<HTMLDivElement>) {
    if (reduced || !ref.current) {
      return;
    }
    const box = rectRef.current;
    if (!box) {
      return;
    }
    const x = event.clientX - box.left - box.width / 2;
    const y = event.clientY - box.top - box.height / 2;
    const el = ref.current;
    window.cancelAnimationFrame(frameRef.current);
    frameRef.current = window.requestAnimationFrame(() => {
      el.style.transform = `translate(${x * 0.22}px, ${y * 0.22}px)`;
    });
  }

  function onLeave() {
    window.cancelAnimationFrame(frameRef.current);
    if (ref.current) {
      ref.current.style.transition = 'transform 0.2s ease';
      ref.current.style.transform = '';
    }
    rectRef.current = null;
  }

  return (
    <div ref={ref} className={className} onMouseEnter={onEnter} onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
    </div>
  );
}
