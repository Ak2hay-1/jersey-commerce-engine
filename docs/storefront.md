# Premium storefront engine

Phase 10 of the Jersey Commerce Engine (Jerzyfy). One Next.js app (`apps/storefront`) serves the single Jerzyfy shop. Shop name, colors, logos, catalog, and homepage sections come from the API / Website Settings.

This phase includes the staff **Storefront → Customize** screen (live iframe preview + editors), homepage/footer/chrome CMS, and promo codes. Live payment capture, reviews, and wishlists belong to later phases.

## Architecture

```text
Pinned shop slug (NEXT_PUBLIC_DEFAULT_TENANT_SLUG)
        │
        ▼
Next.js middleware → X-Tenant-Slug
        │
        ▼
GET /api/v1/store/bootstrap   branding, navigation, homepage sections
GET /api/v1/store/products    published catalog (server-side filters)
POST /api/v1/store/cart       guest cart (opaque token, never raw id)
POST /api/v1/store/checkout   PENDING order + stock reservation
```

The storefront never sends `tenantId`. Prices, tax, discounts, and stock are never trusted from the client. Checkout re-quotes from live catalog data. Bootstrap includes public `auth` flags (password, email OTP, SMS OTP, Google) so the login page only shows enabled methods.

## Shop resolution

With `NEXT_PUBLIC_SINGLE_TENANT=true` (default), the storefront always uses `NEXT_PUBLIC_DEFAULT_TENANT_SLUG` (local default: `demo-jersey-store`). Host and `?tenant=` switching are disabled.

Open http://localhost:3000 for the Jerzyfy shop.

## Theme

`StoreBootstrap.theme` maps to CSS variables (`--primary`, `--accent`, `--background`, fonts, logo, favicon). Brand tokens can also be refined in code for Jerzyfy; CMS branding remains available. Defaults are sportswear tokens.

Homepage sections are stored on `WebsiteSettings.homepageConfig.sections`. Footer copy is stored on `WebsiteSettings.footerConfig`. Announcement messages and header nav live in `WebsiteSettings.chromeConfig`. Theme colors, logo, SEO, and contact fields are columns on `WebsiteSettings`. Disabled sections are omitted. Missing config falls back to defaults.

Edit everything from **Staff portal → Storefront → Customize** (`/website`): branding, theme, SEO/contact, announcement bar, header nav, hero slides (1920×720, 8:3), homepage section toggles and product picks, collection tiles (1080×1350, 4:5), footer/socials, and about copy. The right pane loads the live storefront in an iframe (`?customizer=1`) and applies unsaved drafts via `postMessage` (`jce:storefront-draft`). Save still uses `PATCH /api/v1/website/settings`.

Staff builds need `NEXT_PUBLIC_STOREFRONT_URL` (e.g. `https://www.jerzyfy.in`) so the preview iframe and “Open live site” point at the correct origin; it is baked into `runtime-config.js` as `storefrontUrl`.

Promo codes are generated under Admin → Promo codes and applied on cart/checkout (`POST/DELETE /api/v1/store/cart/promo`).

## Routes

| Path | Purpose |
| --- | --- |
| `/` | Configurable homepage |
| `/products` | Catalog with search, filters, sort, pagination |
| `/products/[slug]` | Product detail, variants, gallery, add to cart |
| `/category/[...slug]` | Nested category pages |
| `/cart` | Full cart |
| `/checkout` | Contact, fulfillment, address, place order |
| `/order/success/[orderNumber]` | Confirmation |
| `/account` | Customer home |
| `/account/orders` | Order history |
| `/account/orders/[id]` | Order detail |
| `/account/profile` | Profile |
| `/auth/login` | Customer login (password, OTP, and/or Google) |
| `/auth/register` | Customer registration (when password login is on) |
| `/auth/google/complete` | Finishes Google Sign-In |
| `/custom-orders` | Custom/team jersey enquiry (Phase 11) |
| `/custom-orders/[publicId]` | Quote accept / design approval |

## Public store APIs

| Method | Path |
| --- | --- |
| GET | `/api/v1/store/resolve` |
| GET | `/api/v1/store/bootstrap` |
| GET | `/api/v1/store/products` |
| GET | `/api/v1/store/products/:slug` |
| GET | `/api/v1/store/categories` |
| GET | `/api/v1/store/categories/:slug` |
| GET | `/api/v1/store/search` |
| GET | `/api/v1/store/collections/featured` |
| GET | `/api/v1/store/collections/new` |
| GET | `/api/v1/store/collections/best-sellers` |
| POST/DELETE | `/api/v1/store/cart/promo` |
| POST/GET/PATCH/DELETE | `/api/v1/store/cart` |
| POST | `/api/v1/store/checkout/quote` |
| POST | `/api/v1/store/checkout` |
| POST | `/api/v1/store/auth/register` |
| POST | `/api/v1/store/auth/login` |
| POST | `/api/v1/store/auth/otp/request` |
| POST | `/api/v1/store/auth/otp/verify` |
| GET | `/api/v1/store/auth/google/start` |
| GET | `/api/v1/store/auth/google/callback` |
| POST | `/api/v1/store/auth/google/exchange` |
| GET/PATCH | `/api/v1/store/account/*` |
| GET/POST | `/api/v1/store/orders` |

Staff catalog and POS APIs are not used by this app.

## SEO and performance

- Next.js metadata APIs for title, description, canonical, Open Graph
- JSON-LD for Organization, Product, and BreadcrumbList (no fabricated ratings)
- Homepage/catalog bootstrap may be revalidated; cart, checkout, and account are `no-store`
- Product detail, search, and best-sellers use short revalidate (30–60s)
- SSR prefers `API_INTERNAL_URL` (Docker `http://api:4000`) over the public API URL
- Layout/page/metadata share bootstrap and product fetches via `React.cache` per request
- Images use Next.js `Image` with remote allowlists; placeholders are development-only
- Mobile-first layout, sticky header, skip link, labelled controls

## Components

Reusable pieces live under `apps/storefront/components/`: header, footer, mobile menu, search, product card/grid/gallery, variant selector, cart drawer, checkout forms, account forms, homepage sections, empty/loading states.

## Testing

- Storefront unit/component tests: `npm run test -w @jersey-commerce/storefront`
- API e2e: `apps/api/test/phase10.e2e-spec.ts` (tenant resolve, branding, catalog isolation, cart, checkout)
