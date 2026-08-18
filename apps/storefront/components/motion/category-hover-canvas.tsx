'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { useReducedMotion } from 'motion/react';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useOffscreenFrameloop } from './webgl-utils';
import { WebGLBoundary } from './webgl-boundary';

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform vec2 uMouse;
  uniform float uHover;
  varying vec2 vUv;
  void main() {
    vec2 uv = vUv;
    vec2 disp = (uv - uMouse) * 0.12 * uHover;
    gl_FragColor = texture2D(uTexture, uv + disp);
  }
`;

function DistortionPlane({ src, hover }: { src: string; hover: number }): React.JSX.Element {
  const texture = useTexture(src);
  texture.colorSpace = THREE.SRGBColorSpace;
  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uHover: { value: 0 },
    }),
    [texture],
  );
  const hoverRef = useRef(0);

  useFrame((state) => {
    hoverRef.current = THREE.MathUtils.lerp(hoverRef.current, hover, 0.1);
    uniforms.uHover.value = hoverRef.current;
    uniforms.uMouse.value.set(state.pointer.x * 0.5 + 0.5, state.pointer.y * 0.5 + 0.5);
  });

  return (
    <mesh>
      <planeGeometry args={[1.7, 2.12]} />
      <shaderMaterial uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} />
    </mesh>
  );
}

export function CategoryHoverCanvas({ src }: { src: string }): React.JSX.Element | null {
  const reduced = useReducedMotion();
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [hover, setHover] = useState(0);
  const frameloop = useOffscreenFrameloop(root);

  useEffect(() => {
    const parent = root?.closest('.group');
    if (!parent) {
      return;
    }
    const enter = () => setHover(1);
    const leave = () => setHover(0);
    parent.addEventListener('pointerenter', enter);
    parent.addEventListener('pointerleave', leave);
    return () => {
      parent.removeEventListener('pointerenter', enter);
      parent.removeEventListener('pointerleave', leave);
    };
  }, [root]);

  if (reduced) {
    return null;
  }

  return (
    <div ref={setRoot} className="pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
      <WebGLBoundary fallback={null}>
        <Canvas dpr={[1, 1.25]} frameloop={hover > 0.01 || frameloop === 'always' ? 'always' : 'demand'} camera={{ position: [0, 0, 2.1], fov: 35 }}>
          <Suspense fallback={null}>
            <DistortionPlane src={src} hover={hover} />
          </Suspense>
        </Canvas>
      </WebGLBoundary>
    </div>
  );
}
