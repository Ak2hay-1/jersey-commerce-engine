# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/jerzyfy/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Jerzyfy  
**Category:** Sportswear ecommerce / Velocity match-day  
**Scope:** Storefront frontend (`apps/storefront`)

> Direction: **Dark match-day bookends** with optional **light Velocity mid-bands** on the homepage. Near-black canvas, burgundy accent, floodlit kit hero. Not liquid-glass SaaS, not gold luxury, not warm cream storewide.

---

## Global Rules

### Color Palette

| Role | Hex | Notes |
|------|-----|-------|
| Background | `#0A0A0A` | Pitch black (site-wide CSS vars) |
| Foreground / primary UI | `#F5F5F4` | Floodlight white |
| Secondary | `#A8A29E` | Warm stone on dark |
| Accent / CTA | `#7A1F1F` | Match-day burgundy |
| Hero plane | `#080808` | Underlay |
| Light band | `#F4F6F5` | Homepage mid-sections only (`.home-light-band`) |

Single-tenant storefront **locks** dark colors in `lib/jerzyfy-brand.ts`. Light homepage bands use **section-scoped** tokens — never unlock the CMS theme to light globally.

### Typography

- **Heading:** Instrument Serif (brand / editorial)
- **Body:** Inter
- **Velocity display:** heavy italic uppercase sans for hero slogans and marquee

### Motion

| Token | Usage |
|-------|-------|
| Ease | `[0.22, 1, 0.36, 1]` |
| Micro | 150–280ms |
| Hero media | ≤700ms |
| Budget | 2–3 intentional motions per viewport |

Respect `prefers-reduced-motion`.

### Anti-patterns

- Light stone / cream as the **global** shop background
- White primary CTA on dark hero (use burgundy)
- Coverflow gadget carousel for kits
- Purple gradients, gold luxury
- Glassmorphism on product chrome (glass **header pill only**)
