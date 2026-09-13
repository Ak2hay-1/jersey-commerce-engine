# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/jerzyfy/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Jerzyfy  
**Generated:** 2026-09-13  
**Category:** Sportswear ecommerce / editorial athletic  
**Scope:** Storefront frontend only (`apps/storefront`)

> Generator default (Liquid Glass + gold) was **rejected**. Jerzyfy uses **Exaggerated Minimalism × editorial lookbook** with charcoal + burgundy — not glassmorphism, not gold luxury SaaS.

---

## Global Rules

### Color Palette

| Role | Hex | CSS / theme |
|------|-----|-------------|
| Primary | `#111111` | `--primary` / theme.primaryColor |
| Secondary | `#5C5650` | `--secondary-foreground` |
| Accent / CTA | `#7A1F1F` | `--accent` (match-day burgundy) |
| Background | `#F7F6F4` | cool stone (avoid warm cream #F4F1EA bias) |
| Text | `#111111` | `--foreground` |
| Hero plane | `#0A0A0A` | full-bleed media underlay |

**Notes:** Single accent only. High contrast black/white dominant. No purple gradients, no gold CTAs, no glassmorphism chrome.

### Typography

- **Heading:** Instrument Serif (already local) — editorial, not Playfair
- **Body:** Inter (already local)
- **Mood:** athletic editorial, match-day identity, oversized statements
- **Scale:** use `clamp()` for hero/statement; uppercase tracking on kickers/CTAs only

### Motion (Motion / `motion/react`)

| Token | Value | Usage |
|-------|-------|-------|
| Ease | `[0.22, 1, 0.36, 1]` | `MOTION_EASE` in `components/motion/presence.ts` |
| Micro | 150–280ms | hover, pills, nav underline |
| Enter | 400–550ms | section reveals, hero copy |
| Hero media | ≤700ms | slide crossfade only |
| Budget | 2–3 intentional motions per viewport | never decorative infinite loops except marquees |

Always respect `prefers-reduced-motion` / `useReducedMotion()`.

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `--space-section` | `3rem` → `6rem` | section vertical rhythm |
| `--space-hero` | `min-h ~85dvh` | first viewport |
| Gutter | `store-gutter` | safe-area aware |

### Shadows

Prefer flat editorial surfaces. Soft header shadow only when scrolled. No multi-layer card stacks.

---

## Component Specs

### Buttons / pills

- Class: `.store-pill` — square corners, uppercase tracking
- Primary on light: filled foreground
- Primary on hero: white fill / dark text
- Accent sparingly for brand moments (not every button)
- Hover: 1px lift + color transition ≤280ms; `cursor-pointer`

### Cards

Default: **no cards**. Product tiles are image + type, not bordered boxes. Interaction containers only when needed (forms, drawers).

### Imagery

Full-bleed or edge-to-edge for hero and lookbook. Real jersey / pitch context. Subtle Ken Burns only when motion allowed.

---

## Style Guidelines

**Style:** Exaggerated Minimalism + editorial lookbook  

**Keywords:** oversized type, negative space, high contrast, full-bleed media, brand-first hero, athletic restraint  

**Key effects:** scroll reveals, magnetic CTA, staggered copy, ken-burns backdrop, film grain (subtle)

### Page pattern (storefront)

1. Full-bleed hero (brand + one headline + one line + one CTA)
2. Statement / editorial line
3. Catalog rails / collections
4. Trust or lookbook
5. Closing CTA + footer

---

## Anti-Patterns (Do NOT Use)

- ❌ Liquid glass / heavy backdrop blur chrome
- ❌ Gold luxury SaaS accents
- ❌ Purple-on-white / purple-indigo gradients
- ❌ Warm cream + terracotta AI default look
- ❌ Card grids in the hero
- ❌ Stat strips, pill clusters, floating badges on hero media
- ❌ Emojis as icons (use Lucide)
- ❌ Ignoring `prefers-reduced-motion`
- ❌ Multi-shop / tenant switcher UI

---

## Pre-Delivery Checklist

- [ ] Brand test: first viewport still reads as Jerzyfy without the nav
- [ ] Hero budget: brand, one headline, one sentence, one CTA group, one image
- [ ] `cursor-pointer` + hover on clickables
- [ ] Contrast ≥ 4.5:1
- [ ] Focus states visible
- [ ] Reduced motion respected
- [ ] Responsive: 375 / 768 / 1024 / 1440
- [ ] No horizontal scroll on mobile
