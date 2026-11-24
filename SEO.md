# Manual SEO & Launch Checklist — Cinematic Arts (CA)

All technical SEO code (pre-rendered HTML for English & Urdu `/ur/` routes, `robots.txt`, dynamic `sitemap.xml`, `llms.txt`, JSON-LD schemas, canonical/hreflang links, 301 product slug redirects, WebP/AVIF media, and HTTP 404 handling) is already wired into the codebase. Complete the manual steps below before going live on your custom domain.

---

## 1. Set Your Production Domain URL
- Set both `VITE_SITE_URL` and `SITE_URL` in your production environment (`.env` / hosting dashboard) to your exact canonical domain without a trailing slash, e.g.:
  ```env
  VITE_SITE_URL="https://cinematicarts.pk"
  SITE_URL="https://cinematicarts.pk"
  ```
- Rebuild after changing your domain (`npm run build`) so pre-rendered canonical tags, `hreflang` URLs, `sitemap.xml`, `robots.txt`, and `llms.txt` point to your live domain.

---

## 2. Replace Placeholder Store Address, Hours & Map Link
- Open `src/services/siteConfig.ts` and replace the placeholder local business details in `STORE_CONFIG`:
  - `address.streetAddress`: replace `'Shop #14, University Road Market (Update Street Address)'` with your exact shop/showroom address.
  - `openingHours.days`, `opens`, `closes`, `displayEn`, `displayUr`: update to match your actual showroom hours.
  - `mapUrl`: replace with your exact Google Maps share/pin link.
- Keep your Business Name, Street Address, Phone (`03355329722`), and Hours identical across your Contact page, Google Business Profile, and social profiles.

---

## 3. Native Speaker Review of Urdu Translations
- Have a native Urdu speaker review every line in `src/i18n/ur.ts` (brand phrasing, category descriptions, size guide labels, shipping terms, and installment FAQ answers) to ensure natural tone and accurate terminology for Pakistani shoppers.
- Ensure every Urdu FAQ answer in `src/i18n/ur.ts` continues to open with a clear single-sentence direct answer.

---

## 4. Google Search Console, Bing Webmaster & Analytics
1. **Google Search Console (GSC):**
   - Add your domain property in Google Search Console (`https://search.google.com/search-console`).
   - Copy the HTML meta verification token and set `VITE_GSC_VERIFICATION="..."` in your environment.
   - Once deployed, submit `https://yourdomain.com/sitemap.xml` inside **Indexing > Sitemaps**.
2. **Bing Webmaster Tools:**
   - Verify your site at `https://www.bing.com/webmasters` (you can import from GSC or copy the `msvalidate.01` content value into `VITE_BING_VERIFICATION="..."`).
   - Submit `https://yourdomain.com/sitemap.xml`.
3. **Privacy-Friendly Analytics (Optional):**
   - For **Plausible**, set `VITE_PLAUSIBLE_DOMAIN="yourdomain.com"`.
   - For **Umami**, set both `VITE_UMAMI_WEBSITE_ID` and `VITE_UMAMI_SCRIPT_URL` (also add your Umami host to the `Content-Security-Policy` `script-src` and `connect-src` directives in `server.ts`, `vercel.json`, and `public/_headers`).

---

## 5. Auto-Rebuild When Supabase Products Change
- Set a strong random secret in your server environment:
  ```env
  SEO_REBUILD_SECRET="your-long-random-secret"
  ```
- In **Supabase Dashboard > Database > Webhooks**, create a webhook on the `products` and `categories` tables (`INSERT`, `UPDATE`, `DELETE`) pointing to:
  - URL: `https://yourdomain.com/api/seo/webhook/supabase`
  - HTTP Header: `x-seo-secret: <your-SEO_REBUILD_SECRET>`
- When triggered, the Express server invalidates the catalog snapshot cache immediately and regenerates pre-rendered HTML, `sitemap.xml`, and `llms.txt` in `dist/`.
- If you host statically without Node/Express (e.g., Vercel static / Netlify), point the Supabase webhook to a Vercel/Netlify Deploy Hook URL instead so static pre-rendered pages rebuild on catalog changes.

---

## 6. Product Slug 301 Redirects (Optional Database Table)
If you change an existing product's slug in production and want automatic **301 permanent redirects** stored in Supabase, create this optional table in Supabase SQL Editor:
```sql
create table if not exists public.product_slug_redirects (
  old_slug text primary key,
  new_slug text not null,
  created_at timestamptz default now()
);

alter table public.product_slug_redirects enable row level security;

create policy "Public read slug redirects"
  on public.product_slug_redirects for select
  using (true);
```
You can also record permanent redirects directly in code inside `src/services/slugRedirects.ts` (`STATIC_PRODUCT_SLUG_REDIRECTS`) or `public/_redirects`.

---

## 7. AI Crawler Controls
- By default, `AI_CRAWLERS_ALLOW="true"` allows Googlebot, Bingbot, `GPTBot`, `OAI-SearchBot`, `ChatGPT-User`, `Google-Extended`, `ClaudeBot`, `anthropic-ai`, `PerplexityBot`, and `Applebot-Extended` to read public catalog & FAQ pages (while blocking `/admin`, `/auth`, `/profile`, `/orders`, `/cart`, `/checkout`, and `/api/`).
- To block AI crawlers in one change, set `AI_CRAWLERS_ALLOW="false"` (or `VITE_AI_CRAWLERS_ALLOW="false"`) and rebuild.

---

## 8. Customer Reviews & Rich Snippets Policy
- Product JSON-LD intentionally omits `aggregateRating` and `review` fields because verified buyer reviews are not yet stored in Supabase.
- **Do not add** `aggregateRating` or `review` markup unless real customer reviews are stored in your database and displayed visibly on product pages.

---

## 9. Post-Launch Verification
- Test public pages in **Google Rich Results Test** (`https://search.google.com/test/rich-results`): check Home (`Organization`, `WebSite`, `ClothingStore`, `FAQPage`), Product (`Product` + `Offer` in PKR + `BreadcrumbList`), and FAQ (`FAQPage`).
- Check **PageSpeed Insights** / Lighthouse on mobile & desktop for Core Web Vitals targets (`LCP < 2.5s`, `CLS < 0.1`, `INP < 200ms`).
- Verify `curl -I https://yourdomain.com/nonexistent-page` returns **HTTP 404** and contains `<meta name="robots" content="noindex,nofollow" />`.
