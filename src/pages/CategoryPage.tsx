import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productService } from '../api';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { ProductCard } from '../components/ProductCard';
import { SeoHead } from '../components/SeoHead';
import { FriendlyErrorState, ProductGridSkeleton } from '../components/Skeletons';
import { useLocale } from '../i18n';
import { buildCategorySeoConfig, formatSlugAsTitle } from '../services/seoService';
import { getRuntimeOrigin } from '../services/siteConfig';
import { urlSlugSchema } from '../utils/validation';

export function CategoryPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { t, locale, localize } = useLocale();
  const slugValid = useMemo(() => urlSlugSchema.safeParse(slug).success, [slug]);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['category', slug],
    enabled: slugValid,
    queryFn: async () => {
      const [categories, allProducts] = await Promise.all([
        productService.listCategories(),
        productService.listProducts({ sort: 'latest' }),
      ]);
      return { categories, allProducts };
    },
  });

  const categories = data?.categories ?? [];
  const allProducts = data?.allProducts ?? [];

  const matchedCategory = useMemo(() => {
    const clean = slug.toLowerCase();
    return (
      categories.find(
        (c) =>
          c.slug.toLowerCase() === clean ||
          c.id.toLowerCase() === clean ||
          c.id.toLowerCase() === `cat-${clean}`
      ) || null
    );
  }, [categories, slug]);

  const filteredProducts = useMemo(() => {
    if (!matchedCategory) return [];
    return allProducts.filter(
      (p) =>
        p.categoryId === matchedCategory.id ||
        p.categoryName.trim().toLowerCase() === matchedCategory.name.trim().toLowerCase()
    );
  }, [allProducts, matchedCategory]);

  const origin = getRuntimeOrigin();

  if (!slugValid || (!isLoading && !error && !matchedCategory)) {
    return (
      <>
        <SeoHead
          title={`Category Not Found — ${t.brand}`}
          description="This product category was not found."
          canonicalPath={localize(`/category/${slug}`)}
          locale={locale}
          noIndex
        />
        <section className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="font-display text-3xl font-semibold text-[var(--ca-text)]">
            {t.notFound.heading}
          </h1>
          <p className="mt-2 text-sm text-[var(--ca-text-muted)]">
            {t.category.emptyDesc}
          </p>
          <Link
            to={localize('/shop')}
            className="btn-press mt-6 inline-flex min-h-[44px] items-center rounded-xl bg-[var(--ca-text)] px-6 py-3 text-sm font-semibold text-[var(--ca-bg)]"
          >
            {t.category.browseAllCta}
          </Link>
        </section>
      </>
    );
  }

  const displayCategory = matchedCategory || {
    id: `cat-${slug}`,
    name: formatSlugAsTitle(slug),
    slug,
    description: t.category.intros[slug] || t.category.fallbackIntro(formatSlugAsTitle(slug)),
    image: '',
  };

  const categorySeo = buildCategorySeoConfig(displayCategory, origin, locale);
  const introText =
    t.category.intros[displayCategory.slug] ||
    displayCategory.description ||
    t.category.fallbackIntro(displayCategory.name);

  return (
    <>
      <SeoHead {...categorySeo} />

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs
          items={[
            { label: t.nav.home, to: localize('/') },
            { label: t.category.breadcrumbShop, to: localize('/shop') },
            { label: displayCategory.name },
          ]}
        />

        <div className="glass-panel rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="font-display text-4xl font-semibold text-[var(--ca-text)] sm:text-5xl">
                {displayCategory.name}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--ca-text-muted)] sm:text-base">
                {introText}
              </p>
              {!isLoading && !error && (
                <p className="mt-2 text-xs font-medium text-[var(--ca-accent)]">
                  {t.category.itemsCountLabel(filteredProducts.length)}
                </p>
              )}
            </div>

            <Link
              to={localize('/size-guide')}
              className="btn-press inline-flex min-h-[44px] shrink-0 items-center rounded-xl bg-[var(--ca-surface-subtle)] px-4 py-2.5 text-xs font-semibold text-[var(--ca-text)] hover:opacity-85"
            >
              {t.category.sizeGuideCta}
            </Link>
          </div>

          {categories.length > 0 && (
            <nav aria-label={t.category.allCategories} className="mt-6 flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={localize(`/category/${cat.slug}`)}
                  className={`btn-press inline-flex min-h-[40px] items-center rounded-[10px] px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    cat.slug === displayCategory.slug
                      ? 'bg-[var(--ca-text)] text-[var(--ca-bg)]'
                      : 'bg-[var(--ca-surface-subtle)] text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]'
                  }`}
                >
                  {cat.name}
                </Link>
              ))}
            </nav>
          )}
        </div>

        <div className="mt-8">
          {isLoading ? (
            <ProductGridSkeleton count={4} />
          ) : error ? (
            <FriendlyErrorState
              title="Could not load category"
              message={error instanceof Error ? error.message : 'Failed to load category items.'}
              onRetry={() => refetch()}
            />
          ) : filteredProducts.length === 0 ? (
            <div className="glass-panel rounded-2xl p-10 text-center">
              <h2 className="font-display text-2xl font-semibold text-[var(--ca-text)]">
                {t.category.emptyTitle}
              </h2>
              <p className="mt-2 text-sm text-[var(--ca-text-muted)]">
                {t.category.emptyDesc}
              </p>
              <Link
                to={localize('/shop')}
                className="btn-press mt-5 inline-flex min-h-[44px] items-center rounded-xl bg-[var(--ca-text)] px-5 py-2.5 text-xs font-semibold text-[var(--ca-bg)]"
              >
                {t.category.browseAllCta}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
