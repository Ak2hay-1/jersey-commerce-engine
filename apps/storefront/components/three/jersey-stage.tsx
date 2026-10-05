'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import {
  ContactShadows,
  Environment,
  Float,
  Lightformer,
  OrbitControls,
  PresentationControls,
} from '@react-three/drei';
import type { MotionValue } from 'motion/react';
import { useReducedMotion } from 'motion/react';
import { Suspense, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { canCreateWebGLContext, useOffscreenFrameloop } from '../motion/webgl-utils';
import { WebGLBoundary } from '../motion/webgl-boundary';
import type { JerseyDesign } from './jersey-design';
import { ProceduralJersey } from './procedural-jersey';
import { GlbJersey, probeJerseyModel } from './glb-jersey';

export type JerseyStageVariant = 'hero' | 'viewer' | 'scroll';

export type JerseyStageProps = {
  design: JerseyDesign;
  variant?: JerseyStageVariant;
  /** Changing this value plays a full turn, e.g. when the hero switches product. */
  spinKey?: string;
  /** Radians; drives Y rotation from page scroll in the `scroll` variant. */
  scrollRotation?: MotionValue<number>;
  /** Shows the back (name + number) instead of the front. */
  showBack?: boolean;
  accent?: string;
  fallback?: React.ReactNode;
  className?: string;
  onReady?: () => void;
  onFailed?: () => void;
};

function FailureSignal({ onFailed, children }: { onFailed?: () => void; children: React.ReactNode }): React.JSX.Element {
  useEffect(() => {
    onFailed?.();
  }, [onFailed]);
  return <>{children}</>;
}

function ReadySignal({ onReady }: { onReady?: () => void }): null {
  useEffect(() => {
    onReady?.();
  }, [onReady]);
  return null;
}

type ModelSource = 'checking' | 'glb' | 'procedural';

function useModelSource(): ModelSource {
  const [source, setSource] = useState<ModelSource>('checking');
  useEffect(() => {
    let active = true;
    void probeJerseyModel().then((available) => {
      if (active) {
        setSource(available ? 'glb' : 'procedural');
      }
    });
    return () => {
      active = false;
    };
  }, []);
  return source;
}

function JerseyModel({ design, cloth }: { design: JerseyDesign; cloth: number }): React.JSX.Element | null {
  const source = useModelSource();
  if (source === 'checking') {
    return null;
  }
  if (source === 'glb') {
    return (
      <WebGLBoundary fallback={<ProceduralJersey design={design} cloth={cloth} />}>
        <Suspense fallback={<ProceduralJersey design={design} cloth={cloth} />}>
          <GlbJersey design={design} />
        </Suspense>
      </WebGLBoundary>
    );
  }
  return <ProceduralJersey design={design} cloth={cloth} />;
}

function JerseyRig({
  children,
  spinKey,
  scrollRotation,
  showBack,
  tilt,
  reduced,
}: {
  children: React.ReactNode;
  spinKey?: string;
  scrollRotation?: MotionValue<number>;
  showBack?: boolean;
  tilt: boolean;
  reduced: boolean;
}): React.JSX.Element {
  const group = useRef<THREE.Group>(null);
  const target = useRef(showBack ? Math.PI : 0);
  const entered = useRef(false);
  const lastKey = useRef(spinKey);

  useEffect(() => {
    if (lastKey.current === spinKey) {
      return;
    }
    lastKey.current = spinKey;
    if (!reduced) {
      target.current += Math.PI * 2;
    }
  }, [spinKey, reduced]);

  useEffect(() => {
    const base = Math.round(target.current / (Math.PI * 2)) * Math.PI * 2;
    target.current = base + (showBack ? Math.PI : 0);
  }, [showBack]);

  useFrame((state, delta) => {
    const node = group.current;
    if (!node) {
      return;
    }
    if (!entered.current) {
      entered.current = true;
      node.rotation.y = reduced ? target.current : target.current - Math.PI * 1.25;
      node.scale.setScalar(reduced ? 1 : 0.6);
    }
    const scroll = scrollRotation?.get() ?? 0;
    node.rotation.y = THREE.MathUtils.damp(node.rotation.y, target.current + scroll, reduced ? 20 : 3.2, delta);
    node.scale.setScalar(THREE.MathUtils.damp(node.scale.x, 1, 4, delta));
    if (tilt && !reduced) {
      node.rotation.x = THREE.MathUtils.damp(node.rotation.x, -state.pointer.y * 0.12, 4, delta);
      node.position.x = THREE.MathUtils.damp(node.position.x, state.pointer.x * 0.08, 4, delta);
    }
  });

  return <group ref={group}>{children}</group>;
}

function Lighting({ accent }: { accent: string }): React.JSX.Element {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 5]} intensity={1.6} castShadow />
      <directionalLight position={[-4, 2, -3]} intensity={1.1} color={accent} />
      <spotLight position={[0, 5, -4]} angle={0.5} penumbra={1} intensity={18} color="#ffffff" />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={2.4} position={[0, 3, 4]} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={1.4} color={accent} position={[-5, 0, -2]} rotation-y={Math.PI / 2} scale={[4, 6, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[5, 1, 0]} rotation-y={-Math.PI / 2} scale={[4, 6, 1]} />
        <Lightformer form="ring" intensity={0.8} position={[0, -3, 2]} scale={2} />
      </Environment>
    </>
  );
}

