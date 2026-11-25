import type { Category, Product } from '../api/types';
import {
  getAlternateLocalePaths,
  getDictionary,
  getLocaleFromPath,
  localizePath,
  stripLocalePrefix,
  type Locale,
} from '../i18n';
import { formatPKR } from '../utils/commerce';
import { sanitizePlainText } from '../utils/security';
import { STORE_CONFIG } from './siteConfig';

export const SITE_NAME = STORE_CONFIG.brandName;
export const MAX_TITLE_LENGTH = 60;
export const MAX_DESCRIPTION_LENGTH = 155;
export const DEFAULT_OG_IMAGE_PATH = '/src/assets/images/womens_unstitched_suit_1795333234539.jpg';

export interface ProductSeoMeta {
  priceAmount: number;
  priceCurrency?: string;
  availability?: 'in stock' | 'out of stock';
  brand?: string;
  category?: string;
  sku?: string;
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export interface SeoHeadConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  image?: string;
  type?: 'website' | 'product';
  noIndex?: boolean;
  locale?: Locale;
  productMeta?: ProductSeoMeta;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export interface HeadElementLike {
  tagName?: string;
  rel?: string;
  href?: string;
  hreflang?: string;
  type?: string;
  textContent: string | null;
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | null;
  remove(): void;
}

export interface HeadParentLike {
  querySelector(selector: string): HeadElementLike | null;
  querySelectorAll(selector: string): Iterable<HeadElementLike>;
  appendChild(node: HeadElementLike): unknown;
}

export interface HeadDocumentLike {
  title: string;
  documentElement?: {
    lang?: string;
    dir?: string;
    setAttribute?(name: string, value: string): void;
  };
  head: HeadParentLike;
  createElement(tagName: string): HeadElementLike;
}

const DEFAULT_HOME_DESCRIPTION_EN =
  "Shop women's unstitched suits, boys' trousers, jackets, hoodies, shirts, t-shirts & accessories in PKR. Cash on Delivery & monthly plans.";
const DEFAULT_HOME_DESCRIPTION_UR =
  'سنیماٹک آرٹس پشاور سے خواتین کے ان سٹچڈ سوٹ، لڑکوں کی ٹراؤزر، جیکٹس، ہڈیز اور شرٹس PKR میں خریدیں۔ کیش آن ڈیلیوری اور اقساط دستیاب ہیں۔';

export function normalizeMetaTitle(rawTitle: string, maxLength = MAX_TITLE_LENGTH): string {
  const cleaned = sanitizePlainText(rawTitle || '', 160);
  if (!cleaned) return SITE_NAME;
  if (cleaned.length <= maxLength) return cleaned;
  const sliced = cleaned.slice(0, maxLength - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  const trimmed = lastSpace > Math.floor(maxLength * 0.55) ? sliced.slice(0, lastSpace) : sliced;
  return `${trimmed.replace(/[-–—·:,.\s]+$/, '')}…`;
}

export function normalizeMetaDescription(
  rawDescription: string,
  fallback = DEFAULT_HOME_DESCRIPTION_EN,
  maxLength = MAX_DESCRIPTION_LENGTH
): string {
  const cleaned = sanitizePlainText(rawDescription || '', 400);
  const source = cleaned || sanitizePlainText(fallback, 400);
  if (source.length <= maxLength) return source;
  const sliced = source.slice(0, maxLength - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  const trimmed = lastSpace > Math.floor(maxLength * 0.6) ? sliced.slice(0, lastSpace) : sliced;
  return `${trimmed.replace(/[-–—·:,.\s]+$/, '')}…`;
}

function normalizePathAndQuery(rawPath: string): string {
  const withoutHash = rawPath.split('#')[0].trim();
  if (!withoutHash) return '/';
  const qIndex = withoutHash.indexOf('?');
  const pathPart = qIndex === -1 ? withoutHash : withoutHash.slice(0, qIndex);
  const queryPart = qIndex === -1 ? '' : withoutHash.slice(qIndex + 1);

  const prefixed = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
  const collapsed = prefixed.replace(/\/{2,}/g, '/');
  const cleanPath = collapsed.length > 1 ? collapsed.replace(/\/+$/, '') : collapsed;

  if (!queryPart) return cleanPath;
  return `${cleanPath}?${queryPart}`;
}

export function resolveCanonicalUrl(
  canonicalPath?: string,
  runtimeOrigin?: string,
  runtimeHref?: string
): string {
  const origin = (
    runtimeOrigin ??
    (typeof window !== 'undefined' ? window.location.origin : STORE_CONFIG.siteUrl)
  ).replace(/\/+$/, '');

  const raw = (canonicalPath || '').trim();
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const parsed = new globalThis.URL(raw);
      const clean = normalizePathAndQuery(`${parsed.pathname}${parsed.search}`);
      return `${parsed.origin}${clean}`;
    } catch {
      return origin ? `${origin}/` : raw;
    }
  }

  if (raw) {
    const clean = normalizePathAndQuery(raw);
    return origin ? `${origin}${clean}` : clean;
  }

  const href =
    runtimeHref ?? (typeof window !== 'undefined' ? window.location.href : '');
  if (href) {
    try {
      const parsed = new globalThis.URL(href);
      const clean = normalizePathAndQuery(parsed.pathname);
      return `${parsed.origin}${clean}`;
    } catch {
      return origin ? `${origin}/` : '/';
    }
  }

  return origin ? `${origin}/` : '/';
}

export function resolveAbsoluteImageUrl(image?: string, runtimeOrigin?: string): string {
  const origin = (
    runtimeOrigin ??
    (typeof window !== 'undefined' ? window.location.origin : STORE_CONFIG.siteUrl)
  ).replace(/\/+$/, '');

  const candidate = (image || '').trim() || DEFAULT_OG_IMAGE_PATH;
  if (candidate.startsWith('http://') || candidate.startsWith('https://')) {
    return candidate;
  }
  const normalizedPath = candidate.startsWith('/') ? candidate : `/${candidate}`;
  return origin ? `${origin}${normalizedPath}` : normalizedPath;
}

export function formatSlugAsTitle(slug: string): string {
  const cleaned = sanitizePlainText(slug || '', 120)
    .replace(/[^a-zA-Z0-9-]+/g, ' ')
    .trim();
  if (!cleaned) return 'Product';
  return cleaned
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function deriveProductSku(product: Pick<Product, 'id' | 'slug'>): string {
  const raw = (product.id || product.slug || 'ITEM')
    .replace(/[^a-zA-Z0-9-]+/g, '')
    .toUpperCase();
  return raw.startsWith('CA-') ? raw : `CA-${raw}`;
}

export function buildOrganizationJsonLd(origin: string): Record<string, unknown> {
  const cleanOrigin = origin.replace(/\/+$/, '') || STORE_CONFIG.siteUrl;
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: STORE_CONFIG.brandName,
    alternateName: STORE_CONFIG.alternateName,
    url: cleanOrigin,
    logo: resolveAbsoluteImageUrl(DEFAULT_OG_IMAGE_PATH, cleanOrigin),
    email: STORE_CONFIG.email,
    telephone: STORE_CONFIG.phoneE164,
    address: {
      '@type': 'PostalAddress',
      streetAddress: STORE_CONFIG.address.streetAddress,
      addressLocality: STORE_CONFIG.address.locality,
      addressRegion: STORE_CONFIG.address.region,
      postalCode: STORE_CONFIG.address.postalCode,
      addressCountry: STORE_CONFIG.address.countryCode,
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        telephone: STORE_CONFIG.phoneE164,
        email: STORE_CONFIG.email,
        availableLanguage: ['English', 'Urdu'],
        areaServed: 'PK',
      },
    ],
    sameAs: [STORE_CONFIG.whatsappUrl],
  };
}

