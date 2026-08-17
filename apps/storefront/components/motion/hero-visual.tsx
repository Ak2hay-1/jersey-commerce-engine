'use client';

import dynamic from 'next/dynamic';
import { useReducedMotion } from 'motion/react';
import { KenBurnsBackdrop } from './ken-burns-backdrop';
import { WebGLBoundary } from './webgl-boundary';

const WebGLHero = dynamic(() => import('./webgl-hero').then((module) => module.WebGLHero), {
  ssr: false,
  loading: () => null,
});

export function HeroVisual({ src }: { src: string }): React.JSX.Element {
  const reduced = useReducedMotion();

  return (
    <div className="absolute inset-0">
      <KenBurnsBackdrop src={src} />
      {reduced ? null : (
        <WebGLBoundary fallback={null}>
          <WebGLHero src={src} />
        </WebGLBoundary>
      )}
    </div>
  );
}
