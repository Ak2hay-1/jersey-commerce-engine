# PDP & checkout — motion overrides

Extends `design-system/jerzyfy/MASTER.md`.

## Product detail (PDP)

- Gallery: directional crossfade on image change; shared `layoutId` thumb ring; spring zoom lightbox
- Buy CTA: label morph (`Select` → `Add` → `Added`); sticky mobile bar slides up
- Accordions: height + opacity presence (no layout jump chaos)
- Keep purchase path fast — motion ≤ ~420ms

## Checkout

- Step underline via `layoutId="checkout-step-underline"`
- Soft `whileInView` on sections (once)
- Delivery ↔ pickup swap with `AnimatePresence` (do not delay submit)
- No celebratory loops; confirmation page can stay simple

## Stack

- `motion/react` only
- Always honor `useReducedMotion`
