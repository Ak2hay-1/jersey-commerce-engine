'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { JerseyDesign } from './jersey-design';
import { TORSO_HALF_WIDTH, useJerseyTextures } from './jersey-texture';

const SEGMENTS = 96;
const CHEST_DEPTH = 0.2;
const SEAM_GAP = 0.006;

function torsoDepth(x: number, y: number): number {
  const ratio = Math.abs(x) / TORSO_HALF_WIDTH;
  const across = ratio < 1 ? Math.sqrt(1 - ratio * ratio) : 0;
  // Flatten toward the shoulders and hem so front/back panels meet like a real garment.
  const shoulder = THREE.MathUtils.smoothstep(0.92 - y, 0, 0.45);
  const hem = 0.75 + 0.25 * THREE.MathUtils.smoothstep(y + 0.95, 0, 0.4);
  return SEAM_GAP + CHEST_DEPTH * across * (0.35 + 0.65 * shoulder) * hem;
}

/**
 * Code-built jersey: one subdivided panel shaped into a chest curve, mirrored for the back,
 * with a canvas-drawn kit texture whose alpha cuts out the shirt silhouette.
 */
export function ProceduralJersey({
  design,
  cloth = 1,
}: {
  design: JerseyDesign;
  cloth?: number;
}): React.JSX.Element {
  const { front, back } = useJerseyTextures(design);

  const geometry = useMemo(() => {
    const plane = new THREE.PlaneGeometry(2, 2, SEGMENTS, SEGMENTS);
    const position = plane.attributes.position as THREE.BufferAttribute;
    const base = new Float32Array(position.count * 2);
    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index);
      const y = position.getY(index);
      base[index * 2] = x;
      base[index * 2 + 1] = y;
      position.setZ(index, torsoDepth(x, y));
    }
    plane.userData.base = base;
    plane.computeVertexNormals();
    return plane;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const materials = useMemo(() => {
    const make = (map: THREE.Texture) =>
      new THREE.MeshPhysicalMaterial({
        map,
        alphaTest: 0.5,
        transparent: false,
        side: THREE.DoubleSide,
        roughness: 0.78,
        metalness: 0,
        sheen: 0.7,
        sheenRoughness: 0.45,
        sheenColor: new THREE.Color('#ffffff'),
      });
    return { front: make(front), back: make(back) };
  }, [front, back]);

  useEffect(
    () => () => {
      materials.front.dispose();
      materials.back.dispose();
    },
    [materials],
  );

  useFrame((state) => {
    if (cloth <= 0) {
      return;
    }
    const t = state.clock.elapsedTime;
    const position = geometry.attributes.position as THREE.BufferAttribute;
    const base = geometry.userData.base as Float32Array;
    for (let index = 0; index < position.count; index += 1) {
      const x = base[index * 2] ?? 0;
      const y = base[index * 2 + 1] ?? 0;
      const sway = 1 - THREE.MathUtils.clamp((y + 1) / 2, 0, 1);
      const ripple =
        Math.sin(x * 5.2 + t * 1.7) * 0.012 * sway +
        Math.sin(y * 7 - t * 1.25 + x * 2) * 0.008 +
        Math.sin((x + y) * 11 + t * 2.4) * 0.003;
      position.setZ(index, torsoDepth(x, y) + ripple * cloth);
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  return (
    <group>
      <mesh geometry={geometry} material={materials.front} castShadow />
      <mesh geometry={geometry} material={materials.back} rotation={[0, Math.PI, 0]} castShadow />
    </group>
  );
}
