'use client';

import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import type { JerseyStageProps } from './jersey-stage';

const JerseyStageInner = dynamic(() => import('./jersey-stage'), { ssr: false, loading: () => null });

/**
 * Keeps three.js out of the initial bundle. The fallback (usually the product photo) stays
 * visible until the WebGL canvas is live, then crossfades out; it returns if WebGL fails.
 */
export function JerseyStage({ fallback, className, ...props }: JerseyStageProps): React.JSX.Element {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div className={className ? `relative ${className}` : 'relative'}>
      <AnimatePresence initial={false}>
        {!ready || failed ? (
          <motion.div
            key="jersey-fallback"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.5 }}
          >
            {fallback}
          </motion.div>
        ) : null}
      </AnimatePresence>
      {failed ? null : (
        <div className="absolute inset-0">
          <JerseyStageInner
            {...props}
            className="h-full w-full"
            onReady={() => setReady(true)}
            onFailed={() => setFailed(true)}
          />
        </div>
      )}
    </div>
  );
}
