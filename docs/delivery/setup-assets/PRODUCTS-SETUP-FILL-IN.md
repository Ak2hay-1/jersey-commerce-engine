# Products setup fill-in

Use this sheet before go-live. Enter catalog in **Staff portal → Categories** first, then **Products**. Opening stock is a **separate** step after variants exist — see [go-live-runbook.md](../go-live-runbook.md) §5.

Prepare local files under `docs/delivery/setup-assets/products/<slug>/` as `front.png`, `side.png`, `back.png`, then **upload** them in ERP (Front / Side / Back). Files are stored on the API VM (`MEDIA_LOCAL_ROOT` / `/api/v1/media/...`), not as external URLs. Front is primary (sort 0). There is no front/side/back field in the DB — upload order matters.

Money: use major units with ≤2 decimals (e.g. `1499.00`). **Slug** and **SKU** are generated automatically (SKU from product name + size + colour). Do not type them in the form.

Copy this file per client if needed. Replace every `REPLACE`.

---

## 0. Before you start

- [ ] Tenant exists (bootstrapped, not seeded)
- [ ] Tax defaults agreed on tenant (`defaultTaxRate`, `taxInclusivePricing`)
- [ ] Size chart agreed (adult / kids)
- [ ] Cost vs selling prices agreed (cost stays internal)
- [ ] Physical count ready for opening stock (after catalog)

---

## 1. Categories

Create in **ERP → Categories** first. Product uses one `categoryId`. Slug is auto from name (keep names stable so homepage collection tiles stay aligned). Upload a category image in the form (optional).

| Name | Slug (auto) | Parent | Image (upload) | Sort | Status | Done |
| --- | --- | --- | --- | --- | --- | --- |
| Club kits | `club-kits` | — | `collection-tiles/tile-club-kits.png` | 1 | ACTIVE | [ ] |
| National | `national` | — | `collection-tiles/tile-national.png` | 2 | ACTIVE | [ ] |
| Kids | `kids` | — | `collection-tiles/tile-kids.png` | 3 | ACTIVE | [ ] |
| Custom / print base | `custom` | — | REPLACE or none | 4 | ACTIVE | [ ] |

Homepage “collections” tiles use these slugs in Website settings (see homepage fill-in) — keep category **names** (and thus auto-slugs) stable.

---

## 2. Standard size sets (tick what you use)

**Adult:** S · M · L · XL · XXL — or REPLACE  

**Kids:** 6 · 8 · 10 · 12 · 14 — or REPLACE  

**Colour default per product:** fill in each product card below.

---

## 3. Product cards

For each product: create product → add variants (cost + selling required; SKU auto) → upload Front/Side/Back images → set status ACTIVE → featured if needed → then §4 opening stock.

### 3.1 Midnight Club Home Jersey

| Field | Value |
| --- | --- |
| Name | Midnight Club Home Jersey |
| Slug | auto (`midnight-club-home-jersey`) |
| Category | Club kits |
| Brand | REPLACE |
| Short description | REPLACE (≤500) |
| Description | REPLACE |
| Status | ACTIVE |
| Featured | Y / N |
| Colour | Midnight / Navy — REPLACE |
| Images | `products/midnight-club-home-jersey/front.png` (primary), `side.png`, `back.png` |

| Size | SKU | Cost | Selling | Compare-at | Tax % (blank = tenant default) | Opening qty | Reorder | Done |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S | REPLACE | REPLACE | REPLACE | | | REPLACE | | [ ] |
| M | REPLACE | REPLACE | REPLACE | | | REPLACE | | [ ] |
| L | REPLACE | REPLACE | REPLACE | | | REPLACE | | [ ] |
| XL | REPLACE | REPLACE | REPLACE | | | REPLACE | | [ ] |
| XXL | REPLACE | REPLACE | REPLACE | | | REPLACE | | [ ] |

---

### 3.2 Crimson Away Stripe Jersey

| Field | Value |
| --- | --- |
| Name | Crimson Away Stripe Jersey |
| Slug | auto (`crimson-away-stripe-jersey`) |
| Category | Club kits |
| Brand | REPLACE |
| Short description | REPLACE |
| Description | REPLACE |
| Status | ACTIVE |
| Featured | Y / N |
| Colour | Crimson — REPLACE |
| Images | `products/crimson-away-stripe-jersey/front.png` (primary), `side.png`, `back.png` |

| Size | SKU | Cost | Selling | Compare-at | Tax % | Opening qty | Reorder | Done |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S | REPLACE | REPLACE | REPLACE | | | REPLACE | | [ ] |
| M | REPLACE | REPLACE | REPLACE | | | REPLACE | | [ ] |
| L | REPLACE | REPLACE | REPLACE | | | REPLACE | | [ ] |
| XL | REPLACE | REPLACE | REPLACE | | | REPLACE | | [ ] |
| XXL | REPLACE | REPLACE | REPLACE | | | REPLACE | | [ ] |

