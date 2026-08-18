export const MOTION_DURATION = 0.28;

export const MOTION_EASE = [0.22, 1, 0.36, 1] as const;

export const MOTION_TRANSITION = {
  duration: MOTION_DURATION,
  ease: MOTION_EASE,
} as const;
