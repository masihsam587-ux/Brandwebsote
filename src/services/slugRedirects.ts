/**
 * Registry of historical product slugs -> canonical current slugs.
 * Whenever a product slug changes, add oldSlug -> newSlug here (or in Supabase
 * `product_slug_redirects` table) so Express / Vercel / Netlify issue a 301 redirect.
 */
export const STATIC_PRODUCT_SLUG_REDIRECTS: Record<string, string> = {
  // Example: 'old-womens-suit-slug': 'womens-embroidered-unstitched-suit',
};

const dynamicRedirects = new Map<string, string>(
  Object.entries(STATIC_PRODUCT_SLUG_REDIRECTS)
);

export function registerProductSlugRedirect(oldSlug: string, newSlug: string): void {
  const cleanOld = oldSlug.trim().toLowerCase();
  const cleanNew = newSlug.trim().toLowerCase();
  if (!cleanOld || !cleanNew || cleanOld === cleanNew) return;
  dynamicRedirects.set(cleanOld, cleanNew);
}

export function resolveProductSlugRedirect(
  slug: string,
  extraMap?: Record<string, string>
): string | null {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;

  let current = normalized;
  const visited = new Set<string>();
  for (let i = 0; i < 5; i += 1) {
    if (visited.has(current)) break;
    visited.add(current);
    const next = extraMap?.[current] || dynamicRedirects.get(current);
    if (!next || next === current) break;
    current = next;
  }

  return current !== normalized ? current : null;
}

export function getAllRegisteredSlugRedirects(): Record<string, string> {
  return Object.fromEntries(dynamicRedirects.entries());
}