export default function JerseyStage({
  design,
  variant = 'hero',
  spinKey,
  scrollRotation,
  showBack,
  accent = '#ea580c',
  fallback = null,
  className,
  onReady,
  onFailed,
}: JerseyStageProps): React.JSX.Element {
  const reduced = Boolean(useReducedMotion());
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [interacted, setInteracted] = useState(false);
  const visibleLoop = useOffscreenFrameloop(root);

  useEffect(() => {
    setSupported(canCreateWebGLContext());
  }, []);

  if (supported === false) {
    return <FailureSignal onFailed={onFailed}>{fallback}</FailureSignal>;
  }

  const cloth = reduced ? 0 : 1;
  const rig = (
    <JerseyRig
      spinKey={spinKey}
      scrollRotation={scrollRotation}
      showBack={showBack}
      tilt={variant !== 'viewer'}
      reduced={reduced}
    >
      <JerseyModel design={design} cloth={cloth} />
    </JerseyRig>
  );

  let scene: React.ReactNode = rig;
  if (variant === 'hero') {
    scene = (
      <PresentationControls
        global={false}
        cursor
        snap
        speed={1.4}
        polar={[-0.2, 0.25]}
        azimuth={[-Math.PI / 2.5, Math.PI / 2.5]}
      >
        <Float enabled={!reduced} speed={1.6} rotationIntensity={0.25} floatIntensity={0.6} floatingRange={[-0.06, 0.06]}>
          {rig}
        </Float>
      </PresentationControls>
    );
  } else if (variant === 'scroll') {
    scene = (
      <Float enabled={!reduced} speed={1.2} rotationIntensity={0.1} floatIntensity={0.35}>
        {rig}
      </Float>
    );
  }

  return (
    <div ref={setRoot} className={className} style={{ touchAction: variant === 'viewer' ? 'none' : 'pan-y' }}>
      {supported ? (
        <WebGLBoundary fallback={<FailureSignal onFailed={onFailed}>{fallback}</FailureSignal>}>
          <Canvas
            shadows
            dpr={[1, 1.75]}
            frameloop={reduced && variant !== 'viewer' ? 'demand' : visibleLoop}
            camera={{ position: [0, 0.05, variant === 'viewer' ? 3.6 : 3.9], fov: 34 }}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
            onCreated={({ gl }) => {
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.setClearColor(0x000000, 0);
            }}
          >
            <Suspense fallback={null}>
              <Lighting accent={accent} />
              {scene}
              <ReadySignal onReady={onReady} />
              <ContactShadows position={[0, -1.08, 0]} opacity={0.5} scale={4.5} blur={2.6} far={2.2} resolution={512} />
            </Suspense>
            {variant === 'viewer' ? (
              <OrbitControls
                enablePan={false}
                enableZoom={false}
                minPolarAngle={Math.PI * 0.32}
                maxPolarAngle={Math.PI * 0.62}
                autoRotate={!reduced && !interacted}
                onStart={() => setInteracted(true)}
                autoRotateSpeed={1.2}
                makeDefault
              />
            ) : null}
          </Canvas>
        </WebGLBoundary>
      ) : (
        fallback
      )}
    </div>
  );
}
