# Catalog & cart — motion overrides

Extends `design-system/jerzyfy/MASTER.md`.

## Product tiles

- Image-led, no card chrome
- Hover: soft lift (`HoverLift`) + image scale via Motion (`motion/react`)
- Size picker: `AnimatePresence` slide-up
- Keep shimmer/title underline CSS for polish; respect reduced motion

## Cart drawer

- Spring panel (`MOTION_DRAWER`) + fade scrim
- Line items stagger on open; `layout` for remove
- Footer (subtotal/CTAs) fades in after items
- Header badge uses `SlidingNumber` (Motion Primitives–inspired)

## Stack

- Import from `motion/react` only (do not add `framer-motion`)
- Primitives live in `apps/storefront/components/motion/`
