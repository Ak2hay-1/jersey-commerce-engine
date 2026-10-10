# Authentication, RBAC, and tenant isolation

Phase 2 of the Jersey Commerce Engine. POS write APIs are documented in [pos.md](pos.md).

## Authentication architecture

- Email and password login. Passwords are hashed with **bcryptjs** (12 rounds in development/production, 4 in tests). The API never stores or returns plaintext passwords or hashes.
- Staff Admin/POS login lists active shops at `GET /api/v1/auth/login-tenants` (`name` + `slug` only). The login form sends that slug to disambiguate email, never for later authorization.
- **Temporary password**: bootstrap owners and admin-created staff have `mustChangePassword`. Until they change it, only `GET /auth/me`, `POST /auth/change-password`, and `POST /auth/logout` succeed. Other staff APIs return 403. An owner can set a new temporary password from Admin → Users.
- **Password change**: verifies the current password, rejects reusing it, writes a new bcrypt hash, clears `mustChangePassword`, increments `tokenVersion` (invalidates outstanding access tokens), and revokes all refresh tokens. The user signs in again with the new password.
- **Forgot/reset password**: `PasswordResetToken` exists for a later email phase. No public reset endpoints in Phase 2. Until then, an owner or superior admin sets a temporary password in Admin.
- **Access token**: short-lived JWT (`JWT_ACCESS_EXPIRATION`, default `15m`) signed with `JWT_ACCESS_SECRET`. Claims: `sub` (user id), `tenantId`, `ver` (`tokenVersion`), `typ: access`, `jti`.
- **Refresh token**: opaque `rt_…` value, HMAC-SHA256 hashed with `JWT_REFRESH_SECRET`, stored in `refresh_tokens`. Also set as httpOnly cookie `jce_refresh_token` on path `/api/v1/auth`. Clients may send the raw token in the JSON body (tests and non-browser clients).
- Refresh **rotation**: each refresh issues a new token and marks the previous row `revokedAt` with `replacedById`. Reuse of a revoked family member revokes the entire family.
- **Logout**: revokes the presented refresh token and Redis-denylists the access token `jti` (`auth:denylist:{jti}`).
- Invalid credentials always return `Invalid email or password.` Inactive, suspended, missing, and wrong-password cases share that message. A dummy bcrypt compare runs when the user is missing to reduce timing leakage.
- Login, refresh, and password change are rate-limited in Redis (`AUTH_RATE_LIMIT` / `AUTH_RATE_WINDOW_SECONDS`). These limits are skipped when `NODE_ENV=test`.

## RBAC architecture

Roles are tenant-scoped. Permissions are a global catalog keyed by `code`. Seeded relationships are explicit; roles do not inherit “everything” unless listed.

| Role | Permissions |
| --- | --- |
| SUPER_ADMIN | All catalog codes. Hidden from other roles. Only an existing superior admin can assign it. Reserved for the developer and the client. |
| OWNER | All catalog codes |
| MANAGER | All catalog codes except `settings.manage`. Includes `users.manage`. Cannot assign OWNER or SUPER_ADMIN. |
| CASHIER | `dashboard.read`; catalog/customer/`sales.read`/`sales.create`/`sales.refund`; `orders.read/create/update/cancel`; `inventory.read`; `pos.access`, `pos.session.open`, `pos.session.close`. No `reports.read`, `expenses.*`, `sales.discount`, or `settings.manage`. |
| INVENTORY_MANAGER | `dashboard.read`; catalog/stock/purchase/supplier including `inventory.read`, `inventory.adjust`, `inventory.manage`; `customers.read`. No `expenses.*` or `reports.read`. |
| WEBSITE_MANAGER | `dashboard.read`; `products.read/create/update`, `website.read/update`, `promoCodes.read/manage`, `customers.read`, `orders.read/create/update/cancel`; no inventory modification or financial reports |

`@RequirePermissions('products.create')` is enforced by `PermissionsGuard`. Missing permission → **403**. Missing/invalid token → **401**.

Users cannot change their own roles or deactivate themselves. Only OWNER or SUPER_ADMIN may assign OWNER or mutate OWNER accounts. Only SUPER_ADMIN may assign SUPER_ADMIN or see those accounts in the user list. The tenant must keep at least one superior admin.

## Tenant isolation

