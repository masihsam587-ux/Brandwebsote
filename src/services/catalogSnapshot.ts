import { createClient } from '@supabase/supabase-js';
import type { Category, InstallmentPlan, Product, TermsPolicyDocument } from '../api/types';
import {
  DEFAULT_TERMS_POLICY,
  SEED_CATEGORIES,
  SEED_INSTALLMENT_PLANS,
  SEED_PRODUCTS,
} from '../api/seedData';
import { mapDbCategory, mapDbPlan, mapDbProduct } from '../utils/supabaseMapping';
import { getAlternateLocalePaths } from '../i18n';
import { STORE_CONFIG } from './siteConfig';

export interface CatalogSnapshot {
  categories: Category[];
  products: Product[];
  plans: InstallmentPlan[];
  termsPolicy: TermsPolicyDocument;
  slugRedirects: Record<string, string>;
  source: 'supabase' | 'fallback';
  fetchedAt: string;
}

const PUBLIC_STATIC_BASE_PATHS = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/shop', changefreq: 'daily', priority: '0.9' },
  { path: '/about', changefreq: 'monthly', priority: '0.7' },
  { path: '/faq', changefreq: 'weekly', priority: '0.8' },
  { path: '/size-guide', changefreq: 'monthly', priority: '0.6' },
  { path: '/shipping', changefreq: 'monthly', priority: '0.6' },
  { path: '/contact', changefreq: 'monthly', priority: '0.7' },
  { path: '/terms', changefreq: 'monthly', priority: '0.4' },
  { path: '/privacy', changefreq: 'monthly', priority: '0.4' },
] as const;

export async function fetchCatalogSnapshot(options?: {
  timeoutMs?: number;
  fallbackProducts?: Product[];
  fallbackCategories?: Category[];
  fallbackPlans?: InstallmentPlan[];
  fallbackTerms?: TermsPolicyDocument;
}): Promise<CatalogSnapshot> {
  const timeoutMs = options?.timeoutMs ?? 5000;
  const url = (
    process.env.VITE_SUPABASE_URL ||
    ''
  ).trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  const configuredBackend = (process.env.VITE_BACKEND || '').trim().toLowerCase();

  const fallbackCategories = options?.fallbackCategories || SEED_CATEGORIES;
  const fallbackProducts = options?.fallbackProducts || SEED_PRODUCTS;
  const fallbackPlans = options?.fallbackPlans || SEED_INSTALLMENT_PLANS;
  const fallbackTerms = options?.fallbackTerms || DEFAULT_TERMS_POLICY;

  if (configuredBackend === 'mock' || configuredBackend === 'rest' || !url || !key) {
    return {
      categories: fallbackCategories,
      products: fallbackProducts,
      plans: fallbackPlans,
      termsPolicy: fallbackTerms,
      slugRedirects: {},
      source: 'fallback',
      fetchedAt: new Date().toISOString(),
    };
  }

  try {
    const sb = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init = {}) => {
          const controller = new globalThis.AbortController();
          const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);
          return globalThis
            .fetch(input, { ...init, signal: controller.signal })
            .finally(() => globalThis.clearTimeout(timer));
        },
      },
    });

    const [catRes, prodRes, planRes, redirRes] = await Promise.all([
      sb.from('categories').select('id,name').order('name', { ascending: true }),
      sb
        .from('products')
        .select('id,category_id,title,description,price,cover_image,images,is_active,created_at,categories(id,name)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(500),
      sb
        .from('plans')
        .select('months,markup_percent,advance_percent,is_active')
        .eq('is_active', true)
        .order('months', { ascending: true }),
      sb.from('product_slug_redirects').select('old_slug,new_slug').limit(500),
    ]);

    if (prodRes.error || catRes.error) {
      throw prodRes.error || catRes.error;
    }

    const categories = (catRes.data || []).map((row) => mapDbCategory(row));
    const categoryNameMap = new Map<string, string>(
      categories.map((c) => [c.id, c.name])
    );
    const products = (prodRes.data || []).map((row) => {
      const catRel = row.categories as { id?: string; name?: string } | null;
      return mapDbProduct({
        ...row,
        category_name: catRel?.name || categoryNameMap.get(String(row.category_id)) || 'Collection',
      });
    });
    const plans =
      !planRes.error && planRes.data && planRes.data.length > 0
        ? planRes.data.map((row) => mapDbPlan(row))
        : fallbackPlans;

    const slugRedirects: Record<string, string> = {};
    if (!redirRes.error && Array.isArray(redirRes.data)) {
      for (const row of redirRes.data) {
        const oldSlug = String((row as { old_slug?: string }).old_slug || '').trim().toLowerCase();
        const newSlug = String((row as { new_slug?: string }).new_slug || '').trim().toLowerCase();
        if (oldSlug && newSlug && oldSlug !== newSlug) {
          slugRedirects[oldSlug] = newSlug;
        }
      }
    }

    return {
      categories: categories.length > 0 ? categories : fallbackCategories,
      products,
      plans,
      termsPolicy: fallbackTerms,
      slugRedirects,
      source: 'supabase',
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return {
      categories: fallbackCategories,
      products: fallbackProducts,
      plans: fallbackPlans,
      termsPolicy: fallbackTerms,
      slugRedirects: {},
      source: 'fallback',
      fetchedAt: new Date().toISOString(),
    };
  }
}

function escapeXml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildSitemapXml(
  snapshot: Pick<CatalogSnapshot, 'categories' | 'products'>,
  runtimeOrigin?: string
): string {
  const origin = (runtimeOrigin || STORE_CONFIG.siteUrl).replace(/\/+$/, '');
  const entries: Array<{
    basePath: string;
    changefreq: string;
    priority: string;
    lastmod?: string;
  }> = [];

  for (const item of PUBLIC_STATIC_BASE_PATHS) {
    entries.push({
      basePath: item.path,
      changefreq: item.changefreq,
      priority: item.priority,
    });
  }

  for (const cat of snapshot.categories) {
    if (!cat.slug) continue;
    entries.push({
      basePath: `/category/${cat.slug}`,
      changefreq: 'daily',
      priority: '0.8',
    });
  }

  for (const prod of snapshot.products) {
    if (!prod.slug) continue;
    entries.push({
      basePath: `/product/${prod.slug}`,
      changefreq: 'weekly',
      priority: '0.8',
      lastmod: prod.createdAt ? prod.createdAt.slice(0, 10) : undefined,
    });
  }

  const urlBlocks: string[] = [];

  for (const entry of entries) {
    const alternates = getAlternateLocalePaths(entry.basePath);
    const enUrl = `${origin}${alternates.en}`;
    const urUrl = `${origin}${alternates.ur}`;
    const xDefUrl = `${origin}${alternates.xDefault}`;

    for (const locUrl of [enUrl, urUrl]) {
      urlBlocks.push(
        [
          '  <url>',
          `    <loc>${escapeXml(locUrl)}</loc>`,
          ...(entry.lastmod ? [`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`] : []),
          `    <changefreq>${entry.changefreq}</changefreq>`,
          `    <priority>${entry.priority}</priority>`,
          `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(enUrl)}" />`,
          `    <xhtml:link rel="alternate" hreflang="ur" href="${escapeXml(urUrl)}" />`,
          `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(xDefUrl)}" />`,
          '  </url>',
        ].join('\n')
      );
    }
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    '  <!-- Public English & Urdu routes only; /admin, /auth, /profile, /orders, /cart, /checkout are excluded -->',
    ...urlBlocks,
    '</urlset>',
    '',
  ].join('\n');
}
