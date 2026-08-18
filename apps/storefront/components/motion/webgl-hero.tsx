'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { canCreateWebGLContext, useAccentCssColor, useOffscreenFrameloop } from './webgl-utils';

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
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    float dist = distance(uv, uMouse);
    float wave = sin(dist * 18.0 - uTime * 1.4) * 0.004;
    vec2 dir = uv - uMouse;
    vec2 disp = dir * 0.085 * exp(-dist * 5.5) + dir * wave;
    float r = texture2D(uTexture, uv + disp * 1.15).r;
    float g = texture2D(uTexture, uv + disp).g;
    float b = texture2D(uTexture, uv + disp * 0.75).b;
    gl_FragColor = vec4(r, g, b, 1.0);
  }
`;

function DisplacementPlane({ src }: { src: string }): React.JSX.Element {
  const texture = useTexture(src);
  // #region agent log
  fetch('http://127.0.0.1:7412/ingest/e788776b-2e05-46ac-bbcf-f37efdc25738',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'db5f59'},body:JSON.stringify({sessionId:'db5f59',hypothesisId:'A',location:'webgl-hero.tsx:DisplacementPlane',message:'useTexture resolved',data:{src, imageWidth: texture.image?.width ?? null, imageHeight: texture.image?.height ?? null},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  const mesh = useRef<THREE.Mesh>(null);
  const mouse = useRef(new THREE.Vector2(0.5, 0.5));
  const target = useRef(new THREE.Vector2(0.5, 0.5));
  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uTime: { value: 0 },
    }),
    [texture],
  );

  useFrame((state) => {
    target.current.set(state.pointer.x * 0.5 + 0.5, state.pointer.y * 0.5 + 0.5);
    mouse.current.lerp(target.current, 0.07);
    uniforms.uMouse.value.copy(mouse.current);
    uniforms.uTime.value = state.clock.elapsedTime;
    if (mesh.current) {
      mesh.current.rotation.y = THREE.MathUtils.lerp(mesh.current.rotation.y, state.pointer.x * 0.1, 0.05);
      mesh.current.rotation.x = THREE.MathUtils.lerp(mesh.current.rotation.x, -state.pointer.y * 0.05, 0.05);
    }
  });

  return (
    <mesh ref={mesh} scale={[2.15, 1.22, 1]}>
      <planeGeometry args={[1, 1, 48, 48]} />
      <shaderMaterial uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} />
    </mesh>
  );
}

function Particles({ color }: { color: string }): React.JSX.Element {
  const group = useRef<THREE.Group>(null);
  const positions = useMemo(
    () =>
      Array.from({ length: 48 }, () => [
        (Math.random() - 0.5) * 3.2,
        (Math.random() - 0.5) * 1.8,
        Math.random() * 0.9 - 0.2,
      ] as const),
    [],
  );

  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = state.clock.elapsedTime * 0.035;
    }
  });

  return (
    <group ref={group}>
      {positions.map((position, index) => (
        <mesh key={index} position={position}>
          <sphereGeometry args={[0.01, 6, 6]} />
          <meshBasicMaterial color={color} transparent opacity={0.55} />
        </mesh>
      ))}
    </group>
  );
}

export function WebGLHero({ src }: { src: string }): React.JSX.Element | null {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [supported, setSupported] = useState(true);
  const frameloop = useOffscreenFrameloop(root);
  const accent = useAccentCssColor();

  useEffect(() => {
    setSupported(canCreateWebGLContext());
  }, []);

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7412/ingest/e788776b-2e05-46ac-bbcf-f37efdc25738',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'db5f59'},body:JSON.stringify({sessionId:'db5f59',hypothesisId:'E',location:'webgl-hero.tsx:WebGLHero',message:'WebGLHero src',data:{src},timestamp:Date.now()})}).catch(()=>{});
    const probeImage = (crossOrigin: string | null) =>
      new Promise<{ ok: boolean; w?: number; h?: number }>((resolve) => {
        const img = new Image();
        if (crossOrigin) img.crossOrigin = crossOrigin;
        img.onload = () => resolve({ ok: true, w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve({ ok: false });
        img.src = src;
      });
    void (async () => {
      let fetchStatus: number | null = null;
      let contentType: string | null = null;
      let cors: string | null = null;
      try {
        const response = await fetch(src, { method: 'GET', mode: 'cors' });
        fetchStatus = response.status;
        contentType = response.headers.get('content-type');
        cors = response.headers.get('access-control-allow-origin');
      } catch (error) {
        fetchStatus = -1;
        contentType = error instanceof Error ? error.message : 'fetch-failed';
      }
      const [anon, noCors] = await Promise.all([probeImage('anonymous'), probeImage(null)]);
      fetch('http://127.0.0.1:7412/ingest/e788776b-2e05-46ac-bbcf-f37efdc25738',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'db5f59'},body:JSON.stringify({sessionId:'db5f59',hypothesisId:'A',location:'webgl-hero.tsx:probe',message:'texture src probe',data:{src, fetchStatus, contentType, cors, anon, noCors},timestamp:Date.now()})}).catch(()=>{});
    })();
    // #endregion
  }, [src]);

  if (!supported) {
    return null;
  }

  return (
    <div ref={setRoot} className="absolute inset-0">
      <Canvas
        dpr={[1, 1.5]}
        frameloop={frameloop}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, 1.55], fov: 42 }}
      >
        <Suspense fallback={null}>
          <DisplacementPlane src={src} />
          <Particles color={accent} />
        </Suspense>
      </Canvas>
    </div>
  );
}
