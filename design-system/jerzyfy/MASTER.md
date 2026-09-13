# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/jerzyfy/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Jerzyfy  
**Category:** Sportswear ecommerce / dark match-day  
**Scope:** Storefront frontend (`apps/storefront`)

> Direction: **Dark match-day** — near-black canvas, burgundy accent, floodlit kit hero. Not liquid glass, not gold SaaS, not warm cream.

---

## Global Rules

### Color Palette

| Role | Hex | Notes |
|------|-----|-------|
| Background | `#0A0A0A` | Pitch black |
| Foreground / primary UI | `#F5F5F4` | Floodlight white |
| Secondary | `#A8A29E` | Warm stone on dark |
| Accent / CTA | `#7A1F1F` | Match-day burgundy |
| Hero plane | `#080808` | Underlay |

Single-tenant storefront **locks** these colors in `lib/jerzyfy-brand.ts` so stale CMS light themes cannot wash out the homepage.

### Typography

- **Heading:** Instrument Serif
- **Body:** Inter
- **Mood:** floodlit athletic editorial, oversized statements

### Motion

| Token | Usage |
|-------|-------|
| Ease | `[0.22, 1, 0.36, 1]` |
| Micro | 150–280ms |
| Hero media | ≤700ms |
| Budget | 2–3 intentional motions per viewport |

Respect `prefers-reduced-motion`.

### Anti-patterns

- Light stone / cream homepage backgrounds
- White primary CTA on dark hero (use burgundy)
- Coverflow gadget carousel for kits
- Purple gradients, gold luxury, glassmorphism chrome
