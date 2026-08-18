'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';

const CURSOR_SIZE = 12;
const HOVER_SCALE = 44 / CURSOR_SIZE;
const SPRING = { stiffness: 700, damping: 38, mass: 0.2 };

export function CustomCursor(): React.JSX.Element | null {
  const reduced = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const hoveringRef = useRef(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const scale = useMotionValue(1);
  const springX = useSpring(x, SPRING);
  const springY = useSpring(y, SPRING);
  const springScale = useSpring(scale, SPRING);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    const hover = window.matchMedia('(hover: hover)').matches;
    if (!fine || !hover || reduced) {
      return;
    }
    setEnabled(true);
    document.documentElement.classList.add('has-custom-cursor');

    function move(event: PointerEvent) {
      x.set(event.clientX - CURSOR_SIZE / 2);
      y.set(event.clientY - CURSOR_SIZE / 2);
      const target = event.target;
      const next =
        target instanceof Element &&
        Boolean(target.closest('a, button, [data-cursor="hover"], .store-cta'));
      if (next === hoveringRef.current) {
        return;
      }
      hoveringRef.current = next;
      scale.set(next ? HOVER_SCALE : 1);
    }

    window.addEventListener('pointermove', move, { passive: true });
    return () => {
      document.documentElement.classList.remove('has-custom-cursor');
      window.removeEventListener('pointermove', move);
    };
  }, [reduced, x, y, scale]);

  if (!enabled) {
    return null;
  }

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[100] mix-blend-difference"
      style={{
        x: springX,
        y: springY,
        scale: springScale,
        width: CURSOR_SIZE,
        height: CURSOR_SIZE,
        willChange: 'transform',
      }}
    >
      <span className="block h-full w-full rounded-full bg-white" />
    </motion.div>
  );
}
