# Premium storefront engine

Phase 10 of the Jersey Commerce Engine. One Next.js app (`apps/storefront`) renders every tenant. Shop names, colors, logos, catalog, and homepage sections come from the API. There is no per-tenant frontend codebase.

This phase includes homepage and footer CMS editing plus promo codes in the admin Website screen. Live payment capture, reviews, and wishlists belong to later phases.

## Architecture

```text
Host / ?tenant=slug / cookie
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

## Tenant resolution

Order of resolution:

1. `?tenant=slug` (local development; written to a cookie and stripped from the URL)
2. Configured custom domain (`TenantHost`)
3. `{slug}.{PLATFORM_DOMAIN}` or `{slug}.localhost`
4. `NEXT_PUBLIC_DEFAULT_TENANT_SLUG` (local default: `demo-jersey-store`)

Open http://localhost:3000/?tenant=demo-jersey-store to pin the demo shop.

## Theme

`StoreBootstrap.theme` maps to CSS variables (`--primary`, `--accent`, `--background`, fonts, logo, favicon). Changing tenant branding does not require a code change. Defaults are generic sportswear tokens, not a specific shop.

Homepage sections are stored on `WebsiteSettings.homepageConfig.sections`. Footer copy is stored on `WebsiteSettings.footerConfig`. Disabled sections are omitted. Missing config falls back to a default section list. Edit the homepage and footer from Admin → Website: sliding hero banners (1920×720, 8:3), brand line, latest drop products, featured products, premium collection tiles (1080×1350, 4:5), and footer text. Promo codes are generated under Admin → Promo codes and applied on cart/checkout (`POST/DELETE /api/v1/store/cart/promo`).

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
