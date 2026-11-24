# Cinematic Arts (CA) — Security & Scale Architecture Guide

This document outlines the frontend, edge CDN, and backend protections implemented for **Cinematic Arts (CA)**, along with every security rule that **MUST** be enforced server-side before production launch on Railway, Supabase, or a custom Node/PostgreSQL backend.

---

## 1. Environment Variables: Safe vs. Secret

| Variable | Exposure | Safe in Frontend (`VITE_`)? | Purpose |
| :--- | :--- | :--- | :--- |
| `VITE_BACKEND` | Public | Yes | Selects adapter (`mock`, `rest`, or `supabase`). |
| `VITE_API_BASE_URL` | Public | Yes | HTTPS origin of your REST API backend. |
| `VITE_SUPABASE_URL` | Public | Yes | Public Supabase project URL. |
| `VITE_SUPABASE_ANON_KEY` | Public | Yes (with RLS enabled) | Public anonymous key; safe **only** when Row-Level Security (RLS) policies protect every table. |
| `VITE_TURNSTILE_SITE_KEY` | Public | Yes | Public Cloudflare Turnstile widget site key. |
| `ADMIN_PASSWORD` | **Secret** | **NEVER** | Server-only admin credential checked via `crypto.timingSafeEqual` / `scrypt`. |
| `ADMIN_TOKEN_SECRET` | **Secret** | **NEVER** | HMAC signing key for short-lived 15-minute admin session tokens. |
| `USER_TOKEN_SECRET` | **Secret** | **NEVER** | HMAC/JWT signing secret for customer & seller sessions. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** | **NEVER** | Bypasses RLS — keep strictly on server/Edge Functions. |
| `TURNSTILE_SECRET_KEY` | **Secret** | **NEVER** | Server-side secret used to verify Turnstile tokens against Cloudflare. |
| `CORS_ORIGIN` | **Secret/Config** | Server only | Comma-separated allowlist of allowed browser origins. |

---

## 2. Frontend & Edge Protections Implemented

1. **Secrets & Build Hardening**:
   - Production builds disable source maps (`sourcemap: false`) and strip `console.*` and `debugger` statements (`vite.config.ts`).
   - `.env` and `.env.*` (except `.env.example`) are excluded via `.gitignore`.
   - Zero passwords or admin secrets exist in client code.
2. **XSS & Injection Defense**:
   - Zero `dangerouslySetInnerHTML` or `innerHTML` usage across the codebase.
   - All text inputs pass through Zod schemas (`src/utils/validation.ts`) and DOMPurify plain-text stripping (`src/utils/security.ts`).
   - `?redirect=` query parameters pass through `sanitizeUrlPath` (blocking external URLs, `//`, and protocol schemes).
   - Product `:slug` params and `#admin` hash routes are strictly validated before execution.
3. **Auth & Session Handling**:
   - User/seller tokens and Supabase sessions reside strictly in memory (`memorySession` / in-memory Supabase auth storage) or backend `HttpOnly; SameSite=Lax; Secure` cookies — never persisted to `localStorage`.
   - Admin sessions use memory-only short-lived tokens (`15 minutes`), auto-lock on inactivity or token `exp`, enforce 5-attempt client + server lockouts, and clear admin React Query caches on lock.
   - `<RouteGuard />` blocks rendering protected UI views until authentication/role resolves.
   - Logout and account deletion call `clearAllClientCaches()` to wipe React Query, cart/wishlist storage, and `sessionStorage`.
   - Password creation enforces 8+ characters with letters and digits/symbols, plus live `<PasswordStrengthMeter />`.
4. **Request Safety, Idempotency & Anti-Abuse**:
   - Central `httpRequest` client enforces 12-second `AbortController` timeouts, backoff+jitter retries **only** on safe/idempotent calls, `X-Requested-With`, `X-CSRF-Token`, and normalized error messages.
   - Checkout sends unique `Idempotency-Key` headers plus double-submit throttling (`canTriggerAction`).
   - Auth and checkout forms include an offscreen honeypot (`TurnstileField`) and optional Cloudflare Turnstile verification.
   - Shop search uses a 300ms debounce before querying.
5. **Browser Headers & Privacy**:
   - `vercel.json`, `public/_headers`, and `server.ts` enforce strict CSP, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `HSTS`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, and `COOP`.
   - Private routes (`/admin`, `/profile`, `/orders`, `/auth`) emit `<meta name="robots" content="noindex,nofollow">` and are excluded from `robots.txt` and `sitemap.xml`.
   - Phone numbers in admin list views are masked (`0335••••722`) until a detailed inspection modal is opened.
6. **File Upload Sanitization**:
   - `processSecureImageUpload` restricts extensions (`.jpg`, `.jpeg`, `.png`, `.webp`), checks binary magic bytes, strips EXIF metadata via `<canvas>` re-encoding to `.webp`, caps sizes (2 MB avatars / 5 MB products), and assigns random `crypto.randomUUID().webp` filenames.
7. **Performance at Scale (10,000+ Concurrent Users)**:
   - All route views are code-split via `React.lazy` + `Suspense`, keeping initial JS well below 200 KB gzipped.
   - `@tanstack/react-query` caches catalog/order responses (5-minute `staleTime`) and deduplicates concurrent requests.
   - Shop renders 12 products per page (`ShopPage`); Admin orders/products use windowed progressive rendering (`AdminConsole`); images specify explicit dimensions, `decoding="async"`, and lazy loading.