export function buildWebSiteJsonLd(origin: string, locale: Locale = 'en'): Record<string, unknown> {
  const cleanOrigin = origin.replace(/\/+$/, '') || STORE_CONFIG.siteUrl;
  const shopTarget = localizePath('/shop', locale);
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: STORE_CONFIG.brandName,
    url: cleanOrigin,
    inLanguage: locale === 'ur' ? 'ur-PK' : 'en-PK',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${cleanOrigin}${shopTarget}?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildLocalBusinessJsonLd(origin: string): Record<string, unknown> {
  const cleanOrigin = origin.replace(/\/+$/, '') || STORE_CONFIG.siteUrl;
  return {
    '@context': 'https://schema.org',
    '@type': ['ClothingStore', 'LocalBusiness'],
    name: STORE_CONFIG.brandName,
    url: `${cleanOrigin}/contact`,
    image: resolveAbsoluteImageUrl(DEFAULT_OG_IMAGE_PATH, cleanOrigin),
    telephone: STORE_CONFIG.phoneE164,
    email: STORE_CONFIG.email,
    priceRange: STORE_CONFIG.priceRange,
    currenciesAccepted: STORE_CONFIG.currency,
    paymentAccepted: 'Cash on Delivery, PKR Monthly Installments',
    hasMap: STORE_CONFIG.mapUrl,
    address: {
      '@type': 'PostalAddress',
      streetAddress: STORE_CONFIG.address.streetAddress,
      addressLocality: STORE_CONFIG.address.locality,
      addressRegion: STORE_CONFIG.address.region,
      postalCode: STORE_CONFIG.address.postalCode,
      addressCountry: STORE_CONFIG.address.countryCode,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: STORE_CONFIG.openingHours.days,
        opens: STORE_CONFIG.openingHours.opens,
        closes: STORE_CONFIG.openingHours.closes,
      },
    ],
  };
}

export function buildBreadcrumbJsonLd(
  items: BreadcrumbItem[],
  origin: string
): Record<string, unknown> {
  const cleanOrigin = origin.replace(/\/+$/, '') || STORE_CONFIG.siteUrl;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: resolveCanonicalUrl(item.path, cleanOrigin),
    })),
  };
}

