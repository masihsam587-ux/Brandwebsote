import test from 'node:test';
import assert from 'node:assert/strict';
import { SEED_CATEGORIES, SEED_PRODUCTS } from '../api/seedData';
import type { Product } from '../api/types';
import { buildSitemapXml } from './catalogSnapshot';
import {
  applyRouteSeoTransition,
  buildProductSeoConfig,
  deriveProductSku,
  formatSlugAsTitle,
  getRouteSeoConfig,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  normalizeMetaDescription,
  normalizeMetaTitle,
  renderHeadTagsHtml,
  resolveAbsoluteImageUrl,
  resolveCanonicalUrl,
  updateDocumentHead,
  type HeadDocumentLike,
  type HeadElementLike,
} from './seoService';
import { generateLlmsTxt, generateRobotsTxt } from './siteConfig';
import { registerProductSlugRedirect, resolveProductSlugRedirect } from './slugRedirects';

function createMockDocument(): HeadDocumentLike & {
  elements: HeadElementLike[];
} {
  const elements: HeadElementLike[] = [];

  const createNode = (tagName: string): HeadElementLike => {
    const attrs = new Map<string, string>();
    const node: HeadElementLike = {
      tagName: tagName.toUpperCase(),
      textContent: null,
      setAttribute(name: string, value: string) {
        attrs.set(name, value);
        if (name === 'rel') node.rel = value;
        if (name === 'href') node.href = value;
        if (name === 'hreflang') node.hreflang = value;
        if (name === 'type') node.type = value;
      },
      getAttribute(name: string) {
        return attrs.get(name) ?? null;
      },
      remove() {
        const idx = elements.indexOf(node);
        if (idx !== -1) elements.splice(idx, 1);
      },
    };
    return node;
  };

  const matchesSelector = (node: HeadElementLike, selector: string): boolean => {
    if (selector === 'link[rel="canonical"]') {
      return node.tagName === 'LINK' && node.getAttribute('rel') === 'canonical';
    }
    if (selector === 'link[rel="alternate"][hreflang]') {
      return (
        node.tagName === 'LINK' &&
        node.getAttribute('rel') === 'alternate' &&
        node.getAttribute('hreflang') !== null
      );
    }
    if (selector === 'script[data-ca-seo="true"]') {
      return node.tagName === 'SCRIPT' && node.getAttribute('data-ca-seo') === 'true';
    }
    const metaMatch = /^meta\[(name|property)="([^"]+)"\]$/.exec(selector);
    if (metaMatch) {
      const [, attr, key] = metaMatch;
      return node.tagName === 'META' && node.getAttribute(attr) === key;
    }
    return false;
  };

  return {
    title: '',
    documentElement: { lang: 'en', dir: 'ltr' },
    elements,
    createElement: createNode,
    head: {
      querySelector(selector: string) {
        return elements.find((el) => matchesSelector(el, selector)) ?? null;
      },
      querySelectorAll(selector: string) {
        return elements.filter((el) => matchesSelector(el, selector));
      },
      appendChild(node: HeadElementLike) {
        elements.push(node);
        return node;
      },
    },
  };
}

test('resolveCanonicalUrl normalizes paths, strips hashes, and resolves origin', () => {
  assert.equal(
    resolveCanonicalUrl('/', 'https://cinematicarts.pk'),
    'https://cinematicarts.pk/'
  );
  assert.equal(
    resolveCanonicalUrl('/product/wool-overshirt/#reviews', 'https://cinematicarts.pk/'),
    'https://cinematicarts.pk/product/wool-overshirt'
  );
  assert.equal(
    resolveCanonicalUrl('shop//', 'https://cinematicarts.pk'),
    'https://cinematicarts.pk/shop'
  );
  assert.equal(
    resolveCanonicalUrl(undefined, 'https://cinematicarts.pk', 'https://cinematicarts.pk/shop?q=coat#top'),
    'https://cinematicarts.pk/shop'
  );
});

