import type { Category, Product } from '../api/types';

export interface StoreBusinessConfig {
  brandName: string;
  shortName: string;
  alternateName: string;
  siteUrl: string;
  email: string;
  phoneDisplay: string;
  phoneE164: string;
  whatsappUrl: string;
  address: {
    streetAddress: string;
    locality: string;
    region: string;
    postalCode: string;
    countryCode: string;
    countryName: string;
  };
  openingHours: {
    days: string[];
    opens: string;
    closes: string;
    displayEn: string;
    displayUr: string;
  };
  mapUrl: string;
  priceRange: string;
  currency: 'PKR';
  verification: {
    google: string;
    bing: string;
  };
  analytics: {
    plausibleDomain: string;
    umamiWebsiteId: string;
    umamiScriptUrl: string;
  };
}

function readEnv(key: string): string {
  const metaEnv =
    typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> }).env
      ? (import.meta as unknown as { env: Record<string, string> }).env
      : {};
  const procEnv = typeof process !== 'undefined' && process.env ? process.env : {};
  const val = metaEnv[key] || procEnv[key] || '';
  return String(val).trim();
}

export const STORE_CONFIG: StoreBusinessConfig = {
  brandName: 'Cinematic Arts (CA)',
  shortName: 'Cinematic Arts',
  alternateName: 'CA Store Peshawar',
  siteUrl: (
    readEnv('VITE_SITE_URL') ||
    readEnv('SITE_URL') ||
    readEnv('APP_URL') ||
    'https://cinematicarts.pk'
  ).replace(/\/+$/, ''),
  email: 'masihsam587@gmail.com',
  phoneDisplay: '03355329722',
  phoneE164: '+92-335-5329722',
  whatsappUrl: 'https://wa.me/923355329722',
  // Placeholder local street address & hours — replace with exact storefront location before publishing
  address: {
    streetAddress: 'Shop #14, University Road Market (Update Street Address)',
    locality: 'Peshawar',
    region: 'Khyber Pakhtunkhwa',
    postalCode: '25000',
    countryCode: 'PK',
    countryName: 'Pakistan',
  },
  openingHours: {
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    opens: '11:00',
    closes: '21:00',
    displayEn: 'Mon – Sat, 11:00 AM – 9:00 PM PKT (Placeholder)',
    displayUr: 'پیر تا ہفتہ، صبح 11:00 تا رات 9:00 بجے',
  },
  mapUrl: 'https://maps.google.com/?q=University+Road+Peshawar+Pakistan',
  priceRange: 'PKR 1,500 - PKR 25,000',
  currency: 'PKR',
  verification: {
    google: readEnv('VITE_GSC_VERIFICATION'),
    bing: readEnv('VITE_BING_VERIFICATION'),
  },
  analytics: {
    plausibleDomain: readEnv('VITE_PLAUSIBLE_DOMAIN'),
    umamiWebsiteId: readEnv('VITE_UMAMI_WEBSITE_ID'),
    umamiScriptUrl: readEnv('VITE_UMAMI_SCRIPT_URL'),
  },
};

export const PRIVATE_DISALLOW_PATHS = [
  '/admin',
  '/auth',
  '/profile',
  '/orders',
  '/cart',
  '/checkout',
  '/ur/admin',
  '/ur/auth',
  '/ur/profile',
  '/ur/orders',
  '/ur/cart',
  '/ur/checkout',
  '/api/',
] as const;

export const AI_CRAWLER_AGENTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'Google-Extended',
  'ClaudeBot',
  'anthropic-ai',
  'PerplexityBot',
  'Applebot-Extended',
] as const;

export function isAiCrawlersAllowed(): boolean {
  const raw = readEnv('AI_CRAWLERS_ALLOW') || readEnv('VITE_AI_CRAWLERS_ALLOW');
  if (!raw) return true;
  return raw.toLowerCase() !== 'false' && raw !== '0' && raw.toLowerCase() !== 'no';
}

