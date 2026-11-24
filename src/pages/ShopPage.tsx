import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calculator, ChevronLeft, ChevronRight, Search, SlidersHorizontal } from 'lucide-react';
import { productService } from '../api';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { ProductCard } from '../components/ProductCard';
import { ProductGridSkeleton, FriendlyErrorState } from '../components/Skeletons';
import { InstallmentCalculator } from '../components/InstallmentCalculator';
import { SeoHead } from '../components/SeoHead';
import { useLocale } from '../i18n';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { buildBreadcrumbJsonLd, buildOrganizationJsonLd } from '../services/seoService';
import { STORE_CONFIG } from '../services/siteConfig';
import { sanitizePlainText } from '../utils/security';

interface ShopPageProps {
  onNetworkError?: (msg: string | null) => void;
}

const PAGE_SIZE = 12;

export function ShopPage({ onNetworkError }: ShopPageProps) {
  const { t, locale, localize } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = sanitizePlainText(searchParams.get('q') || '', 80);
  const initialCat = sanitizePlainText(searchParams.get('category') || 'all', 60) || 'all';

  const [search, setSearch] = useState(initialQuery);
  const [debouncedSearch, setDebouncedSearch] = useState(initialQuery);
  const [categoryId, setCategoryId] = useState(initialCat);
  const [sort, setSort] = useState<'latest' | 'price_asc' | 'price_desc'>('latest');
  const [page, setPage] = useState(1);
  const [showCalculator, setShowCalculator] = useState(false);

  const gridRevealRef = useScrollReveal<HTMLDivElement>();

  // 300ms search debounce to prevent redundant API bursts
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(sanitizePlainText(search, 80));
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productService.listCategories(),
  });

  const {
    data: products = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['products', { categoryId, search: debouncedSearch, sort }],
    queryFn: () =>
      productService.listProducts({
        categoryId,
        search: debouncedSearch,
        sort,
      }),
  });

  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : 'Unable to load products.'
    : null;

  useEffect(() => {
    onNetworkError?.(error);
  }, [error, onNetworkError]);

  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleProducts = useMemo(
    () => products.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [products, safePage]
  );

  const handleCategoryChange = (nextCat: string) => {
    const sanitized = sanitizePlainText(nextCat, 60) || 'all';
    setCategoryId(sanitized);
    setPage(1);
    const next = new URLSearchParams(searchParams);
    if (sanitized === 'all') next.delete('category');
    else next.set('category', sanitized);
    setSearchParams(next, { replace: true });
  };

  const activeCategory = useMemo(
    () => (categoryId !== 'all' ? categories.find((c) => c.id === categoryId) : undefined),
    [categories, categoryId]
  );

  const origin =
    typeof window !== 'undefined' ? window.location.origin : STORE_CONFIG.siteUrl;
  const shopSeoTitle = activeCategory
    ? `${activeCategory.name} — ${t.brand}`
    : locale === 'ur'
    ? `مکمل کلیکشن — ${t.brand}`
    : 'Shop Clothing & Accessories in PKR — Cinematic Arts';
  const shopSeoDescription = activeCategory
    ? t.category.intros[activeCategory.slug] ||
      `Browse ${activeCategory.name} from Cinematic Arts in PKR with Cash on Delivery and monthly installments.`
    : t.hero.subtitle;
  const shopCanonicalPath = localize(
    categoryId !== 'all' ? `/shop?category=${encodeURIComponent(categoryId)}` : '/shop'
  );

  return (
    <>
      <SeoHead
        title={shopSeoTitle}
        description={shopSeoDescription}
        canonicalPath={shopCanonicalPath}
        locale={locale}
        jsonLd={[
          buildOrganizationJsonLd(origin),
          buildBreadcrumbJsonLd(
            [
              { name: t.nav.home, path: localize('/') },
              { name: t.nav.shop, path: localize('/shop') },
            ],
            origin
          ),
        ]}
      />

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs
          items={[
            { label: t.nav.home, to: localize('/') },
            { label: t.nav.shop },
          ]}
        />

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-display text-4xl font-semibold text-[var(--ca-text)]">
              {t.shop.heading}
            </h1>
            <p className="mt-1 text-xs text-[var(--ca-text-muted)]">
              {t.shop.subtitle}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ca-text-muted)]" />
              <input
                type="search"
                maxLength={80}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search products"
                placeholder={t.shop.searchPlaceholder}
                className="w-full rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] py-2.5 pl-10 pr-3.5 text-sm text-[var(--ca-text)] focus:border-[var(--ca-accent)] focus:outline-none"
              />
            </div>

            <div className="inline-flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] px-3 py-2.5 sm:w-auto">
              <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--ca-text-muted)]" />
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as 'latest' | 'price_asc' | 'price_desc');
                  setPage(1);
                }}
                aria-label="Sort products"
                className="bg-transparent text-xs font-medium text-[var(--ca-text)] focus:outline-none"
              >
                <option value="latest">{t.shop.sortLatest}</option>
                <option value="price_asc">{t.shop.sortPriceAsc}</option>
                <option value="price_desc">{t.shop.sortPriceDesc}</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowCalculator((v) => !v)}
              aria-expanded={showCalculator}
              className={`btn-press inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-colors sm:w-auto whitespace-nowrap ${
                showCalculator
                  ? 'border-[var(--ca-accent)] bg-[var(--ca-accent)] text-[var(--ca-accent-fg)]'
                  : 'border-[var(--ca-border)] bg-[var(--ca-surface-solid)] text-[var(--ca-text)] hover:bg-[var(--ca-surface-subtle)]'
              }`}
            >
              <Calculator className="h-3.5 w-3.5" />
              {showCalculator ? t.shop.hideCalc : t.shop.installmentCalc}
            </button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div
          role="tablist"
          aria-label="Product Categories"
          className="mt-6 flex flex-wrap gap-1.5 rounded-xl bg-[var(--ca-surface-subtle)] p-1.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={categoryId === 'all'}
            onClick={() => handleCategoryChange('all')}
            className={`btn-press min-h-[44px] rounded-xl px-4 py-2 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
              categoryId === 'all'
                ? 'bg-[var(--ca-surface-solid)] text-[var(--ca-text)] shadow-sm'
                : 'text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]'
            }`}
          >
            {t.shop.allItems}
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={categoryId === c.id}
              onClick={() => handleCategoryChange(c.id)}
              className={`btn-press min-h-[44px] rounded-xl px-4 py-2 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                categoryId === c.id
                  ? 'bg-[var(--ca-surface-solid)] text-[var(--ca-text)] shadow-sm'
                  : 'text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Crawler-friendly dedicated category links */}
        {categories.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--ca-text-muted)]">
            {categories.map((c) => (
              <Link
                key={c.id}
                to={localize(`/category/${c.slug}`)}
                className="hover:text-[var(--ca-text)] hover:underline"
              >
                {c.name}
              </Link>
            ))}
          </div>
        )}

        {showCalculator && (
          <div className="mt-6">
            <InstallmentCalculator products={products} />
          </div>
        )}

        {/* Product Grid */}
        <div ref={gridRevealRef} className="ca-reveal mt-8">
          {loading ? (
            <ProductGridSkeleton count={6} />
          ) : error ? (
            <FriendlyErrorState
              title="Could not load catalog"
              message={error}
              error={queryError}
              onRetry={() => refetch()}
            />
          ) : products.length === 0 ? (
            <div className="ca-fade-in glass-panel rounded-2xl p-12 text-center">
              <h2 className="font-display text-2xl font-semibold text-[var(--ca-text)]">
                {t.shop.noMatchTitle}
              </h2>
              <p className="mt-2 text-sm text-[var(--ca-text-muted)]">
                {t.shop.noMatchDesc}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setDebouncedSearch('');
                  handleCategoryChange('all');
                }}
                className="btn-press mt-5 min-h-[44px] rounded-xl bg-[var(--ca-surface-subtle)] px-5 py-2 text-xs font-semibold text-[var(--ca-text)] hover:opacity-85"
              >
                {t.shop.resetFilters}
              </button>
            </div>
          ) : (
            <>
              <div className="ca-fade-in grid grid-cols-2 gap-3 sm:gap-6">
                {visibleProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {totalPages > 1 && (
                <nav
                  aria-label="Catalog pagination"
                  className="glass-panel mt-8 flex items-center justify-between rounded-2xl px-4 py-3 text-xs"
                >
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => {
                      setPage((p) => Math.max(1, p - 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="btn-press inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-[var(--ca-border)] px-3 py-1.5 font-semibold disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    {t.shop.previous}
                  </button>

                  <span className="font-mono-nums text-[var(--ca-text-muted)]">
                    Page <strong className="text-[var(--ca-text)]">{safePage}</strong> of {totalPages} ({products.length} items)
                  </span>

                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => {
                      setPage((p) => Math.min(totalPages, p + 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="btn-press inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-[var(--ca-border)] px-3 py-1.5 font-semibold disabled:opacity-40"
                  >
                    {t.shop.next}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
