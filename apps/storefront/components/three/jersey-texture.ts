'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { JerseyDesign } from './jersey-design';

export type JerseySide = 'front' | 'back';

const SIZE = 1024;
const DISPLAY_FONT = '"Arial Black", "Helvetica Neue", Impact, sans-serif';
const NUMBER_FONT = 'Impact, "Arial Black", "Helvetica Neue", sans-serif';

/** Shirt outline in 1024px texture space; torso spans x 284..740 so the 3D bulge width must match. */
export const TORSO_HALF_WIDTH = (740 - 284) / 2 / SIZE * 2;

function silhouette(ctx: CanvasRenderingContext2D, side: JerseySide): void {
  const neckDip = side === 'front' ? 175 : 118;
  ctx.beginPath();
  ctx.moveTo(398, 92);
  ctx.quadraticCurveTo(512, neckDip, 626, 92);
  ctx.lineTo(764, 132);
  ctx.quadraticCurveTo(880, 196, 962, 332);
  ctx.lineTo(880, 478);
  ctx.lineTo(742, 402);
  ctx.quadraticCurveTo(728, 690, 742, 958);
  ctx.quadraticCurveTo(512, 990, 282, 958);
  ctx.quadraticCurveTo(296, 690, 282, 402);
  ctx.lineTo(144, 478);
  ctx.lineTo(62, 332);
  ctx.quadraticCurveTo(144, 196, 260, 132);
  ctx.closePath();
}

function drawPattern(ctx: CanvasRenderingContext2D, design: JerseyDesign): void {
  ctx.fillStyle = design.secondary;
  if (design.pattern === 'stripes') {
    for (let x = 300; x < 740; x += 110) {
      ctx.fillRect(x, 0, 52, SIZE);
    }
  } else if (design.pattern === 'hoops') {
    for (let y = 300; y < SIZE; y += 130) {
      ctx.fillRect(0, y, SIZE, 62);
    }
  } else if (design.pattern === 'sash') {
    ctx.save();
    ctx.translate(512, 560);
    ctx.rotate(-Math.PI / 4.2);
    ctx.fillRect(-900, -70, 1800, 140);
    ctx.restore();
  } else {
    const grad = ctx.createLinearGradient(0, 400, 0, SIZE);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, design.secondary);
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.globalAlpha = 1;
  }
}

function drawFabric(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  for (let i = -SIZE; i < SIZE * 2; i += 6) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + SIZE, SIZE);
    ctx.stroke();
  }
  ctx.restore();

  const side = ctx.createLinearGradient(282, 0, 742, 0);
  side.addColorStop(0, 'rgba(0,0,0,0.28)');
  side.addColorStop(0.18, 'rgba(0,0,0,0)');
  side.addColorStop(0.82, 'rgba(0,0,0,0)');
  side.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = side;
  ctx.fillRect(0, 0, SIZE, SIZE);
}

function drawTrim(ctx: CanvasRenderingContext2D, design: JerseyDesign, side: JerseySide): void {
  const neckDip = side === 'front' ? 175 : 118;
  ctx.strokeStyle = design.trim;
  ctx.lineCap = 'round';
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.moveTo(398, 96);
  ctx.quadraticCurveTo(512, neckDip, 626, 96);
  ctx.stroke();

  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(962, 332);
  ctx.lineTo(880, 478);
  ctx.moveTo(62, 332);
  ctx.lineTo(144, 478);
  ctx.stroke();

  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(742, 410);
  ctx.quadraticCurveTo(728, 690, 742, 950);
  ctx.moveTo(282, 410);
  ctx.quadraticCurveTo(296, 690, 282, 950);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function fitText(ctx: CanvasRenderingContext2D, text: string, font: string, start: number, maxWidth: number): void {
  let size = start;
  ctx.font = `${size}px ${font}`;
  while (size > 18 && ctx.measureText(text).width > maxWidth) {
    size -= 4;
    ctx.font = `${size}px ${font}`;
  }
}

function drawFront(ctx: CanvasRenderingContext2D, design: JerseyDesign): void {
  ctx.fillStyle = design.trim;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.beginPath();
  ctx.arc(628, 262, 42, 0, Math.PI * 2);
  ctx.lineWidth = 6;
  ctx.strokeStyle = design.trim;
  ctx.stroke();
  ctx.font = `52px ${DISPLAY_FONT}`;
  ctx.fillText(design.crest, 628, 266);

  ctx.font = `30px ${DISPLAY_FONT}`;
  ctx.globalAlpha = 0.9;
  ctx.fillText('J', 396, 262);
  ctx.globalAlpha = 1;

  fitText(ctx, 'JERZYFY', DISPLAY_FONT, 92, 400);
  ctx.fillText('JERZYFY', 512, 430);

  if (design.number.trim()) {
    ctx.font = `96px ${NUMBER_FONT}`;
    ctx.fillText(design.number.trim().slice(0, 2), 512, 590);
  }
}

function drawBack(ctx: CanvasRenderingContext2D, design: JerseyDesign): void {
  ctx.fillStyle = design.trim;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const name = design.name.trim().toUpperCase().slice(0, 12);
  if (name) {
    fitText(ctx, name, DISPLAY_FONT, 78, 380);
    ctx.fillText(name, 512, 270);
  }
  const number = design.number.trim().slice(0, 2);
  if (number) {
    ctx.font = `360px ${NUMBER_FONT}`;
    ctx.lineWidth = 10;
    ctx.strokeStyle = design.secondary;
    ctx.strokeText(number, 512, 560);
    ctx.fillText(number, 512, 560);
  }
}

export function drawJersey(canvas: HTMLCanvasElement, design: JerseyDesign, side: JerseySide): void {
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.save();
  silhouette(ctx, side);
  ctx.clip();
  ctx.fillStyle = design.primary;
  ctx.fillRect(0, 0, SIZE, SIZE);
  drawPattern(ctx, design);
  drawFabric(ctx);
  drawTrim(ctx, design, side);
  if (side === 'front') {
    drawFront(ctx, design);
  } else {
    drawBack(ctx, design);
  }
  ctx.restore();
}

/** Front/back canvas textures that redraw in place when the design changes. */
export function useJerseyTextures(design: JerseyDesign): { front: THREE.CanvasTexture; back: THREE.CanvasTexture } {
  const textures = useMemo(() => {
    const make = (side: JerseySide) => {
      const canvas = document.createElement('canvas');
      drawJersey(canvas, design, side);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      return texture;
    };
    return { front: make('front'), back: make('back') };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- textures are created once; the effect below redraws them
  }, []);

  useEffect(() => {
    drawJersey(textures.front.image as HTMLCanvasElement, design, 'front');
    drawJersey(textures.back.image as HTMLCanvasElement, design, 'back');
    textures.front.needsUpdate = true;
    textures.back.needsUpdate = true;
  }, [design, textures]);

  useEffect(
    () => () => {
      textures.front.dispose();
      textures.back.dispose();
    },
    [textures],
  );

  return textures;
}