test('normalizeMetaTitle and normalizeMetaDescription enforce 60 and 155 char limits', () => {
  assert.equal(
    normalizeMetaTitle('  <b>Luxury</b>   Wool Jacket  '),
    'Luxury Wool Jacket'
  );

  const veryLongTitle =
    'Hand-Loomed Embroidered Peshawari Winter Wool Coat Collection Limited Edition Atelier';
  const clampedTitle = normalizeMetaTitle(veryLongTitle);
  assert.ok(clampedTitle.length <= MAX_TITLE_LENGTH);
  assert.ok(clampedTitle.endsWith('…'));

  const longDesc =
    'Hand-loomed wool overshirt crafted in Peshawar with horn buttons, reinforced double seams, warm brushed lining, and nationwide Cash on Delivery or monthly PKR installments.';
  const normalized = normalizeMetaDescription(longDesc);
  assert.ok(normalized.length <= MAX_DESCRIPTION_LENGTH);
  assert.ok(normalized.endsWith('…'));

  assert.ok(
    normalizeMetaDescription('', 'Fallback atelier description').includes('Fallback atelier')
  );
});

test('resolveAbsoluteImageUrl converts relative asset paths to full URLs', () => {
  assert.equal(
    resolveAbsoluteImageUrl('/src/assets/images/jacket.jpg', 'https://cinematicarts.pk'),
    'https://cinematicarts.pk/src/assets/images/jacket.jpg'
  );
  assert.equal(
    resolveAbsoluteImageUrl('https://cdn.example.com/item.webp', 'https://cinematicarts.pk'),
    'https://cdn.example.com/item.webp'
  );
});

test('formatSlugAsTitle converts product slugs into readable headings', () => {
  assert.equal(
    formatSlugAsTitle('womens-embroidered-unstitched-suit'),
    'Womens Embroidered Unstitched Suit'
  );
});

test('getRouteSeoConfig enforces index/noindex, char limits, and bilingual routes', () => {
  const publicRoutes = [
    ['/', ''],
    ['/shop', ''],
    ['/shop', '?category=jackets'],
    ['/about', ''],
    ['/faq', ''],
    ['/size-guide', ''],
    ['/shipping', ''],
    ['/contact', ''],
    ['/terms', ''],
    ['/privacy', ''],
    ['/ur', ''],
    ['/ur/shop', ''],
    ['/ur/faq', ''],
    ['/category/jackets', ''],
    ['/product/peshawari-wool-jacket', ''],
  ] as const;

  for (const [path, search] of publicRoutes) {
    const cfg = getRouteSeoConfig(path, search, 'https://cinematicarts.pk');
    assert.equal(cfg.noIndex, false, `Expected indexable route for ${path}`);
    assert.ok(cfg.title.length <= MAX_TITLE_LENGTH, `Title too long on ${path}: ${cfg.title}`);
    assert.ok(
      cfg.description.length <= MAX_DESCRIPTION_LENGTH,
      `Description too long on ${path}: ${cfg.description}`
    );
  }

  const home = getRouteSeoConfig('/', '', 'https://cinematicarts.pk');
  assert.ok(Array.isArray(home.jsonLd) && home.jsonLd.length >= 4);

  assert.equal(getRouteSeoConfig('/orders').noIndex, true);
  assert.equal(getRouteSeoConfig('/cart').noIndex, true);
  assert.equal(getRouteSeoConfig('/checkout').noIndex, true);
  assert.equal(getRouteSeoConfig('/profile').noIndex, true);
  assert.equal(getRouteSeoConfig('/auth').noIndex, true);
  assert.equal(getRouteSeoConfig('/admin').noIndex, true);
  assert.equal(getRouteSeoConfig('/status').noIndex, true);
  assert.equal(getRouteSeoConfig('/missing-route').noIndex, true);
});