export function buildFaqPageJsonLd(locale: Locale = 'en'): Record<string, unknown> {
  const dict = getDictionary(locale);
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: locale === 'ur' ? 'ur-PK' : 'en-PK',
    mainEntity: dict.faq.items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export function buildProductSeoConfig(
  product: Product,
  runtimeOrigin?: string,
  locale: Locale = 'en'
): SeoHeadConfig {
  const origin = (
    runtimeOrigin ??
    (typeof window !== 'undefined' ? window.location.origin : STORE_CONFIG.siteUrl)
  ).replace(/\/+$/, '');

  const canonicalPath = localizePath(`/product/${product.slug}`, locale);
  const canonicalUrl = resolveCanonicalUrl(canonicalPath, origin);
  const allImages = [product.coverImage, ...(product.extraImages || [])]
    .filter(Boolean)
    .map((img) => resolveAbsoluteImageUrl(img, origin));
  const sku = deriveProductSku(product);

  const fallbackDesc =
    locale === 'ur'
      ? `${product.title} (${formatPKR(product.price)}) سنیماٹک آرٹس پشاور سے آرڈر کریں۔ کیش آن ڈیلیوری اور اقساط دستیاب۔`
      : `Buy ${product.title} (${formatPKR(product.price)}) at Cinematic Arts. Nationwide COD & PKR installments.`;
  const description = normalizeMetaDescription(product.description, fallbackDesc, MAX_DESCRIPTION_LENGTH);
  const title = normalizeMetaTitle(`${product.title} — CA`, MAX_TITLE_LENGTH);
  const categorySlug = product.categoryId.replace(/^cat-/i, '');

  const breadcrumbs: BreadcrumbItem[] = [
    { name: locale === 'ur' ? 'ہوم' : 'Home', path: localizePath('/', locale) },
    { name: locale === 'ur' ? 'دکان' : 'Shop', path: localizePath('/shop', locale) },
    {
      name: product.categoryName,
      path: localizePath(`/category/${categorySlug}`, locale),
    },
    { name: product.title, path: canonicalPath },
  ];

  // Note: Strictly omit aggregateRating / review until verified customer reviews exist in Supabase.
  const jsonLd: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      description,
      sku,
      category: product.categoryName,
      image: allImages,
      brand: { '@type': 'Brand', name: SITE_NAME },
      offers: {
        '@type': 'Offer',
        priceCurrency: 'PKR',
        price: product.price,
        availability: product.inStock
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        url: canonicalUrl,
        seller: {
          '@type': 'Organization',
          name: SITE_NAME,
        },
      },
    },
    buildBreadcrumbJsonLd(breadcrumbs, origin),
  ];

  return {
    title,
    description,
    canonicalPath,
    image: product.coverImage,
    type: 'product',
    noIndex: false,
    locale,
    productMeta: {
      priceAmount: product.price,
      priceCurrency: 'PKR',
      availability: product.inStock ? 'in stock' : 'out of stock',
      brand: SITE_NAME,
      category: product.categoryName,
      sku,
    },
    jsonLd,
  };
}

export function buildCategorySeoConfig(
  category: Category,
  runtimeOrigin?: string,
  locale: Locale = 'en'
): SeoHeadConfig {
  const origin = (
    runtimeOrigin ??
    (typeof window !== 'undefined' ? window.location.origin : STORE_CONFIG.siteUrl)
  ).replace(/\/+$/, '');
  const dict = getDictionary(locale);
  const canonicalPath = localizePath(`/category/${category.slug}`, locale);
  const title =
    locale === 'ur'
      ? normalizeMetaTitle(`${category.name} — ${dict.brand}`)
      : normalizeMetaTitle(`${category.name} in Pakistan — ${STORE_CONFIG.shortName}`);
  const intro = dict.category.intros[category.slug] || category.description || dict.category.fallbackIntro(category.name);
  const description = normalizeMetaDescription(intro);

  const breadcrumbs: BreadcrumbItem[] = [
    { name: dict.nav.home, path: localizePath('/', locale) },
    { name: dict.nav.shop, path: localizePath('/shop', locale) },
    { name: category.name, path: canonicalPath },
  ];

  return {
    title,
    description,
    canonicalPath,
    image: category.image,
    type: 'website',
    noIndex: false,
    locale,
    jsonLd: [
      buildOrganizationJsonLd(origin),
      buildBreadcrumbJsonLd(breadcrumbs, origin),
    ],
  };
}

