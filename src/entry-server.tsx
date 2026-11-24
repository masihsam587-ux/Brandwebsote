import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { dehydrate, QueryClient, type DehydratedState } from '@tanstack/react-query';
import { AppShell } from './App';
import { getLocaleFromPath, localizePath, stripLocalePrefix, type Locale } from './i18n';
import type { CatalogSnapshot } from './services/catalogSnapshot';
import {
  buildCategorySeoConfig,
  buildProductSeoConfig,
  getRouteSeoConfig,
  renderHeadTagsHtml,
  type SeoHeadConfig,
} from './services/seoService';
import { resolveProductSlugRedirect } from './services/slugRedirects';
import { STORE_CONFIG } from './services/siteConfig';

const KNOWN_STATIC_BASE_PATHS = new Set([
  '/',
  '/shop',
  '/about',
  '/faq',
  '/size-guide',
  '/shipping',
  '/contact',
  '/terms',
  '/privacy',
  '/orders',
  '/cart',
  '/checkout',
  '/order-confirmed',
  '/profile',
  '/auth',
  '/admin',
]);

export interface ServerRenderResult {
  html: string;
  headTagsHtml: string;
  lang: Locale;
  dir: 'ltr' | 'rtl';
  statusCode: number;
  redirectTo?: string;
  dehydratedState: DehydratedState;
  seoConfig: SeoHeadConfig;
}

export function renderRoute(options: {
  url: string;
  snapshot: CatalogSnapshot;
  origin?: string;
}): ServerRenderResult {
  const origin = (options.origin || STORE_CONFIG.siteUrl).replace(/\/+$/, '');
  const parsedUrl = new globalThis.URL(options.url || '/', origin);
  const pathname = parsedUrl.pathname || '/';
  const search = parsedUrl.search || '';
  const locale = getLocaleFromPath(pathname);
  const rawBasePath = stripLocalePrefix(pathname);
  const basePath =
    rawBasePath.length > 1 ? rawBasePath.replace(/\/+$/, '') : rawBasePath;

  const { snapshot } = options;

  // Check product slug redirect registry before rendering
  if (basePath.startsWith('/product/')) {
    const slug = basePath.slice('/product/'.length).split('/')[0] || '';
    const redirected = resolveProductSlugRedirect(slug, snapshot.slugRedirects);
    if (redirected) {
      const targetPath = localizePath(`/product/${redirected}`, locale);
      const seoConfig = getRouteSeoConfig(targetPath, '', origin);
      return {
        html: '',
        headTagsHtml: renderHeadTagsHtml(seoConfig, origin),
        lang: locale,
        dir: locale === 'ur' ? 'rtl' : 'ltr',
        statusCode: 301,
        redirectTo: `${targetPath}${search}`,
        dehydratedState: { mutations: [], queries: [] },
        seoConfig,
      };
    }
  }

  const ssrQueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        retry: false,
      },
    },
  });

  ssrQueryClient.setQueryData(['home', 'catalog'], {
    allProducts: snapshot.products,
    featuredProducts: snapshot.products.slice(0, 6),
    categories: snapshot.categories,
    plans: snapshot.plans,
  });
  ssrQueryClient.setQueryData(['categories'], snapshot.categories);
  ssrQueryClient.setQueryData(
    ['products', { categoryId: 'all', search: '', sort: 'latest' }],
    snapshot.products
  );

  let statusCode = 200;
  let seoConfig = getRouteSeoConfig(pathname, search, origin);

  if (basePath === '/shop') {
    const categoryParam = parsedUrl.searchParams.get('category') || 'all';
    const searchParam = parsedUrl.searchParams.get('q') || '';
    if (categoryParam !== 'all' || searchParam) {
      const qLower = searchParam.trim().toLowerCase();
      const filtered = snapshot.products.filter((p) => {
        const matchCat =
          categoryParam === 'all' ||
          p.categoryId === categoryParam ||
          p.categoryId === `cat-${categoryParam}`;
        const matchSearch =
          !qLower ||
          p.title.toLowerCase().includes(qLower) ||
          p.description.toLowerCase().includes(qLower) ||
          p.categoryName.toLowerCase().includes(qLower);
        return matchCat && matchSearch;
      });
      ssrQueryClient.setQueryData(
        ['products', { categoryId: categoryParam, search: searchParam, sort: 'latest' }],
        filtered
      );
    }
  } else if (basePath.startsWith('/category/')) {
    const slug = basePath.slice('/category/'.length).split('/')[0] || '';
    const clean = slug.toLowerCase();
    const matchedCategory =
      snapshot.categories.find(
        (c) =>
          c.slug.toLowerCase() === clean ||
          c.id.toLowerCase() === clean ||
          c.id.toLowerCase() === `cat-${clean}`
      ) || null;

    ssrQueryClient.setQueryData(['category', slug], {
      categories: snapshot.categories,
      allProducts: snapshot.products,
    });

    if (matchedCategory) {
      seoConfig = buildCategorySeoConfig(matchedCategory, origin, locale);
    } else {
      statusCode = 404;
      seoConfig = {
        ...seoConfig,
        noIndex: true,
      };
    }
  } else if (basePath.startsWith('/product/')) {
    const slug = basePath.slice('/product/'.length).split('/')[0] || '';
    const clean = slug.toLowerCase();
    const matchedProduct =
      snapshot.products.find((p) => p.slug.toLowerCase() === clean) || null;

    ssrQueryClient.setQueryData(['product', slug], {
      product: matchedProduct,
      plans: snapshot.plans,
      catalog: snapshot.products.slice(0, 12),
    });

    if (matchedProduct) {
      seoConfig = buildProductSeoConfig(matchedProduct, origin, locale);
    } else {
      statusCode = 404;
      seoConfig = {
        ...seoConfig,
        noIndex: true,
      };
    }
  } else if (!KNOWN_STATIC_BASE_PATHS.has(basePath)) {
    statusCode = 404;
    seoConfig = {
      ...seoConfig,
      noIndex: true,
    };
  }

  const LAZY_PRIVATE_ROUTES = new Set(['/orders', '/profile', '/auth', '/admin']);
  const locationPath = `${pathname}${search}`;
  const html = LAZY_PRIVATE_ROUTES.has(basePath)
    ? ''
    : renderToString(
        <StaticRouter location={locationPath}>
          <AppShell queryClient={ssrQueryClient} />
        </StaticRouter>
      );

  const dehydratedState = dehydrate(ssrQueryClient);
  ssrQueryClient.clear();

  return {
    html,
    headTagsHtml: renderHeadTagsHtml(seoConfig, origin),
    lang: locale,
    dir: locale === 'ur' ? 'rtl' : 'ltr',
    statusCode,
    dehydratedState,
    seoConfig,
  };
}