---

## 3. CRITICAL: BACKEND MUST ENFORCE (Production Checklist)

Assume all frontend JavaScript, Zod checks, `<RouteGuard />`, and installment calculations can be bypassed by an attacker using `curl` or a proxy. Your backend (Railway Node/Express + PostgreSQL or Supabase + Edge Functions) **MUST** enforce every rule below:

1. **Authentication & Session Security**:
   - Hash all passwords with **Argon2id** or **scrypt** (`N >= 16384`, unique 16-byte random salt per user) and constant-time comparison.
   - Verify HMAC/JWT signatures, `exp`, `iss`, and `aud` on **every** protected API call.
   - Set user session cookies with `HttpOnly; Secure; SameSite=Lax` and validate `X-CSRF-Token` on mutating requests.
   - Enforce short-lived admin tokens (<= 15 minutes) and verify admin role/secret strictly server-side.
2. **Role-Based Access Control (RBAC) & Row-Level Security (RLS)**:
   - Never trust `role`, `userId`, or `sellerId` sent in request bodies; derive identity strictly from the verified session token.
   - When using Supabase PostgreSQL, enable RLS on every table:
     ```sql
     ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
     ALTER TABLE feedback_threads ENABLE ROW LEVEL SECURITY;
     ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

     -- Customers read only their own orders; referred sellers may read referred orders
     CREATE POLICY "orders_select_own" ON orders
       FOR SELECT USING (
         auth.uid() = user_id
         OR referral_seller_id = auth.uid()
       );

     -- Feedback threads visible only to owning customer
     CREATE POLICY "feedback_owner_only" ON feedback_threads
       FOR ALL USING (auth.uid() = user_id)
       WITH CHECK (auth.uid() = user_id);
     ```
   - Route all `/api/admin/*` actions through privileged server/Edge endpoints after checking admin authentication — **never** grant admin write policies to the public `anon` key.
3. **Server-Side Business Math & Anti-Tampering**:
   - **Never trust client prices or totals**: look up authoritative `price` and `cost_price` from the database by `productId` and recompute `baseSubtotal`.
   - **Never trust client installment schedules**: look up the active `installment_plans` row in the DB and recompute `2m @ 15%`, `3m @ 25%`, `4m @ 40%` markup, advance, monthly amounts, and `totalPayable` server-side.
   - **Referral Validation**: require a valid, active `seller_code` (`is_active_seller = true`) on `installments` orders; verify optional codes on `cod` orders; recompute `10%` seller commission server-side and credit only when admin marks status `complete`.
   - **Idempotency Constraint**: store `idempotency_key` with a `UNIQUE` database constraint on `orders` so retries cannot create duplicate orders.
4. **Input Validation, Rate Limiting & Bot Defense**:
   - Re-validate every payload with Zod on the backend and use parameterized SQL queries only.
   - Apply distributed rate limiting (Redis / Upstash / Cloudflare WAF) per IP and per account on `/api/auth/login`, `/api/auth/signup`, `/api/auth/forgot-password`, `/api/admin/login`, and `POST /api/orders`.
   - Verify Cloudflare Turnstile `turnstileToken` on the backend against `https://challenges.cloudflare.com/turnstile/v0/siteverify` using `TURNSTILE_SECRET_KEY`.
5. **Uploads, Audit Logs & CORS**:
   - Re-verify magic bytes and re-encode/resize uploaded images server-side or via Supabase Storage signed upload URLs with strict MIME/size policies; store with random UUID keys.
   - Record immutable audit log rows (`actor_id`, `action`, `target_id`, `timestamp`, `ip_hash`) for admin login, order status updates, installment payment toggles, product edits, and policy edits. Never log passwords, tokens, or full PII to stdout.
   - Enforce an explicit `CORS_ORIGIN` allowlist (never `*` with credentials).

---

## 4. CDN & Scale Deployment Guide (10,000+ Concurrent Users)

### Cloudflare Pages / Vercel (Static Frontend Edge)
1. Build command: `npm run build` -> outputs static files to `dist/`.
2. Serve `dist/` directly from Cloudflare Pages or Vercel Edge Network so 10,000+ concurrent browsers download HTML, hashed `/assets/*.js|css`, and static images from edge PoPs with **zero load** on your origin API server.
3. Both `vercel.json` and `public/_headers` configure:
   - `/assets/*`: `Cache-Control: public, max-age=31536000, immutable`
   - `/index.html`: `Cache-Control: public, max-age=60, must-revalidate`
   - Security headers (CSP, HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`).

### API Origin (Railway / Render / Edge Functions)
1. Point `VITE_API_BASE_URL` (for REST) or `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (for Supabase) at your backend.
2. Put Cloudflare / CDN caching (`s-maxage=60, stale-while-revalidate=300`) in front of read-only `GET /api/products`, `GET /api/categories`, `GET /api/installment-plans`, and `GET /api/terms` endpoints.
3. Run `k6 run load-tests/k6-plan.js` against staging to verify p95 latency and rate-limit behavior before launch.
