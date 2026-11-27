# Uptime, Error Monitoring & Reliability Checklist

**Cinematic Arts (CA)** — Operational runbook for production uptime, zero-PII error tracking, and rapid incident triage.

---

## 1. Synthetic Uptime & Endpoint Checks

Configure an external monitor (Better Stack / UptimeRobot / Checkly / Cloudflare Health Checks) to probe these endpoints from at least 2 regions (e.g. Singapore/Middle East + Europe):

| Check | Endpoint | Interval | Expected Status & Body | Alert Threshold |
| :--- | :--- | :--- | :--- | :--- |
| API & Runtime Health | `GET /api/health` | 1 min | `200 OK`, JSON `"status":"ok"` | 2 consecutive failures |
| Primary Storefront | `GET /` | 1 min | `200 OK`, contains `Cinematic Arts` | 2 consecutive failures or TTFB > 1500 ms |
| Urdu RTL Storefront | `GET /ur` | 5 min | `200 OK`, `lang="ur" dir="rtl"` | 2 consecutive failures |
| SEO Sitemap & Robots | `GET /sitemap.xml` & `GET /robots.txt` | 15 min | `200 OK`, valid XML / `Disallow: /admin` | Any non-200 or unexpected `Disallow: /` |
| TLS / SSL Certificate | `https://cinematicartstore.netlify.app` | Daily | Valid certificate chain | < 14 days before expiry |

---

## 2. Alerting Thresholds & Escalation Targets

- **P1 Critical (Page / WhatsApp / SMS immediately):**
  - `/api/health` fails for >= 2 minutes
  - Storefront 5xx rate > 1% over 5 minutes
  - Order creation endpoint failures > 0.5% (excluding HTTP `400`/`429` validation/rate-limit)
- **P2 High (Slack / Email within 15 minutes):**
  - P95 storefront response latency > 1,500 ms for 10 minutes
  - Supabase auth or PostgREST timeouts (`504` / `AbortError`) spike > 5 events in 5 minutes
  - Sentry new issue surge (> 10 occurrences in 10 minutes)
- **P3 Warning (Daily digest):**
  - Scheduled E2E smoke failure on staging
  - `npm audit` reports moderate+ advisories

---

## 3. Sentry Zero-PII Setup & Verification

1. **Create a React Project in Sentry** and copy the ingest DSN.
2. **Set Environment Variables** in deployment (`Vercel` / `Cloudflare` / `.env`):
   ```env
   VITE_SENTRY_DSN="https://<public_key>@o0.ingest.sentry.io/<project_id>"
   VITE_SENTRY_ENVIRONMENT="production"
   ```
3. **Zero-PII Safeguards Already Enforced in Code (`src/services/sentry.ts` & `src/utils/privacyScrub.ts`):**
   - `sendDefaultPii: false`
   - `beforeSend` and `beforeBreadcrumb` strip emails, Pakistani mobile/WhatsApp numbers (`03XXXXXXXXX`, `+923XXXXXXXXX`), Bearer/JWT tokens, cookies, `authorization` headers, `event.user`, `request.data`, and sensitive query parameters (`token`, `email`, `phone`, `whatsapp`, `address`, `code`, `password`).
   - Every captured exception is tagged with `ca_reference_id` (`CA-XXXX-XXXX`), matching the short reference ID shown to the user.
4. **Quarterly PII Audit Check:**
   - Open 5 random recent events in Sentry Issues.
   - Verify `User`, `Request Body`, and `Tags` contain zero customer names, phone numbers, email addresses, or street addresses.

---

## 4. Reference ID (`CA-XXXX-XXXX`) Support Triage Flow

When a customer sends a screenshot or message with `Ref: CA-XXXX-XXXX`:
1. Open Sentry -> **Issues** -> search tag `ca_reference_id:"CA-XXXX-XXXX"`.
2. Check attached non-PII breadcrumbs (route path, HTTP status, error kind: `server`, `timeout`, `offline`, `rate_limit`).
3. Inspect matching timestamp in Supabase **Logs** (API / Auth / Postgres) or hosting edge logs.
4. Confirm with customer via WhatsApp once resolved.

---

## 5. Supabase Database & Auth Monitoring

Enable email/webhook notifications inside **Supabase Dashboard -> Project Settings -> Billing / Alerts**:
- Database CPU or Memory sustained > 80%
- Disk I/O budget or storage usage > 75%
- Active connection pool saturation > 80%
- Auth rate-limit or failed-signup spikes (possible bot wave -> verify Turnstile configuration)
- **Nightly Backups:** Verify automated daily backups are active and test a staging restore quarterly.

---

## 6. Performance, Security & Maintenance Cadence

- **Pre-Release Gates (Every Deploy):**
  - `npm run test:unit` (all pure logic, privacy scrubbing, error normalization, stock derivation, and SEO tests pass)
  - `npm run lint` & `npm run lint:security` (0 TypeScript errors, 0 ESLint security errors)
  - `npm run build` (full Vite + SSR + SEO pre-render passes cleanly)
  - `npm run test:e2e` against staging/mock (`signup`, `COD order -> /order-confirmed`, `installment without referral fails`, `installment with referral succeeds`, `admin Pending -> Proceeding -> Complete`)
- **Weekly:**
  - Review Sentry unresolved issues & performance Web Vitals (`LCP < 2.5s`, `CLS < 0.1`, `INP < 200ms`).
  - Run `npm audit` and patch vulnerable dependencies (`found 0 vulnerabilities` target).
- **Monthly:**
  - Run `BASE_URL=https://cinematicartstore.netlify.app LOAD_PROFILE=smoke k6 run load-tests/k6-plan.js` against live/staging and verify all SLA thresholds return `PASS`.
  - Rotate `ADMIN_PASSWORD` / `ADMIN_TOKEN_SECRET` if needed and verify backup restore integrity.
