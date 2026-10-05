'use client';

import { createPortal } from '@react-three/fiber';
import { Decal, useGLTF } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { JerseyDesign } from './jersey-design';

export const JERSEY_MODEL_URL = '/models/jersey.glb';

let availability: Promise<boolean> | null = null;

/** One HEAD probe per page load; the storefront falls back to the code-built jersey when the model is absent. */
export function probeJerseyModel(): Promise<boolean> {
  if (!availability) {
    availability = fetch(JERSEY_MODEL_URL, { method: 'HEAD' })
      .then((response) => response.ok && !response.headers.get('content-type')?.includes('text/html'))
      .catch(() => false);
  }
  return availability;
}

function makeDecalTexture(draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    draw(ctx);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function GlbJersey({ design }: { design: JerseyDesign }): React.JSX.Element {
  const gltf = useGLTF(JERSEY_MODEL_URL);

  const { scene, target, box, scale } = useMemo(() => {
    const cloned = gltf.scene.clone(true);
    let largest: THREE.Mesh | null = null;
    let largestCount = 0;
    cloned.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) {
        return;
      }
      mesh.castShadow = true;
      mesh.material = new THREE.MeshPhysicalMaterial({
        color: design.primary,
        roughness: 0.78,
        sheen: 0.7,
        sheenRoughness: 0.45,
        sheenColor: new THREE.Color('#ffffff'),
        side: THREE.DoubleSide,
      });
      const count = mesh.geometry.attributes.position?.count ?? 0;
      if (count > largestCount) {
        largestCount = count;
        largest = mesh;
      }
    });
    const bounds = new THREE.Box3().setFromObject(cloned);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    cloned.position.sub(center);
    const mesh = largest as THREE.Mesh | null;
    mesh?.geometry.computeBoundingBox();
    return {
      scene: cloned,
      target: mesh,
      box: mesh?.geometry.boundingBox ?? null,
      scale: 2 / Math.max(size.y, 0.0001),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recolouring is handled below without re-cloning
  }, [gltf.scene]);

  useEffect(() => {
    scene.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh && mesh.material instanceof THREE.MeshPhysicalMaterial) {
        mesh.material.color.set(design.primary);
      }
    });
  }, [scene, design.primary]);

  const decals = useMemo(() => {
    const back = makeDecalTexture((ctx) => {
      ctx.fillStyle = design.trim;
      ctx.font = '64px "Arial Black", Impact, sans-serif';
      ctx.fillText(design.name.trim().toUpperCase().slice(0, 12), 256, 90);
      ctx.font = '300px Impact, "Arial Black", sans-serif';
      ctx.fillText(design.number.trim().slice(0, 2), 256, 300);
    });
    const front = makeDecalTexture((ctx) => {
      ctx.fillStyle = design.trim;
      ctx.font = '96px "Arial Black", Impact, sans-serif';
      ctx.fillText('JERZYFY', 256, 256);
    });
    return { back, front };
  }, [design.name, design.number, design.trim]);

  useEffect(
    () => () => {
      decals.back.dispose();
      decals.front.dispose();
    },
    [decals],
  );

  const decalProps = box
    ? {
        x: (box.min.x + box.max.x) / 2,
        width: box.max.x - box.min.x,
        height: box.max.y - box.min.y,
        depth: box.max.z - box.min.z,
      }
    : null;

  return (
    <group scale={scale}>
      <primitive object={scene} />
      {target && box && decalProps
        ? createPortal(
            <>
              <Decal
                depthTest
                position={[decalProps.x, box.min.y + decalProps.height * 0.62, box.min.z]}
                rotation={[0, Math.PI, 0]}
                scale={[decalProps.width * 0.5, decalProps.height * 0.5, decalProps.depth]}
                map={decals.back}
              />
              <Decal
                depthTest
                position={[decalProps.x, box.min.y + decalProps.height * 0.7, box.max.z]}
                rotation={[0, 0, 0]}
                scale={[decalProps.width * 0.45, decalProps.height * 0.45, decalProps.depth]}
                map={decals.front}
              />
            </>,
            target,
          )
        : null}
    </group>
  );
}
