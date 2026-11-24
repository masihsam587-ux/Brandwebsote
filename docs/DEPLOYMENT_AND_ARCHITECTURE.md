# Cinematic Arts (CA) — Architecture, Deployment & Testing Guide

## 1. Switching Backends (`VITE_BACKEND`)
All UI components talk exclusively to `/src/api/index.ts`. Switch backends with one environment variable:

| Mode | `VITE_BACKEND` | Required Env Vars | Use Case |
| :--- | :--- | :--- | :--- |
| Mock + Local Server Admin Auth | `mock` (default) | Optional `ADMIN_PASSWORD` | Instant preview with authentic CA Peshawar product catalog & live local persistence |
| Express / Railway REST API | `rest` | `VITE_API_BASE_URL`, `ADMIN_PASSWORD`, `DATABASE_URL` | Self-hosted Node + PostgreSQL API |
| Supabase | `supabase` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `ADMIN_PASSWORD` | Managed Auth, PostgreSQL, Storage & RLS |

---

## 2. Deployment Steps

### A. Supabase Backend Setup
1. Create a Supabase project and open **SQL Editor**.
2. Execute `docs/supabase/schema.sql` to provision tables, the 10% commission trigger, and Row-Level Security (RLS) policies.
3. Create a Storage bucket named `ca-media` (public read, authenticated upload).
4. Set `VITE_BACKEND=supabase`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY` in your hosting dashboard.

### B. Railway Express REST Backend
1. Provision a PostgreSQL service on Railway.
2. Deploy `docs/railway-express/server.ts` (or `server.ts`) with:
   - `DATABASE_URL`
   - `ADMIN_PASSWORD` (strong secret, server-side only)
   - `ADMIN_TOKEN_SECRET` (32+ byte random string)
3. Set `VITE_BACKEND=rest` and `VITE_API_BASE_URL=https://your-service.up.railway.app` on your frontend host.

### C. Vercel / Netlify Frontend + Crawlability
1. Build command: `npm run build` · Output directory: `dist`.
2. Add SPA fallback rewrite (`/* -> /index.html`).
3. **SEO Pre-rendering Note**: All product pages (`/product/:slug`) inject canonical URLs, OpenGraph tags, Twitter Cards, and Schema.org `Product` + `BreadcrumbList` JSON-LD dynamically. `public/robots.txt`, `public/sitemap.xml`, and `public/llms.txt` are copied directly to `dist/` for search engines and AI crawlers.

---

## 3. End-to-End Testing Checklist
- [ ] **First Load**: Intro splash plays and settles; `?autostart=1` skips straight to storefront; welcome toast appears once per session.
- [ ] **Shop & Search**: Filter by category (`Women's Unstitched`, `Boys' Trousers`, `Jackets`, `Hoodies`, `Shirts`, `T-Shirts`, `Accessories`), search by keyword, sort by price.
- [ ] **Product Buy & Installments**: Switch between Cash on Delivery and 2/3/4-month installment plans (15% / 25% / 40% interest); verify Monthly PKR, Interest Fee, and Total Payable update live.
- [ ] **Referral Gate**: Attempt Installment checkout with empty or invalid Seller ID -> blocked with error. Register a Seller on `/auth` to obtain a live `CA-XXXXXX` ID -> enter it -> verified seller name displays and order submits as `pending`.
- [ ] **Seller Sign-Up**: Register a new Seller on `/auth` -> generates unique `CA-XXXXXX` code and unlocks Seller Dashboard tab in `/profile`.
- [ ] **Hidden Admin Panel (`Ctrl+Shift+A` / `/admin`)**: Verify no Admin link exists in the Footer; press `Ctrl+Shift+A` -> backend verifies password (rate-limited after 5 failures) -> inspect profit margin KPIs, add manual offline entries, complete a referred order, verify 10% commission credits automatically to the referring seller, and edit live Terms & Policy.
- [ ] **Notifications & Threaded Feedback**: Reply to customer feedback in Admin Console -> appears in Customer Profile Notifications -> reply back in thread.