export function getRouteSeoConfig(
  pathname: string,
  search = '',
  runtimeOrigin?: string
): SeoHeadConfig {
  const locale = getLocaleFromPath(pathname);
  const basePath = normalizePathAndQuery(stripLocalePrefix(pathname)).split('?')[0];
  const params = new globalThis.URLSearchParams(search.startsWith('?') ? search : `?${search}`);
  const origin = (runtimeOrigin || STORE_CONFIG.siteUrl).replace(/\/+$/, '');
  const dict = getDictionary(locale);

  if (basePath === '/') {
    return {
      title:
        locale === 'ur'
          ? normalizeMetaTitle('سنیماٹک آرٹس — ملبوسات، ان سٹچڈ سوٹ اور اقساط')
          : normalizeMetaTitle('Cinematic Arts (CA) — Clothing & PKR Installments'),
      description:
        locale === 'ur'
          ? normalizeMetaDescription(DEFAULT_HOME_DESCRIPTION_UR, DEFAULT_HOME_DESCRIPTION_UR)
          : normalizeMetaDescription(DEFAULT_HOME_DESCRIPTION_EN),
      canonicalPath: localizePath('/', locale),
      type: 'website',
      noIndex: false,
      locale,
      jsonLd: [
        buildOrganizationJsonLd(origin),
        buildWebSiteJsonLd(origin, locale),
        buildLocalBusinessJsonLd(origin),
        buildFaqPageJsonLd(locale),
      ],
    };
  }

  if (basePath === '/shop') {
    const rawCat = sanitizePlainText(params.get('category') || '', 60);
    const hasCategory = Boolean(rawCat && rawCat.toLowerCase() !== 'all');
    const catLabel = hasCategory ? formatSlugAsTitle(rawCat.replace(/^cat-/i, '')) : '';
    return {
      title: hasCategory
        ? normalizeMetaTitle(`${catLabel} — ${STORE_CONFIG.shortName}`)
        : locale === 'ur'
        ? normalizeMetaTitle(`مکمل کلیکشن — ${dict.brand}`)
        : normalizeMetaTitle('Shop Clothing & Accessories in PKR — Cinematic Arts'),
      description: hasCategory
        ? normalizeMetaDescription(
            `Browse ${catLabel} from ${SITE_NAME} in Peshawar. Available in PKR with Cash on Delivery and monthly installments.`
          )
        : locale === 'ur'
        ? normalizeMetaDescription(
            'خواتین کے ان سٹچڈ سوٹ، لڑکوں کی ٹراؤزر، جیکٹس، ہڈیز، شرٹس اور لوازمات PKR میں خریدیں۔'
          )
        : normalizeMetaDescription(
            "Browse women's unstitched clothes, boys' trousers, jackets, hoodies, shirts, t-shirts & accessories in PKR."
          ),
      canonicalPath: localizePath(
        hasCategory ? `/shop?category=${encodeURIComponent(rawCat)}` : '/shop',
        locale
      ),
      type: 'website',
      noIndex: false,
      locale,
      jsonLd: [
        buildOrganizationJsonLd(origin),
        buildBreadcrumbJsonLd(
          [
            { name: dict.nav.home, path: localizePath('/', locale) },
            { name: dict.nav.shop, path: localizePath('/shop', locale) },
          ],
          origin
        ),
      ],
    };
  }

  if (basePath.startsWith('/category/')) {
    const slug = basePath.slice('/category/'.length).split('/')[0] || '';
    const readableName = formatSlugAsTitle(slug);
    const canonicalPath = localizePath(slug ? `/category/${slug}` : '/shop', locale);
    return {
      title: normalizeMetaTitle(`${readableName} — ${STORE_CONFIG.shortName}`),
      description: normalizeMetaDescription(
        dict.category.intros[slug] || dict.category.fallbackIntro(readableName)
      ),
      canonicalPath,
      type: 'website',
      noIndex: !slug,
      locale,
      jsonLd: [
        buildBreadcrumbJsonLd(
          [
            { name: dict.nav.home, path: localizePath('/', locale) },
            { name: dict.nav.shop, path: localizePath('/shop', locale) },
            { name: readableName, path: canonicalPath },
          ],
          origin
        ),
      ],
    };
  }

  if (basePath.startsWith('/product/')) {
    const slug = basePath.slice('/product/'.length).split('/')[0] || '';
    const readableName = formatSlugAsTitle(slug);
    return {
      title: normalizeMetaTitle(`${readableName} — CA`),
      description: normalizeMetaDescription(
        `View ${readableName} from ${SITE_NAME} in Peshawar, Pakistan. Order in PKR via Cash on Delivery or monthly installments.`
      ),
      canonicalPath: localizePath(slug ? `/product/${slug}` : '/shop', locale),
      type: 'product',
      noIndex: !slug,
      locale,
    };
  }

  if (basePath === '/about') {
    return {
      title:
        locale === 'ur'
          ? normalizeMetaTitle(`ہمارے بارے میں — ${dict.brand}`)
          : normalizeMetaTitle('About Cinematic Arts (CA) — Peshawar Clothing Store'),
      description: normalizeMetaDescription(dict.about.lead),
      canonicalPath: localizePath('/about', locale),
      type: 'website',
      noIndex: false,
      locale,
      jsonLd: [
        buildOrganizationJsonLd(origin),
        buildBreadcrumbJsonLd(
          [
            { name: dict.nav.home, path: localizePath('/', locale) },
            { name: dict.nav.about, path: localizePath('/about', locale) },
          ],
          origin
        ),
      ],
    };
  }

  if (basePath === '/faq') {
    return {
      title:
        locale === 'ur'
          ? normalizeMetaTitle(`اقساط اور آرڈرز سوالات — ${dict.brand}`)
          : normalizeMetaTitle('Installment & COD FAQ — Cinematic Arts (CA)'),
      description: normalizeMetaDescription(dict.faq.intro),
      canonicalPath: localizePath('/faq', locale),
      type: 'website',
      noIndex: false,
      locale,
      jsonLd: [
        buildFaqPageJsonLd(locale),
        buildBreadcrumbJsonLd(
          [
            { name: dict.nav.home, path: localizePath('/', locale) },
            { name: dict.nav.faq, path: localizePath('/faq', locale) },
          ],
          origin
        ),
      ],
    };
  }

  if (basePath === '/size-guide') {
    return {
      title:
        locale === 'ur'
          ? normalizeMetaTitle(`سائز گائیڈ — ${dict.brand}`)
          : normalizeMetaTitle('Clothing Size Guide — Cinematic Arts (CA)'),
      description: normalizeMetaDescription(dict.sizeGuide.intro),
      canonicalPath: localizePath('/size-guide', locale),
      type: 'website',
      noIndex: false,
      locale,
      jsonLd: [
        buildBreadcrumbJsonLd(
          [
            { name: dict.nav.home, path: localizePath('/', locale) },
            { name: dict.nav.sizeGuide, path: localizePath('/size-guide', locale) },
          ],
          origin
        ),
      ],
    };
  }

  if (basePath === '/shipping') {
    return {
      title:
        locale === 'ur'
          ? normalizeMetaTitle(`ڈیلیوری اور واپسی — ${dict.brand}`)
          : normalizeMetaTitle('Shipping, COD & 7-Day Returns — Cinematic Arts'),
      description: normalizeMetaDescription(dict.shipping.intro),
      canonicalPath: localizePath('/shipping', locale),
      type: 'website',
      noIndex: false,
      locale,
      jsonLd: [
        buildBreadcrumbJsonLd(
          [
            { name: dict.nav.home, path: localizePath('/', locale) },
            { name: dict.nav.shipping, path: localizePath('/shipping', locale) },
          ],
          origin
        ),
      ],
    };
  }

  if (basePath === '/contact') {
    return {
      title:
        locale === 'ur'
          ? normalizeMetaTitle(`رابطہ اور پتہ — ${dict.brand}`)
          : normalizeMetaTitle('Contact Store & WhatsApp — Cinematic Arts Peshawar'),
      description: normalizeMetaDescription(dict.contact.intro),
      canonicalPath: localizePath('/contact', locale),
      type: 'website',
      noIndex: false,
      locale,
      jsonLd: [
        buildLocalBusinessJsonLd(origin),
        buildBreadcrumbJsonLd(
          [
            { name: dict.nav.home, path: localizePath('/', locale) },
            { name: dict.nav.contact, path: localizePath('/contact', locale) },
          ],
          origin
        ),
      ],
    };
  }

  if (basePath === '/terms') {
    return {
      title:
        locale === 'ur'
          ? normalizeMetaTitle(`شرائط و اقساط پالیسی — ${dict.brand}`)
          : normalizeMetaTitle('Terms & Installment Policy — Cinematic Arts (CA)'),
      description: normalizeMetaDescription(
        'Read Cinematic Arts terms of service, 7-day exchanges, PKR installment financing rules, and 10% seller referral commission.'
      ),
      canonicalPath: localizePath('/terms', locale),
      type: 'website',
      noIndex: false,
      locale,
    };
  }

  if (basePath === '/privacy') {
    return {
      title:
        locale === 'ur'
          ? normalizeMetaTitle(`پرائیویسی پالیسی — ${dict.brand}`)
          : normalizeMetaTitle('Privacy Policy & Data Usage — Cinematic Arts (CA)'),
      description: normalizeMetaDescription(
        'How Cinematic Arts handles customer delivery details, seller verification records, and account deletion rights.'
      ),
      canonicalPath: localizePath('/privacy', locale),
      type: 'website',
      noIndex: false,
      locale,
    };
  }

  if (
    basePath === '/orders' ||
    basePath === '/cart' ||
    basePath === '/checkout' ||
    basePath === '/order-confirmed'
  ) {
    return {
      title: normalizeMetaTitle(
        basePath === '/order-confirmed'
          ? `Order Confirmed — ${STORE_CONFIG.shortName}`
          : `Bag & My Orders — ${STORE_CONFIG.shortName}`
      ),
      description: normalizeMetaDescription(
        basePath === '/order-confirmed'
          ? 'Your Cinematic Arts order confirmation and reference ID.'
          : 'Manage your shopping bag, track live order status, and inspect monthly PKR installment schedules.'
      ),
      canonicalPath: basePath,
      type: 'website',
      noIndex: true,
      locale,
    };
  }

  if (basePath === '/profile') {
    return {
      title: normalizeMetaTitle(`Profile & Seller Dashboard — ${STORE_CONFIG.shortName}`),
      description: normalizeMetaDescription(
        'Manage your Cinematic Arts profile, notifications, referral seller earnings, and support messages.'
      ),
      canonicalPath: '/profile',
      type: 'website',
      noIndex: true,
      locale,
    };
  }

  if (basePath === '/auth') {
    return {
      title: normalizeMetaTitle(`Sign In or Join — ${STORE_CONFIG.shortName}`),
      description: normalizeMetaDescription(
        'Sign in to track orders or register as a Cinematic Arts Customer or Verified Seller.'
      ),
      canonicalPath: '/auth',
      type: 'website',
      noIndex: true,
      locale,
    };
  }

  if (basePath === '/admin') {
    return {
      title: normalizeMetaTitle(`Admin Portal — ${STORE_CONFIG.shortName}`),
      description: normalizeMetaDescription(
        'Administration console for Cinematic Arts orders, catalog, analytics, and installment plans.'
      ),
      canonicalPath: '/admin',
      type: 'website',
      noIndex: true,
      locale,
    };
  }

  if (basePath === '/status') {
    return {
      title: normalizeMetaTitle(`Status — ${STORE_CONFIG.shortName}`),
      description: normalizeMetaDescription(
        'Backend mode and Supabase connectivity diagnostics.'
      ),
      canonicalPath: '/status',
      type: 'website',
      noIndex: true,
      locale,
    };
  }

  return {
    title: normalizeMetaTitle(`404 Page Not Found — ${STORE_CONFIG.shortName}`),
    description: normalizeMetaDescription(`The requested page could not be found on ${SITE_NAME}.`),
    canonicalPath: pathname || '/404',
    type: 'website',
    noIndex: true,
    locale,
  };
}

