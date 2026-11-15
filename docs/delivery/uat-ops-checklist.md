# UAT / go-live ops checklist (post bugfix)

Complete these Admin and server steps alongside the code deploy. Code alone cannot finish checkout or compliance if credentials and contact data are empty.

## Payments (Critical)

1. Admin → **Settings → Payments**
   - Enable Razorpay
   - Save **Key ID** and **Key secret**
2. Confirm API env has `SECRETS_ENCRYPTION_KEY` (or `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` fallback).
3. Smoke-check storefront bootstrap: `payments.razorpay` must be `true` (and `razorpayKeyId` present).
4. Optional COD: Admin → **Settings → Shipping** → enable Delhivery, Offer COD, save API token.

## Contact / compliance

1. Admin → **Website** (SEO / contact panel)
   - Contact email, phone, address
   - WhatsApp + Instagram / other social URLs
   - Grievance officer name + email
2. Confirm storefront `/contact`, footer Contact, and `/grievance` show the same details.
3. If CMS fields are empty, set `NEXT_PUBLIC_GRIEVANCE_OFFICER_NAME` / `NEXT_PUBLIC_GRIEVANCE_OFFICER_EMAIL` on the storefront deploy as fallback.

## Homepage catalog

1. Mark **Barcelona Home**, **Barcelona Away**, and **Madrid Home** as **Featured** (or set their slugs on the homepage featured-products section).
2. Set the hero / statement CMS heading to something like **Football Jerseys 2026/27** (product name is no longer the main H1).

## Auth email (forgot password)

1. Admin → Authentication: keep Resend or SMTP configured (same path used for email OTP).
2. Set `NEXT_PUBLIC_STOREFRONT_URL=https://www.jerzyfy.in` on the API (or ensure CORS origins include the storefront) so reset links are absolute.
3. Staff password recovery remains: Owner → Users → temporary password (see Admin login → Forgot password help page).

## Images

1. New uploads are compressed to WebP automatically.
2. Recompress existing media on the API host when ready:
   ```bash
   cd apps/api
   npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/recompress-media.ts /path/to/uploads
   ```
3. After filename changes (`.jpg` → `.webp`), update `product_images` / category / website URLs, then remove `*.bak` files.

## Certificate

1. On `api.jerzyfy.in`, confirm Let's Encrypt / certbot auto-renew is enabled (expires 19 Jan 2027 on the prior check).
2. `sudo certbot renew --dry-run` (or your host's equivalent) after deploy.

## After deploy smoke

- [ ] Checkout button enables with Razorpay and places a test order (or test-mode charge)
- [ ] Direct `/checkout` keeps cart items
- [ ] Search `barca` returns Barcelona kits; Enter opens `/products?search=…`
- [ ] `/contact`, footer, grievance officer populated
- [ ] Forgot password email arrives and reset works
- [ ] Wishlist + size chart + share on PDP
- [ ] Share preview / OG image loads a compressed absolute URL
- [ ] Admin `/robots.txt` disallows all; API `/` and `/health` no longer expose version/uptime