test('buildProductSeoConfig produces PKR Product + SKU + BreadcrumbList with zero fake reviews', () => {
  const product: Product = {
    id: 'prod-1',
    slug: 'peshawari-wool-overshirt',
    title: 'Peshawari Wool Overshirt',
    description: 'Warm brushed wool overshirt tailored in Peshawar with breathable cotton lining.',
    price: 8500,
    categoryId: 'cat-jackets',
    categoryName: 'Jackets',
    coverImage: '/src/assets/images/overshirt.jpg',
    extraImages: ['https://cdn.example.com/overshirt-2.jpg'],
    sizes: ['M', 'L'],
    inStock: true,
    featured: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  const config = buildProductSeoConfig(product, 'https://cinematicarts.pk', 'en');
  assert.equal(config.type, 'product');
  assert.equal(config.canonicalPath, '/product/peshawari-wool-overshirt');
  assert.equal(config.productMeta?.priceAmount, 8500);
  assert.equal(config.productMeta?.priceCurrency, 'PKR');
  assert.equal(config.productMeta?.availability, 'in stock');
  assert.equal(config.productMeta?.sku, deriveProductSku(product));
  assert.ok(config.title.length <= MAX_TITLE_LENGTH);
  assert.ok(config.description.length <= MAX_DESCRIPTION_LENGTH);
  assert.ok(Array.isArray(config.jsonLd) && config.jsonLd.length === 2);

  const productSchema = config.jsonLd[0] as Record<string, unknown> & {
    '@type': string;
    sku: string;
    offers: { price: number; priceCurrency: string };
  };
  assert.equal(productSchema['@type'], 'Product');
  assert.equal(productSchema.sku, 'CA-PROD-1');
  assert.equal(productSchema.offers.price, 8500);
  assert.equal(productSchema.offers.priceCurrency, 'PKR');
  assert.equal(productSchema.aggregateRating, undefined);
  assert.equal(productSchema.review, undefined);
});

test('updateDocumentHead syncs hreflang, dir/lang, canonical deduplication, and cleans product tags', () => {
  const doc = createMockDocument();

  const dup1 = doc.createElement('link');
  dup1.setAttribute('rel', 'canonical');
  dup1.setAttribute('href', 'https://stale.example/old');
  const dup2 = doc.createElement('link');
  dup2.setAttribute('rel', 'canonical');
  dup2.setAttribute('href', 'https://stale.example/older');
  doc.head.appendChild(dup1);
  doc.head.appendChild(dup2);

  const product: Product = {
    id: 'prod-2',
    slug: 'emerald-unstitched-lawn',
    title: 'Emerald Unstitched Lawn',
    description: 'Three-piece embroidered unstitched lawn suit with organza dupatta.',
    price: 6200,
    categoryId: 'cat-women',
    categoryName: "Women's Unstitched",
    coverImage: '/src/assets/images/lawn.jpg',
    extraImages: [],
    sizes: ['Unstitched'],
    inStock: true,
    featured: false,
    createdAt: '2026-01-02T00:00:00.000Z',
  };

  updateDocumentHead(
    buildProductSeoConfig(product, 'https://cinematicarts.pk', 'ur'),
    doc,
    'https://cinematicarts.pk',
    'https://cinematicarts.pk/ur/product/emerald-unstitched-lawn'
  );

  assert.equal(doc.documentElement?.lang, 'ur');
  assert.equal(doc.documentElement?.dir, 'rtl');
  assert.ok(doc.title.includes('Emerald Unstitched Lawn'));
  assert.ok(doc.title.length <= MAX_TITLE_LENGTH);
  assert.equal(
    doc.head.querySelector('meta[name="description"]')?.getAttribute('content'),
    'Three-piece embroidered unstitched lawn suit with organza dupatta.'
  );
  const canonicalsAfterProduct = Array.from(doc.head.querySelectorAll('link[rel="canonical"]'));
  assert.equal(canonicalsAfterProduct.length, 1);
  assert.equal(
    canonicalsAfterProduct[0].getAttribute('href'),
    'https://cinematicarts.pk/ur/product/emerald-unstitched-lawn'
  );
  const hreflangs = Array.from(doc.head.querySelectorAll('link[rel="alternate"][hreflang]'));
  assert.equal(hreflangs.length, 3);
  assert.equal(
    doc.head.querySelector('meta[property="product:price:amount"]')?.getAttribute('content'),
    '6200'
  );
  assert.equal(
    Array.from(doc.head.querySelectorAll('script[data-ca-seo="true"]')).length,
    2
  );

  applyRouteSeoTransition(
    '/shop',
    '',
    doc,
    'https://cinematicarts.pk',
    'https://cinematicarts.pk/shop'
  );

  assert.equal(doc.documentElement?.lang, 'en');
  assert.equal(doc.documentElement?.dir, 'ltr');
  assert.equal(doc.title, 'Shop Clothing & Accessories in PKR — Cinematic Arts');
  assert.equal(
    doc.head.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    'https://cinematicarts.pk/shop'
  );
  assert.equal(doc.head.querySelector('meta[property="product:price:amount"]'), null);
  assert.equal(doc.head.querySelector('meta[property="og:type"]')?.getAttribute('content'), 'website');
  assert.equal(
    Array.from(doc.head.querySelectorAll('script[data-ca-seo="true"]')).length,
    2
  );
});

test('renderHeadTagsHtml outputs valid meta, hreflang, Urdu font, and noindex on 404', () => {
  const urFaqHtml = renderHeadTagsHtml(
    getRouteSeoConfig('/ur/faq', '', 'https://cinematicarts.pk'),
    'https://cinematicarts.pk'
  );
  assert.ok(urFaqHtml.includes('hreflang="ur"'));
  assert.ok(urFaqHtml.includes('Noto+Nastaliq+Urdu'));
  assert.ok(urFaqHtml.includes('FAQPage'));

  const notFoundHtml = renderHeadTagsHtml(
    getRouteSeoConfig('/nonexistent-page', '', 'https://cinematicarts.pk'),
    'https://cinematicarts.pk'
  );
  assert.ok(notFoundHtml.includes('<meta name="robots" content="noindex,nofollow" />'));
  assert.ok(!notFoundHtml.includes('hreflang='));
});

test('buildSitemapXml includes EN/UR public routes and excludes private routes', () => {
  const xml = buildSitemapXml(
    { categories: SEED_CATEGORIES, products: SEED_PRODUCTS },
    'https://cinematicarts.pk'
  );
  assert.ok(xml.includes('<loc>https://cinematicarts.pk/</loc>'));
  assert.ok(xml.includes('<loc>https://cinematicarts.pk/ur</loc>'));
  assert.ok(xml.includes('<loc>https://cinematicarts.pk/faq</loc>'));
  assert.ok(xml.includes('<loc>https://cinematicarts.pk/ur/faq</loc>'));
  assert.ok(xml.includes(`/product/${SEED_PRODUCTS[0].slug}</loc>`));
  assert.ok(!xml.includes('/admin</loc>'));
  assert.ok(!xml.includes('/auth</loc>'));
  assert.ok(!xml.includes('/profile</loc>'));
  assert.ok(!xml.includes('/orders</loc>'));
  assert.ok(!xml.includes('/cart</loc>'));
  assert.ok(!xml.includes('/checkout</loc>'));
});

test('generateRobotsTxt supports AI crawler toggle and allows Googlebot/Bingbot', () => {
  const allowed = generateRobotsTxt({
    aiCrawlersAllow: true,
    origin: 'https://cinematicarts.pk',
  });
  assert.ok(allowed.includes('User-agent: Googlebot'));
  assert.ok(allowed.includes('User-agent: Bingbot'));
  assert.ok(allowed.includes('User-agent: GPTBot\nAllow: /'));
  assert.ok(allowed.includes('Disallow: /admin'));
  assert.ok(allowed.includes('Disallow: /checkout'));
  assert.ok(allowed.includes('Sitemap: https://cinematicarts.pk/sitemap.xml'));

  const blocked = generateRobotsTxt({
    aiCrawlersAllow: false,
    origin: 'https://cinematicarts.pk',
  });
  assert.ok(blocked.includes('User-agent: Googlebot\nAllow: /'));
  assert.ok(blocked.includes('User-agent: GPTBot\nDisallow: /'));
});

test('slug redirect registry resolves old slugs safely and prevents loops', () => {
  registerProductSlugRedirect('legacy-winter-coat', 'olive-bomber-winter-jacket');
  assert.equal(resolveProductSlugRedirect('legacy-winter-coat'), 'olive-bomber-winter-jacket');
  assert.equal(
    resolveProductSlugRedirect('custom-old', { 'custom-old': 'new-target' }),
    'new-target'
  );
});

test('generateLlmsTxt summarizes store, payment rules, and public URLs', () => {
  const llms = generateLlmsTxt({
    origin: 'https://cinematicarts.pk',
    categories: SEED_CATEGORIES,
    products: SEED_PRODUCTS,
  });
  assert.ok(llms.includes('# Cinematic Arts (CA)'));
  assert.ok(llms.includes('https://cinematicarts.pk/faq'));
  assert.ok(llms.includes('Cash on Delivery'));
});