- After login, `tenantId` comes only from the access-token identity. `?tenantId=` and `x-tenant-id` are ignored for authorization.
- `RequestContextInterceptor` stores `currentUser`, `currentTenant`, roles, and permissions in AsyncLocalStorage. `TenantContextService` exposes them.
- Prisma `$extends` injects `tenantId` into queries for tenant-owned models. Login, bootstrap, and JWT validation use `withoutTenantScope()`.
- Cross-tenant user lookups return **404** (no existence leak). `GET /api/v1/tenants` returns only the caller’s tenant.

## Session storage

- Access JWT is a bearer header. It is not stored in the database.
- Refresh tokens are stored hashed. Raw tokens exist only in the login/refresh response and the httpOnly cookie.
- Redis holds rate-limit counters, access-token denylist entries, and realtime pub/sub (`realtime:tenant:{tenantId}`).
- Admin and POS open `ws://API/realtime?token=ACCESS_JWT`. Tenant membership comes from the JWT, never from the client.
- Refresh rotation is atomic: the old token is revoked with a conditional update in the same transaction that issues the new one. Presenting an already-rotated token revokes the whole token family and writes an `AUTH_REFRESH_REUSE` audit event.

### Residual risk: browser token storage (accepted)

- **Admin and POS** keep the access JWT in `localStorage` so the static exports can attach the bearer header.
- **Storefront** keeps the customer access JWT in a JS-readable cookie for the same reason.
- Any successful XSS on those origins could read the token. Moving to httpOnly-cookie sessions with CSRF protection was deferred.
- Compensating controls:
  - Short access-token lifetime (`JWT_ACCESS_EXPIRATION`, default 15m).
  - A strict Content-Security-Policy on all three frontends (no third-party scripts beyond Razorpay; `frame-ancestors` locked down).
  - React output escaping. The only `dangerouslySetInnerHTML` is JSON-LD, which is serialized with `<`, `>` and `&` escaped.
  - Refresh-token reuse detection.
- Revisit this if the frontends start loading third-party scripts or user-authored HTML.

## Tenant creation

Unauthenticated public signup is not available. Development/operations can call:

`POST /api/v1/admin/tenants` with header `x-bootstrap-secret`.

If `BOOTSTRAP_SECRET` is empty, the route returns 404.

## CORS and headers

Helmet is enabled. Production requires explicit `CORS_ORIGINS`; the API refuses to boot if the list contains `*`. Credentials are allowed so the refresh cookie can be sent to listed frontend origins.

At boot in production the API also rejects missing, short (< 32 chars), placeholder, or identical JWT secrets, and `COOKIE_SAMESITE=none` without `COOKIE_SECURE=true` (see `assert-production-config.ts`).

Rate limits key on the client IP. Storefront browser calls arrive through the Vercel `/api/v1` rewrite, so set the same `STOREFRONT_PROXY_SECRET` on Vercel and the API; the storefront middleware then forwards the shopper IP in `x-jerzyfy-client-ip`, which the API trusts only when the secret matches.

## Storefront customer login options

Staff Admin/POS stay on email and password. Shoppers can use methods enabled per tenant in **Admin → Settings → Authentication**.

| Method | Default | Live provider |
| --- | --- | --- |
| Password | On | Built-in bcrypt |
| Email OTP | Off | Console (dev), [Resend](https://resend.com) free tier, or SMTP (Brevo) |
| SMS OTP | Off | Console (dev), [MSG91](https://msg91.com) (India), or Twilio |
| Google Sign-In | Off | Free [Google Cloud OAuth](https://console.cloud.google.com/apis/credentials) web client |

Provider API keys are stored per shop, encrypted with `SECRETS_ENCRYPTION_KEY` (32+ characters). GET `/api/v1/auth-settings` never returns raw secrets. Empty secret fields on PUT keep the saved value; `null` clears them. Console providers work without the encryption key.

Google redirect URI to add in Google Cloud:

`{API_ORIGIN}/api/v1/store/auth/google/callback`

Storefront endpoints:

- `POST /api/v1/store/auth/otp/request` and `/otp/verify`
- `GET /api/v1/store/auth/google/start` then `/callback` and `POST /google/exchange`

At least one shopper login method must stay enabled. `debugCode` is returned from OTP request only when `NODE_ENV=test`.