export function generateRobotsTxt(options?: {
  aiCrawlersAllow?: boolean;
  origin?: string;
}): string {
  const allowAi = options?.aiCrawlersAllow ?? isAiCrawlersAllowed();
  const baseOrigin = (options?.origin || STORE_CONFIG.siteUrl).replace(/\/+$/, '');
  const disallowLines = PRIVATE_DISALLOW_PATHS.map((p) => `Disallow: ${p}`);

  const lines: string[] = [
    '# Cinematic Arts (CA) robots.txt',
    '# Toggle AI_CRAWLERS_ALLOW="false" in environment config to restrict AI bots cleanly.',
    '',
    'User-agent: *',
    'Allow: /',
    ...disallowLines,
    '',
    'User-agent: Googlebot',
    'Allow: /',
    ...disallowLines,
    '',
    'User-agent: Bingbot',
    'Allow: /',
    ...disallowLines,
    '',
    `# AI Crawlers Policy: ${allowAi ? 'ALLOWED (public catalog & FAQ)' : 'BLOCKED'}`,
  ];

  for (const bot of AI_CRAWLER_AGENTS) {
    lines.push(`User-agent: ${bot}`);
    if (allowAi) {
      lines.push('Allow: /');
      lines.push(...disallowLines);
    } else {
      lines.push('Disallow: /');
    }
    lines.push('');
  }

  lines.push(`Sitemap: ${baseOrigin}/sitemap.xml`);
  return `${lines.join('\n')}\n`;
}

export function generateLlmsTxt(options?: {
  origin?: string;
  categories?: Category[];
  products?: Product[];
}): string {
  const baseOrigin = (options?.origin || STORE_CONFIG.siteUrl).replace(/\/+$/, '');
  const categories = options?.categories || [];
  const products = options?.products || [];

  const categoryLines = categories.map(
    (c) => `- ${c.name}: ${baseOrigin}/category/${c.slug}`
  );
  const productLines = products.slice(0, 30).map(
    (p) =>
      `- ${p.title} (PKR ${p.price.toLocaleString('en-PK')}, ${p.inStock ? 'In stock' : 'Out of stock'}): ${baseOrigin}/product/${p.slug}`
  );

  return [
    `# ${STORE_CONFIG.brandName}`,
    '',
    `> Clothing and accessories storefront based in ${STORE_CONFIG.address.locality}, Pakistan, offering women's unstitched suits, boys' trousers, jackets, hoodies, shirts, t-shirts, and everyday accessories in PKR with Cash on Delivery and Seller-Referred Monthly Installment Plans.`,
    '',
    '## Store Details',
    `- Brand Name: ${STORE_CONFIG.brandName}`,
    `- Location: ${STORE_CONFIG.address.locality}, ${STORE_CONFIG.address.region}, ${STORE_CONFIG.address.countryName}`,
    `- Currency: ${STORE_CONFIG.currency} (Pakistani Rupee)`,
    `- Email: ${STORE_CONFIG.email}`,
    `- Phone / WhatsApp: ${STORE_CONFIG.phoneE164} (${STORE_CONFIG.phoneDisplay})`,
    '',
    '## Payment & Shipping Summary',
    '- Cash on Delivery (COD): Available across Pakistan with no referral code required.',
    '- Monthly Installments: 2-month (15% markup), 3-month (25% markup), and 4-month (40% markup) schedules in PKR using a verified Seller Referral ID (CA-XXXXXX).',
    '- Exchanges & Returns: Unworn items and uncut unstitched fabrics may be exchanged within 7 calendar days of delivery.',
    '',
    '## Key Public Pages (English & Urdu RTL)',
    `- Home: ${baseOrigin}/ (Urdu: ${baseOrigin}/ur)`,
    `- Shop Catalog: ${baseOrigin}/shop (Urdu: ${baseOrigin}/ur/shop)`,
    `- About Store: ${baseOrigin}/about (Urdu: ${baseOrigin}/ur/about)`,
    `- Installment FAQ: ${baseOrigin}/faq (Urdu: ${baseOrigin}/ur/faq)`,
    `- Size Guide: ${baseOrigin}/size-guide (Urdu: ${baseOrigin}/ur/size-guide)`,
    `- Shipping & Returns: ${baseOrigin}/shipping (Urdu: ${baseOrigin}/ur/shipping)`,
    `- Contact & Location: ${baseOrigin}/contact (Urdu: ${baseOrigin}/ur/contact)`,
    `- Terms of Service: ${baseOrigin}/terms (Urdu: ${baseOrigin}/ur/terms)`,
    `- Privacy Policy: ${baseOrigin}/privacy (Urdu: ${baseOrigin}/ur/privacy)`,
    ...(categoryLines.length > 0 ? ['', '## Product Categories', ...categoryLines] : []),
    ...(productLines.length > 0 ? ['', '## Active Catalog Items', ...productLines] : []),
    '',
  ].join('\n');
}
