# Authentication, RBAC, and tenant isolation

Phase 2 of the Jersey Commerce Engine. POS write APIs are documented in [pos.md](pos.md).

## Authentication architecture

- Email and password login. Passwords are hashed with **bcryptjs** (12 rounds in development/production, 4 in tests). The API never stores or returns plaintext passwords or hashes.
- **Access token**: short-lived JWT (`JWT_ACCESS_EXPIRATION`, default `15m`) signed with `JWT_ACCESS_SECRET`. Claims: `sub` (user id), `tenantId`, `ver` (`tokenVersion`), `typ: access`, `jti`.
- **Refresh token**: opaque `rt_…` value, HMAC-SHA256 hashed with `JWT_REFRESH_SECRET`, stored in `refresh_tokens`. Also set as httpOnly cookie `jce_refresh_token` on path `/api/v1/auth`. Clients may send the raw token in the JSON body (tests and non-browser clients).
- Refresh **rotation**: each refresh issues a new token and marks the previous row `revokedAt` with `replacedById`. Reuse of a revoked family member revokes the entire family.
- **Logout**: revokes the presented refresh token and Redis-denylists the access token `jti` (`auth:denylist:{jti}`).
- **Password change**: verifies the current password, writes a new bcrypt hash, increments `tokenVersion` (invalidates outstanding access tokens), and revokes all refresh tokens.
- **Forgot/reset password**: `PasswordResetToken` exists for a later email phase. No public reset endpoints in Phase 2.
- Invalid credentials always return `Invalid email or password.` Inactive, suspended, missing, and wrong-password cases share that message. A dummy bcrypt compare runs when the user is missing to reduce timing leakage.
- Login, refresh, and password change are rate-limited in Redis (`AUTH_RATE_LIMIT` / `AUTH_RATE_WINDOW_SECONDS`). These limits are skipped when `NODE_ENV=test`.

## RBAC architecture

Roles are tenant-scoped. Permissions are a global catalog keyed by `code`. Seeded relationships are explicit; roles do not inherit “everything” unless listed.

| Role | Permissions |
| --- | --- |
| OWNER | All catalog codes |
| MANAGER | All catalog codes except `settings.manage`. Includes `users.manage`. Cannot assign OWNER. |
| CASHIER | catalog/customer/`sales.read`/`sales.create`/`sales.refund`; `orders.read/create/update/cancel`; `inventory.read`; `pos.access`, `pos.session.open`, `pos.session.close`. No `sales.discount`, `sales.cancel`, `customers.update`, `customers.notes`, or `customers.tags` by default. |
| INVENTORY_MANAGER | catalog/stock/purchase/supplier including `inventory.read`, `inventory.adjust`, `inventory.manage`; `customers.read` |
| WEBSITE_MANAGER | `products.read/create/update`, `website.read/update`, `customers.read`, `orders.read/create/update/cancel`; no inventory modification |

`@RequirePermissions('products.create')` is enforced by `PermissionsGuard`. Missing permission → **403**. Missing/invalid token → **401**.

Users cannot change their own roles or deactivate themselves. Only OWNER may assign OWNER or mutate OWNER accounts.

## Tenant isolation

- After login, `tenantId` comes only from the access-token identity. `?tenantId=` and `x-tenant-id` are ignored for authorization.
- `RequestContextInterceptor` stores `currentUser`, `currentTenant`, roles, and permissions in AsyncLocalStorage. `TenantContextService` exposes them.
- Prisma `$extends` injects `tenantId` into queries for tenant-owned models. Login, bootstrap, and JWT validation use `withoutTenantScope()`.
- Cross-tenant user lookups return **404** (no existence leak). `GET /api/v1/tenants` returns only the caller’s tenant.

## Session storage

- Access JWT is a bearer header. It is not stored in the database.
- Refresh tokens are stored hashed. Raw tokens exist only in the login/refresh response and the httpOnly cookie.
- Redis holds rate-limit counters and access-token denylist entries.

## Tenant creation

Unauthenticated public signup is not available. Development/operations can call:

`POST /api/v1/admin/tenants` with header `x-bootstrap-secret`.

If `BOOTSTRAP_SECRET` is empty, the route returns 404.

## CORS and headers

Helmet is enabled. Production requires explicit `CORS_ORIGINS` (never `*` unless you set that list deliberately). Credentials are allowed so the refresh cookie can be sent to listed frontend origins.