function upsertMetaTag(
  doc: HeadDocumentLike,
  attr: 'name' | 'property',
  key: string,
  content: string
): void {
  let el = doc.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = doc.createElement('meta');
    el.setAttribute(attr, key);
    doc.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function removeMetaTag(doc: HeadDocumentLike, attr: 'name' | 'property', key: string): void {
  const matches = Array.from(doc.head.querySelectorAll(`meta[${attr}="${key}"]`));
  matches.forEach((node) => node.remove());
}

function upsertCanonicalLink(doc: HeadDocumentLike, canonicalUrl: string): void {
  const existing = Array.from(doc.head.querySelectorAll('link[rel="canonical"]'));
  if (existing.length === 0) {
    const link = doc.createElement('link');
    link.setAttribute('rel', 'canonical');
    link.setAttribute('href', canonicalUrl);
    doc.head.appendChild(link);
    return;
  }
  const [primary, ...duplicates] = existing;
  primary.setAttribute('href', canonicalUrl);
  duplicates.forEach((dup) => dup.remove());
}

function syncHreflangLinks(
  doc: HeadDocumentLike,
  canonicalPath: string,
  noIndex: boolean,
  runtimeOrigin?: string
): void {
  Array.from(doc.head.querySelectorAll('link[rel="alternate"][hreflang]')).forEach((n) =>
    n.remove()
  );
  if (noIndex) return;

  const qIdx = canonicalPath.indexOf('?');
  const pathOnly = qIdx === -1 ? canonicalPath : canonicalPath.slice(0, qIdx);
  const query = qIdx === -1 ? '' : canonicalPath.slice(qIdx);
  const alternates = getAlternateLocalePaths(pathOnly, query);

  const pairs: Array<{ hreflang: string; path: string }> = [
    { hreflang: 'en', path: alternates.en },
    { hreflang: 'ur', path: alternates.ur },
    { hreflang: 'x-default', path: alternates.xDefault },
  ];

  for (const pair of pairs) {
    const link = doc.createElement('link');
    link.setAttribute('rel', 'alternate');
    link.setAttribute('hreflang', pair.hreflang);
    link.setAttribute('href', resolveCanonicalUrl(pair.path, runtimeOrigin));
    doc.head.appendChild(link);
  }
}

const PRODUCT_OG_META_KEYS = [
  'product:price:amount',
  'product:price:currency',
  'product:availability',
  'product:brand',
  'product:category',
] as const;

export function updateDocumentHead(
  config: SeoHeadConfig,
  doc: HeadDocumentLike | undefined = typeof document !== 'undefined'
    ? (document as unknown as HeadDocumentLike)
    : undefined,
  runtimeOrigin?: string,
  runtimeHref?: string
): SeoHeadConfig {
  const locale = config.locale || getLocaleFromPath(config.canonicalPath || '/');
  const normalizedTitle = normalizeMetaTitle(config.title, MAX_TITLE_LENGTH);
  const normalizedDescription = normalizeMetaDescription(
    config.description,
    locale === 'ur' ? DEFAULT_HOME_DESCRIPTION_UR : DEFAULT_HOME_DESCRIPTION_EN,
    MAX_DESCRIPTION_LENGTH
  );
  const canonicalUrl = resolveCanonicalUrl(config.canonicalPath, runtimeOrigin, runtimeHref);
  const imageUrl = resolveAbsoluteImageUrl(config.image, runtimeOrigin);
  const ogType = config.type ?? 'website';
  const robotsValue = config.noIndex ? 'noindex,nofollow' : 'index,follow';

  const normalizedConfig: SeoHeadConfig = {
    ...config,
    locale,
    title: normalizedTitle,
    description: normalizedDescription,
    type: ogType,
  };

  if (!doc || !doc.head) {
    return normalizedConfig;
  }

  if (doc.documentElement) {
    const dir = locale === 'ur' ? 'rtl' : 'ltr';
    doc.documentElement.lang = locale;
    doc.documentElement.dir = dir;
    doc.documentElement.setAttribute?.('lang', locale);
    doc.documentElement.setAttribute?.('dir', dir);
  }

  doc.title = normalizedTitle;

  upsertMetaTag(doc, 'name', 'robots', robotsValue);
  upsertMetaTag(doc, 'name', 'description', normalizedDescription);

  if (STORE_CONFIG.verification.google) {
    upsertMetaTag(doc, 'name', 'google-site-verification', STORE_CONFIG.verification.google);
  }
  if (STORE_CONFIG.verification.bing) {
    upsertMetaTag(doc, 'name', 'msvalidate.01', STORE_CONFIG.verification.bing);
  }

  upsertMetaTag(doc, 'property', 'og:site_name', SITE_NAME);
  upsertMetaTag(doc, 'property', 'og:locale', locale === 'ur' ? 'ur_PK' : 'en_PK');
  upsertMetaTag(
    doc,
    'property',
    'og:locale:alternate',
    locale === 'ur' ? 'en_PK' : 'ur_PK'
  );
  upsertMetaTag(doc, 'property', 'og:title', normalizedTitle);
  upsertMetaTag(doc, 'property', 'og:description', normalizedDescription);
  upsertMetaTag(doc, 'property', 'og:type', ogType);
  upsertMetaTag(doc, 'property', 'og:url', canonicalUrl);
  upsertMetaTag(doc, 'property', 'og:image', imageUrl);

  upsertMetaTag(doc, 'name', 'twitter:card', 'summary_large_image');
  upsertMetaTag(doc, 'name', 'twitter:title', normalizedTitle);
  upsertMetaTag(doc, 'name', 'twitter:description', normalizedDescription);
  upsertMetaTag(doc, 'name', 'twitter:image', imageUrl);

  if (ogType === 'product' && config.productMeta) {
    upsertMetaTag(doc, 'property', 'product:price:amount', String(config.productMeta.priceAmount));
    upsertMetaTag(
      doc,
      'property',
      'product:price:currency',
      config.productMeta.priceCurrency || 'PKR'
    );
    if (config.productMeta.availability) {
      upsertMetaTag(doc, 'property', 'product:availability', config.productMeta.availability);
    } else {
      removeMetaTag(doc, 'property', 'product:availability');
    }
    if (config.productMeta.brand) {
      upsertMetaTag(doc, 'property', 'product:brand', config.productMeta.brand);
    } else {
      removeMetaTag(doc, 'property', 'product:brand');
    }
    if (config.productMeta.category) {
      upsertMetaTag(doc, 'property', 'product:category', config.productMeta.category);
    } else {
      removeMetaTag(doc, 'property', 'product:category');
    }
  } else {
    PRODUCT_OG_META_KEYS.forEach((key) => removeMetaTag(doc, 'property', key));
  }

  upsertCanonicalLink(doc, canonicalUrl);
  syncHreflangLinks(doc, config.canonicalPath || '/', Boolean(config.noIndex), runtimeOrigin);

  Array.from(doc.head.querySelectorAll('script[data-ca-seo="true"]')).forEach((node) =>
    node.remove()
  );
  if (config.jsonLd) {
    const schemas = Array.isArray(config.jsonLd) ? config.jsonLd : [config.jsonLd];
    schemas.forEach((schema) => {
      const script = doc.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('data-ca-seo', 'true');
      script.textContent = JSON.stringify(schema);
      doc.head.appendChild(script);
    });
  }

  return normalizedConfig;
}

export function applyRouteSeoTransition(
  pathname: string,
  search = '',
  doc?: HeadDocumentLike,
  runtimeOrigin?: string,
  runtimeHref?: string
): SeoHeadConfig {
  const routeConfig = getRouteSeoConfig(pathname, search, runtimeOrigin);
  return updateDocumentHead(routeConfig, doc, runtimeOrigin, runtimeHref);
}

function escapeHtmlAttr(val: string): string {
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlText(val: string): string {
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderHeadTagsHtml(config: SeoHeadConfig, runtimeOrigin?: string): string {
  const origin = (runtimeOrigin || STORE_CONFIG.siteUrl).replace(/\/+$/, '');
  const locale = config.locale || getLocaleFromPath(config.canonicalPath || '/');
  const title = normalizeMetaTitle(config.title, MAX_TITLE_LENGTH);
  const description = normalizeMetaDescription(
    config.description,
    locale === 'ur' ? DEFAULT_HOME_DESCRIPTION_UR : DEFAULT_HOME_DESCRIPTION_EN,
    MAX_DESCRIPTION_LENGTH
  );
  const canonicalUrl = resolveCanonicalUrl(config.canonicalPath, origin);
  const imageUrl = resolveAbsoluteImageUrl(config.image, origin);
  const ogType = config.type ?? 'website';
  const robotsValue = config.noIndex ? 'noindex,nofollow' : 'index,follow';

  const lines: string[] = [
    `<title>${escapeHtmlText(title)}</title>`,
    `<meta name="robots" content="${robotsValue}" />`,
    `<meta name="description" content="${escapeHtmlAttr(description)}" />`,
    `<link rel="canonical" href="${escapeHtmlAttr(canonicalUrl)}" />`,
  ];

  if (STORE_CONFIG.verification.google) {
    lines.push(
      `<meta name="google-site-verification" content="${escapeHtmlAttr(STORE_CONFIG.verification.google)}" />`
    );
  }
  if (STORE_CONFIG.verification.bing) {
    lines.push(
      `<meta name="msvalidate.01" content="${escapeHtmlAttr(STORE_CONFIG.verification.bing)}" />`
    );
  }

  if (!config.noIndex) {
    const rawPath = config.canonicalPath || '/';
    const qIdx = rawPath.indexOf('?');
    const pathOnly = qIdx === -1 ? rawPath : rawPath.slice(0, qIdx);
    const query = qIdx === -1 ? '' : rawPath.slice(qIdx);
    const alternates = getAlternateLocalePaths(pathOnly, query);
    lines.push(
      `<link rel="alternate" hreflang="en" href="${escapeHtmlAttr(resolveCanonicalUrl(alternates.en, origin))}" />`,
      `<link rel="alternate" hreflang="ur" href="${escapeHtmlAttr(resolveCanonicalUrl(alternates.ur, origin))}" />`,
      `<link rel="alternate" hreflang="x-default" href="${escapeHtmlAttr(resolveCanonicalUrl(alternates.xDefault, origin))}" />`
    );
  }

  lines.push(
    `<meta property="og:site_name" content="${escapeHtmlAttr(SITE_NAME)}" />`,
    `<meta property="og:locale" content="${locale === 'ur' ? 'ur_PK' : 'en_PK'}" />`,
    `<meta property="og:locale:alternate" content="${locale === 'ur' ? 'en_PK' : 'ur_PK'}" />`,
    `<meta property="og:title" content="${escapeHtmlAttr(title)}" />`,
    `<meta property="og:description" content="${escapeHtmlAttr(description)}" />`,
    `<meta property="og:type" content="${ogType}" />`,
    `<meta property="og:url" content="${escapeHtmlAttr(canonicalUrl)}" />`,
    `<meta property="og:image" content="${escapeHtmlAttr(imageUrl)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtmlAttr(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtmlAttr(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtmlAttr(imageUrl)}" />`
  );

  if (ogType === 'product' && config.productMeta) {
    lines.push(
      `<meta property="product:price:amount" content="${escapeHtmlAttr(String(config.productMeta.priceAmount))}" />`,
      `<meta property="product:price:currency" content="${escapeHtmlAttr(config.productMeta.priceCurrency || 'PKR')}" />`
    );
    if (config.productMeta.availability) {
      lines.push(
        `<meta property="product:availability" content="${escapeHtmlAttr(config.productMeta.availability)}" />`
      );
    }
    if (config.productMeta.brand) {
      lines.push(
        `<meta property="product:brand" content="${escapeHtmlAttr(config.productMeta.brand)}" />`
      );
    }
    if (config.productMeta.category) {
      lines.push(
        `<meta property="product:category" content="${escapeHtmlAttr(config.productMeta.category)}" />`
      );
    }
  }

  if (config.canonicalPath === '/' || config.canonicalPath === '/ur') {
    lines.push(
      '<link rel="preload" as="image" type="image/avif" href="/src/assets/images/womens_unstitched_suit_1795333234539.avif" />'
    );
  }

  if (locale === 'ur') {
    lines.push(
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;500;600;700&display=swap" />'
    );
  }

  if (STORE_CONFIG.analytics.plausibleDomain) {
    lines.push(
      `<script defer data-domain="${escapeHtmlAttr(STORE_CONFIG.analytics.plausibleDomain)}" src="https://plausible.io/js/script.js"></script>`
    );
  } else if (STORE_CONFIG.analytics.umamiWebsiteId && STORE_CONFIG.analytics.umamiScriptUrl) {
    lines.push(
      `<script defer data-website-id="${escapeHtmlAttr(STORE_CONFIG.analytics.umamiWebsiteId)}" src="${escapeHtmlAttr(STORE_CONFIG.analytics.umamiScriptUrl)}"></script>`
    );
  }

  if (config.jsonLd) {
    const schemas = Array.isArray(config.jsonLd) ? config.jsonLd : [config.jsonLd];
    schemas.forEach((schema) => {
      const safeJson = JSON.stringify(schema).replace(/</g, '\\u003c');
      lines.push(`<script type="application/ld+json" data-ca-seo="true">${safeJson}</script>`);
    });
  }

  return lines.join('\n    ');
}
