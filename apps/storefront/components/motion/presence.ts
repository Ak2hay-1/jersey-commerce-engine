export const MOTION_DURATION = 0.28;

/** Hero media crossfade — keep ≤700ms per design system. */
export const MOTION_HERO = 0.65;

export const MOTION_EASE = [0.22, 1, 0.36, 1] as const;

export const MOTION_TRANSITION = {
  duration: MOTION_DURATION,
  ease: MOTION_EASE,
} as const;

/** Drawer / panel slide — slightly springy without overshoot chaos. */
export const MOTION_DRAWER = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 36,
  mass: 0.85,
};