---

### 3.3 India Blue National Kit

| Field | Value |
| --- | --- |
| Name | India Blue National Kit |
| Slug | auto (`india-blue-national-kit`) |
| Category | National |
| Brand | REPLACE |
| Short description | REPLACE |
| Description | REPLACE |
| Status | ACTIVE |
| Featured | Y / N |
| Colour | India Blue — REPLACE |
| Images | `products/india-blue-national-kit/front.png` (primary), `side.png`, `back.png` |

| Size | SKU | Cost | Selling | Compare-at | Tax % | Opening qty | Reorder | Done |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S | REPLACE | REPLACE | REPLACE | | | REPLACE | | [ ] |
| M | REPLACE | REPLACE | REPLACE | | | REPLACE | | [ ] |
| L | REPLACE | REPLACE | REPLACE | | | REPLACE | | [ ] |
| XL | REPLACE | REPLACE | REPLACE | | | REPLACE | | [ ] |
| XXL | REPLACE | REPLACE | REPLACE | | | REPLACE | | [ ] |

---

### 3.4 Kids Pitch Training Jersey

| Field | Value |
| --- | --- |
| Name | Kids Pitch Training Jersey |
| Slug | auto (`kids-pitch-training-jersey`) |
| Category | Kids |
| Brand | REPLACE |
| Short description | REPLACE |
| Description | REPLACE |
| Status | ACTIVE |
| Featured | Y / N |
| Colour | REPLACE |
| Images | `products/kids-pitch-training-jersey/front.png` (primary), `side.png`, `back.png` |

| Size | SKU | Cost | Selling | Compare-at | Tax % | Opening qty | Reorder | Done |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 6 | REPLACE | REPLACE | REPLACE | | | REPLACE | | [ ] |
| 8 | REPLACE | REPLACE | REPLACE | | | REPLACE | | [ ] |
| 10 | REPLACE | REPLACE | REPLACE | | | REPLACE | | [ ] |
| 12 | REPLACE | REPLACE | REPLACE | | | REPLACE | | [ ] |
| 14 | REPLACE | REPLACE | REPLACE | | | REPLACE | | [ ] |

---

### 3.5 White Custom Print Base

| Field | Value |
| --- | --- |
| Name | White Custom Print Base |
| Slug | auto (`white-custom-print-base`) |
| Category | Custom / print base |
| Brand | REPLACE |
| Short description | REPLACE |
| Description | REPLACE (note custom/print terms if needed) |
| Status | ACTIVE |
| Featured | Y / N |
| Colour | White |
| Images | `products/white-custom-print-base/front.png` (primary), `side.png`, `back.png` |

| Size | SKU | Cost | Selling | Compare-at | Tax % | Opening qty | Reorder | Done |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S | REPLACE | REPLACE | REPLACE | | | REPLACE | | [ ] |
| M | REPLACE | REPLACE | REPLACE | | | REPLACE | | [ ] |
| L | REPLACE | REPLACE | REPLACE | | | REPLACE | | [ ] |
| XL | REPLACE | REPLACE | REPLACE | | | REPLACE | | [ ] |
| XXL | REPLACE | REPLACE | REPLACE | | | REPLACE | | [ ] |

---

### 3.6 Extra products (copy block)

| Field | Value |
| --- | --- |
| Name | REPLACE |
| Slug | auto |
| Category | REPLACE |
| Brand | REPLACE |
| Short description | REPLACE |
| Description | REPLACE |
| Status | DRAFT / ACTIVE |
| Featured | Y / N |
| Colour | REPLACE |
| Images | REPLACE (front primary, then side/back) |

| Size | SKU | Cost | Selling | Compare-at | Tax % | Opening qty | Reorder | Done |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| REPLACE | REPLACE | REPLACE | REPLACE | | | REPLACE | | [ ] |

---

## 4. Opening stock (after catalog)

Variants start at **0**. For each size row above, in Admin product → set stock / opening stock:

- Quantity ≥ 1 (physical count)
- Reason required (e.g. `Opening stock go-live YYYY-MM-DD`)
- Optional reorder level

- [ ] All ACTIVE variants have opening qty entered
- [ ] Spot-check: one SKU matches shelf count
- [ ] Cost on opening movement matches agreed cost

---

## 5. Storefront wiring (after products live)

In **Admin → Website** (homepage sections):

- [ ] Featured / new-arrivals product slugs match §3 slugs
- [ ] Featured category slugs match §1
- [ ] No DRAFT products linked on homepage

Homepage asset checklist: [HOMEPAGE-SETUP-FILL-IN.md](./HOMEPAGE-SETUP-FILL-IN.md).

---

## 6. Sign-off

| Role | Name | Date |
| --- | --- | --- |
| Catalog owner (client) | REPLACE | REPLACE |
| Entered by (Rkyves) | REPLACE | REPLACE |

Prices and stock are client-owned data. Do not invent costs for live finance.
