# Cinematic Arts (CA) — Storefront & Installments Platform

Clothing and everyday accessories storefront in Peshawar, Pakistan, priced in PKR with Cash on Delivery and Seller-Referred Monthly Installments.

See [`SEO.md`](./SEO.md) for the full launch SEO checklist (Search Console, Bing Webmaster, analytics placeholders, and webhook rebuilds) and [`SECURITY.md`](./SECURITY.md) for security configuration notes.

---

## Domain Configuration (`VITE_SITE_URL`)

All canonical links, `hreflang` URLs, `og:url`, `og:image`, `twitter:image`, `sitemap.xml`, and `robots.txt` entries are built from a single environment variable:

```env
VITE_SITE_URL="https://cinematicartstore.netlify.app"
```

When you switch to a custom domain (for example `https://cinematicarts.pk`), update `VITE_SITE_URL` (no trailing slash) in your Netlify / hosting environment variables and trigger a fresh deploy (`npm run build`). Because public routes (`/` , `/shop`, `/category/:slug`, `/product/:slug`, `/ur/...`) are pre-rendered into static HTML during `npm run build`, every URL outputs complete Open Graph and product price/PKR tags in the raw HTML response without requiring JavaScript execution.

---

## Brand Favicons & App Manifest

All favicon and app icon assets live in `/public/` and are wired in `index.html`:

- `public/favicon.ico` (`16x16`, `32x32`, `48x48` multi-size ICO)
- `public/favicon.svg` (scalable gold-on-near-black `"CA"` monogram SVG)
- `public/favicon-32.png` (`32x32` PNG)
- `public/apple-touch-icon.png` (`180x180` iOS home screen icon)
- `public/icon-192.png` (`192x192` Android/PWA icon)
- `public/icon-512.png` (`512x512` Android/PWA splash icon)
- `public/icon-512-maskable.png` (`512x512` maskable icon with safe-zone margin)
- `public/site.webmanifest` (`name: "Cinematic Arts"`, `short_name: "CA"`, `theme_color: "#111214"`)
- `public/og-default.jpg` (`1200x630` JPEG share card under 300 KB)

### Verifying Favicons After Deploy
1. Open `<your-site-url>/site.webmanifest` in a browser and confirm JSON loads with HTTP `200`.
2. Open Chrome DevTools → **Application → Manifest** to confirm all icons (`192x192`, `512x512`, `512x512 maskable`) resolve cleanly with zero 404s.
3. Inspect `<your-site-url>/favicon.ico`, `<your-site-url>/favicon.svg`, and `<your-site-url>/apple-touch-icon.png` directly; if your browser still shows an old Netlify icon, open an Incognito window or hard-reload (`Ctrl+Shift+R` / `Cmd+Shift+R`).

---

## Testing Link Preview Cards (Open Graph & Twitter)

Because social apps (WhatsApp, Facebook, Instagram, Telegram, X, LinkedIn) do **not** run client JavaScript when fetching previews, verify the raw server HTML response before testing live shares:

```bash
curl -s https://cinematicartstore.netlify.app/ | grep -E "og:|twitter:|canonical"
curl -s https://cinematicartstore.netlify.app/product/<product-slug>/ | grep -E "og:|product:|twitter:"
```

### 1. Test with `opengraph.xyz` (Fastest All-Platform Preview)
1. Visit [https://www.opengraph.xyz](https://www.opengraph.xyz).
2. Paste your deployed homepage (`https://cinematicartstore.netlify.app/`), category page, or product URL (`https://cinematicartstore.netlify.app/product/<slug>`).
3. Verify it shows the `1200x630` card (or the product's cover image), title under 60 characters, description mentioning PKR / Peshawar / Cash on Delivery / installments, and HTTP `200` on `og:image`.

### 2. Test with the Facebook Sharing Debugger (Covers Facebook & Instagram & Messenger)
1. Open [https://developers.facebook.com/tools/debug/](https://developers.facebook.com/tools/debug/).
2. Enter the full `https://` URL and click **Debug**.
3. Confirm `og:image` is fetched cleanly with `200 OK`, dimensions are detected (`1200x630` on default card), and zero warnings appear about relative URLs or missing tags.

### 3. Test with WhatsApp & Telegram
- **WhatsApp**: Paste the full `https://` product or homepage link into a chat with yourself ("Message Yourself") and wait ~2 seconds before hitting Send so the preview card unfurls with image, title, and description.
- **Telegram**: Paste the URL into Saved Messages (or run `@WebpageBot` inside Telegram).

---

## How to Clear Cached Social Previews

Social platforms cache link previews aggressively (often 24 hours to 7 days):

1. **Facebook & Instagram**: Open the [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/), paste the exact URL, and click **Scrape Again** (click twice if it initially shows old metadata).
2. **X (Twitter)**: Use the X composer preview or append a temporary test query parameter (`?v=2`) when previewing a freshly deployed URL so X fetches a fresh card.
3. **LinkedIn**: Open LinkedIn **Post Inspector** (`https://www.linkedin.com/post-inspector/`), enter the URL, and click **Inspect** to force an immediate cache refresh.
4. **Telegram**: Open a chat with `@WebpageBot` on Telegram and send up to 10 URLs per message to invalidate Telegram's preview cache instantly.
5. **WhatsApp**: WhatsApp shares Facebook's Meta crawler cache for public URLs plus per-message cache on devices. Run **Scrape Again** in the Facebook Sharing Debugger first; for urgent verification in chat, test once with `?refresh=1` (canonical remains clean in HTML while WhatsApp treats the share string as a fresh fetch), or wait a few minutes and paste the bare URL in a brand-new message after Meta re-scrapes.
6. **Pre-rendered Product Pages**: Whenever you add, edit, or delete products in Supabase and want the static raw HTML tags to update immediately on Netlify, trigger a Netlify redeploy (or configure a Supabase Database Webhook → Netlify Build Hook as described in `SEO.md`).
