'use client';

import Link from 'next/link';
import { useMemo, useRef } from 'react';
import { motion, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from 'motion/react';
import { Magnetic } from '../motion/magnetic';
import { JerseyStage } from '../three/jersey-stage-lazy';
import { DEFAULT_JERSEY_DESIGN, type JerseyDesign } from '../three/jersey-design';

const PANELS = [
  {
    kicker: '01 / Fabric',
    title: 'Engineered for ninety minutes',
    body: 'Breathable, lightweight knit with stretch where you move and structure where you need it.',
  },
  {
    kicker: '02 / Personalise',
    title: 'Your name. Your number.',
    body: 'Match-grade lettering pressed on the back, so every kit tells your story.',
  },
  {
    kicker: '03 / Matchday',
    title: 'From the stands to the street',
    body: 'Club, national, kids, and custom kits, cut for match day and every day after.',
  },
] as const;

function Panel({
  index,
  progress,
  panel,
}: {
  index: number;
  progress: MotionValue<number>;
  panel: (typeof PANELS)[number];
}): React.JSX.Element {
  const slice = 1 / PANELS.length;
  const start = index * slice;
  const end = start + slice;
  const fadeIn = index === 0 ? [0, 0] : [start - 0.04, start + 0.06];
  const fadeOut = index === PANELS.length - 1 ? [1, 1] : [end - 0.06, end + 0.02];
  const opacity = useTransform(progress, [...fadeIn, ...fadeOut], [index === 0 ? 1 : 0, 1, 1, index === PANELS.length - 1 ? 1 : 0]);
  const y = useTransform(progress, [fadeIn[0] ?? 0, fadeIn[1] ?? 0, fadeOut[0] ?? 1, fadeOut[1] ?? 1], [40, 0, 0, -40]);

  return (
    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2">
      <motion.div style={{ opacity, y }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[hsl(var(--accent))]">{panel.kicker}</p>
        <h3 className="mt-4 font-heading text-[clamp(2rem,4.5vw,3.75rem)] uppercase leading-[0.95] text-white">{panel.title}</h3>
        <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/65 md:text-base">{panel.body}</p>
      </motion.div>
    </div>
  );
}

export function JerseyShowcase({ brand = 'Jerzyfy' }: { brand?: string }): React.JSX.Element {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.4 });
  const rotation = useTransform(progress, [0, 1], [0, Math.PI * 2]);
  const wordX = useTransform(progress, [0, 1], ['8%', '-38%']);
  const ringScale = useTransform(progress, [0, 0.5, 1], [0.85, 1.1, 0.95]);
  const barScale = useTransform(progress, [0, 1], [0, 1]);

  const design = useMemo<JerseyDesign>(
    () => ({ ...DEFAULT_JERSEY_DESIGN, crest: (brand.trim()[0] ?? 'J').toUpperCase(), name: 'YOUR NAME', number: '10' }),
    [brand],
  );

  if (reduced) {
    return (
      <section className="home-showcase bg-[#0b0b0d] text-white" aria-label="Jersey showcase">
        <div className="mx-auto grid max-w-store gap-10 store-gutter py-[var(--space-section)] lg:grid-cols-2 lg:items-center">
          <JerseyStage className="aspect-square w-full" design={design} variant="scroll" />
          <div className="space-y-10">
            {PANELS.map((panel) => (
              <div key={panel.kicker}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[hsl(var(--accent))]">{panel.kicker}</p>
                <h3 className="mt-3 font-heading text-3xl uppercase">{panel.title}</h3>
                <p className="mt-3 text-sm text-white/65">{panel.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} className="home-showcase relative h-[320vh] bg-[#0b0b0d] text-white" aria-label="Jersey showcase">
      <div className="sticky top-0 flex h-[100dvh] items-center overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2" aria-hidden>
          <motion.p
            className="whitespace-nowrap font-heading text-[28vw] uppercase leading-none text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.08)]"
            style={{ x: wordX }}
          >
            Matchday · {brand}
          </motion.p>
        </div>

        <div className="relative mx-auto grid w-full max-w-store items-center gap-6 store-gutter lg:grid-cols-[1fr_1.2fr]">
          <div className="relative order-2 h-[16rem] lg:order-1 lg:h-[24rem]">
            {PANELS.map((panel, index) => (
              <Panel key={panel.kicker} index={index} progress={progress} panel={panel} />
            ))}
          </div>

          <div className="relative order-1 lg:order-2">
            <motion.div
              className="pointer-events-none absolute inset-[8%] rounded-full border border-white/10"
              style={{ scale: ringScale }}
              aria-hidden
            />
            <motion.div
              className="pointer-events-none absolute inset-[18%] rounded-full bg-[radial-gradient(circle,hsl(var(--accent)/0.35)_0%,transparent_70%)] blur-2xl"
              style={{ scale: ringScale }}
              aria-hidden
            />
            <JerseyStage
              className="mx-auto aspect-square w-full max-w-[38rem]"
              design={design}
              variant="scroll"
              scrollRotation={rotation}
            />
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-8 mx-auto flex max-w-store items-center justify-between gap-6 store-gutter">
          <div className="h-px flex-1 bg-white/10">
            <motion.div className="h-px origin-left bg-[hsl(var(--accent))]" style={{ scaleX: barScale }} />
          </div>
          <Magnetic className="inline-block">
            <Link href="/products" className="store-pill-accent cursor-pointer px-6 py-2.5 text-sm">
              Shop kits
            </Link>
          </Magnetic>
        </div>
      </div>
    </section>
  );
}
