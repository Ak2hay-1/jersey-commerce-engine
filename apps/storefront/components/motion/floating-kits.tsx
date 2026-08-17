'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { useRouter } from 'next/navigation';
import { useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import * as THREE from 'three';
import type { StorefrontProductListItem } from '@jersey-commerce/types';
import { useOffscreenFrameloop } from './webgl-utils';
import { WebGLBoundary } from './webgl-boundary';

function KitPlane({
  url,
  index,
  total,
  slug,
}: {
  url: string;
  index: number;
  total: number;
  slug: string;
}): React.JSX.Element {
  const texture = useTexture(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = useRef<THREE.Mesh>(null);
  const router = useRouter();
  const spread = 1.15;

  useFrame((state) => {
    if (!mesh.current) {
      return;
    }
    const t = state.clock.elapsedTime * 0.25 + (index / total) * Math.PI * 2;
    mesh.current.position.x = Math.sin(t) * spread;
    mesh.current.position.z = Math.cos(t) * 0.55;
    mesh.current.position.y = Math.sin(t * 1.4 + index) * 0.08;
    mesh.current.rotation.y = -t + Math.PI / 2;
    mesh.current.rotation.x = state.pointer.y * 0.08;
  });

  return (
    <mesh
      ref={mesh}
      onClick={(event) => {
        event.stopPropagation();
        router.push(`/products/${slug}`);
      }}
    >
      <planeGeometry args={[0.72, 0.96]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function KitsScene({ products }: { products: StorefrontProductListItem[] }): React.JSX.Element {
  const items = useMemo(
    () => products.filter((item) => item.primaryImage?.url).slice(0, 6),
    [products],
  );

  return (
    <>
      {items.map((product, index) => (
        <KitPlane
          key={product.id}
          url={product.primaryImage!.url}
          index={index}
          total={items.length}
          slug={product.slug}
        />
      ))}
    </>
  );
}

export function FloatingKits({ products }: { products: StorefrontProductListItem[] }): React.JSX.Element | null {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const frameloop = useOffscreenFrameloop(root);
  const textured = products.filter((item) => item.primaryImage?.url);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (reduced || textured.length < 3) {
    return null;
  }

  if (!mounted) {
    return <div className="h-[28rem] bg-muted md:h-[34rem]" />;
  }

  return (
    <WebGLBoundary fallback={null}>
      <div ref={setRoot} className="h-[28rem] w-full md:h-[34rem]">
        <Canvas dpr={[1, 1.5]} frameloop={frameloop} camera={{ position: [0, 0, 3.2], fov: 40 }}>
          <Suspense fallback={null}>
            <KitsScene products={textured} />
          </Suspense>
        </Canvas>
      </div>
    </WebGLBoundary>
  );
}
