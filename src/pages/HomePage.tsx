import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Mail, Phone, MessageCircle, Sun, Moon, ShieldCheck, Truck, CreditCard } from 'lucide-react';
import { productService } from '../api';
import { ProductCard, ResilientImage } from '../components/ProductCard';
import { ProductGridSkeleton, FriendlyErrorState } from '../components/Skeletons';
import { InstallmentCalculator } from '../components/InstallmentCalculator';
import { SeoHead } from '../components/SeoHead';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../i18n';
import { useScrollReveal } from '../hooks/useScrollReveal';
import {
  buildFaqPageJsonLd,
  buildLocalBusinessJsonLd,
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
} from '../services/seoService';
import { STORE_CONFIG } from '../services/siteConfig';
import { deriveActiveCategoryCards } from '../utils/catalogCategories';

interface HomePageProps {
  onNetworkError?: (msg: string | null) => void;
}

export function HomePage({ onNetworkError }: HomePageProps) {
  const { theme, toggleTheme } = useTheme();
  const { t, locale, isRtl, localize } = useLocale();
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  const catalogRevealRef = useScrollReveal<HTMLElement>();
  const installmentsRevealRef = useScrollReveal<HTMLElement>();
  const contactRevealRef = useScrollReveal<HTMLElement>();

  const {
    data,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['home', 'catalog'],
    queryFn: async () => {
      const [prods, cats, pls] = await Promise.all([
        productService.listProducts({ sort: 'latest' }),
        productService.listCategories(),
        productService.listInstallmentPlans(),
      ]);
      return {
        allProducts: prods,
        featuredProducts: prods.slice(0, 6),
        categories: cats,
        plans: pls,
      };
    },
  });

  const allProducts = data?.allProducts ?? [];
  const products = data?.featuredProducts ?? [];
  const categories = data?.categories ?? [];
  const plans = data?.plans ?? [];
  const activeCategoryCards = useMemo(
    () => deriveActiveCategoryCards(categories, allProducts),
    [categories, allProducts]
  );
  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : 'Could not load storefront catalog.'
    : null;

  useEffect(() => {
    onNetworkError?.(error);
  }, [error, onNetworkError]);

  const origin =
    typeof window !== 'undefined' ? window.location.origin : STORE_CONFIG.siteUrl;

  const homeJsonLd = useMemo(
    () => [
      buildOrganizationJsonLd(origin),
      buildWebSiteJsonLd(origin, locale),
      buildLocalBusinessJsonLd(origin),
      buildFaqPageJsonLd(locale),
    ],
    [origin, locale]
  );

  return (
    <>
      <SeoHead
        title={
          locale === 'ur'
            ? 'سنیماٹک آرٹس — ملبوسات، ان سٹچڈ سوٹ اور اقساط'
            : 'Cinematic Arts (CA) — Clothing & PKR Installments'
        }
        description={t.hero.subtitle}
        canonicalPath={localize('/')}
        locale={locale}
        jsonLd={homeJsonLd}
      />

      {/* Section 1: Storefront Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-6 pb-12 sm:px-6 sm:pt-10">
        <div className="glass-panel overflow-hidden rounded-2xl p-6 sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            <div className="flex flex-col justify-between lg:col-span-5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-medium text-[var(--ca-text-muted)]">
                  {t.locationShort}
                </span>
                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label={theme === 'light' ? t.footer.darkMode : t.footer.lightMode}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[10px] bg-[var(--ca-surface-subtle)] px-3.5 py-2 text-xs font-medium text-[var(--ca-text)] hover:opacity-85"
                >
                  {theme === 'light' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                  <span>{theme === 'light' ? t.footer.darkMode : t.footer.lightMode}</span>
                </button>
              </div>

              <div className="mt-6">
                <h1
                  className={`font-display text-4xl font-semibold text-[var(--ca-text)] sm:text-5xl ${
                    isRtl ? 'leading-[1.85] sm:leading-[1.8]' : 'leading-[1.1]'
                  }`}
                >
                  {t.hero.title}
                </h1>
                <p className="mt-4 max-w-md text-base leading-relaxed text-[var(--ca-text-muted)]">
                  {t.hero.subtitle}
                </p>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to={localize('/shop')}
                  className="btn-press inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--ca-text)] px-6 py-3 text-sm font-semibold text-[var(--ca-bg)] hover:opacity-90"
                >
                  {t.hero.shopCollection}
                  <ArrowIcon className="h-4 w-4" />
                </Link>
                <a
                  href="#installments"
                  className="btn-press inline-flex min-h-[44px] items-center rounded-xl bg-[var(--ca-surface-subtle)] px-5 py-3 text-sm font-medium text-[var(--ca-text)] hover:opacity-85"
                >
                  {t.hero.installmentPlans}
                </a>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-[var(--ca-surface-subtle)]">
                <ResilientImage
                  src="/src/assets/images/womens_unstitched_suit_1795333234539.jpg"
                  alt="Women's unstitched embroidered 3-piece clothing fabric at Cinematic Arts Peshawar"
                  width={900}
                  height={675}
                  priority
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <Truck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ca-accent)]" />
              <div>
                <p className="text-sm font-semibold text-[var(--ca-text)]">{t.hero.codTitle}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[var(--ca-text-muted)]">
                  {t.hero.codDesc}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ca-accent)]" />
              <div>
                <p className="text-sm font-semibold text-[var(--ca-text)]">{t.hero.plansTitle}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[var(--ca-text-muted)]">
                  {t.hero.plansDesc}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ca-accent)]" />
              <div>
                <p className="text-sm font-semibold text-[var(--ca-text)]">{t.hero.exchangeTitle}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[var(--ca-text-muted)]">
                  {t.hero.exchangeDesc}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: 2-Column Products Grid + Categories */}
      <section ref={catalogRevealRef} className="ca-reveal mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-3xl font-semibold text-[var(--ca-text)] sm:text-4xl">
            {t.home.featuredProducts}
          </h2>
          <Link
            to={localize('/shop')}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-[var(--ca-accent)] hover:underline"
          >
            {t.home.viewAllProducts} <ArrowIcon className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6">
          {loading ? (
            <ProductGridSkeleton count={6} />
          ) : error ? (
            <FriendlyErrorState
              title="Could not load featured products"
              message={error}
              error={queryError}
              onRetry={() => refetch()}
            />
          ) : products.length === 0 ? (
            <div className="glass-panel rounded-2xl p-8 text-center">
              <p className="font-display text-xl font-semibold text-[var(--ca-text)]">
                {t.home.noProductsTitle}
              </p>
              <p className="mt-1.5 text-sm text-[var(--ca-text-muted)]">
                {t.home.noProductsDesc}
              </p>
            </div>
          ) : (
            <div className="ca-fade-in grid grid-cols-2 gap-3 sm:gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>

        {/* Shop by Category (only real listed products, never fake/seed items) */}
        {!loading && !error && activeCategoryCards.length > 0 && (
          <div className="mt-16">
            <h3 className="font-display text-2xl font-semibold text-[var(--ca-text)] sm:text-3xl">
              {t.home.shopByCategory}
            </h3>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {activeCategoryCards.map((cat) => (
                <Link
                  key={cat.id}
                  to={localize(`/category/${cat.slug}`)}
                  className="glass-panel group overflow-hidden rounded-2xl p-2.5 transition-transform duration-200 hover:-translate-y-0.5 sm:p-3"
                >
                  <div className="aspect-[4/3] overflow-hidden rounded-xl bg-[var(--ca-surface-subtle)]">
                    <ResilientImage
                      src={cat.image}
                      alt={`${cat.name} — ${cat.latestProductTitle || 'Cinematic Arts'}`}
                      width={400}
                      height={300}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <p className="mt-2.5 text-sm font-semibold text-[var(--ca-text)]">
                    {cat.name}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-[var(--ca-text-muted)]">
                    {cat.productCount} {cat.productCount === 1 ? 'product' : 'products'} ·{' '}
                    {cat.latestProductTitle}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Section 3: About, Installments & Real-Time Calculator */}
      <section ref={installmentsRevealRef} id="installments" className="ca-reveal mx-auto max-w-6xl space-y-6 px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="glass-panel flex flex-col justify-between rounded-2xl p-6 sm:p-8">
            <div>
              <h2 className="font-display text-3xl font-semibold text-[var(--ca-text)]">
                {t.home.aboutTitle}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-[var(--ca-text-muted)]">
                {t.home.aboutBody}
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-4 text-xs font-medium">
              <Link to={localize('/about')} className="inline-flex min-h-[36px] items-center text-[var(--ca-accent)] hover:underline">
                {t.home.readStory}
              </Link>
              <Link to={localize('/size-guide')} className="inline-flex min-h-[36px] items-center text-[var(--ca-text-muted)] hover:text-[var(--ca-text)] hover:underline">
                {t.nav.sizeGuide}
              </Link>
              <Link to={localize('/shipping')} className="inline-flex min-h-[36px] items-center text-[var(--ca-text-muted)] hover:text-[var(--ca-text)] hover:underline">
                {t.nav.shipping}
              </Link>
            </div>
          </div>

          <div className="glass-panel flex flex-col justify-between rounded-2xl p-6 sm:p-8">
            <div>
              <h2 className="font-display text-3xl font-semibold text-[var(--ca-text)]">
                {t.home.howInstallmentsTitle}
              </h2>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--ca-text-muted)]">
                <li>
                  <strong className="text-[var(--ca-text)]">Pick a schedule:</strong> Choose a
                  2-month (15%), 3-month (25%), or 4-month (40% interest) plan to see your exact
                  monthly amount in PKR.
                </li>
                <li>
                  <strong className="text-[var(--ca-text)]">Add a Seller Referral ID:</strong> Enter
                  a verified seller code (such as{' '}
                  <span className="font-mono-nums font-medium text-[var(--ca-text)]">CA-XXXXXX</span>
                  ) when ordering on installments, or check out with Cash on Delivery without a code.
                </li>
                <li>
                  <strong className="text-[var(--ca-text)]">Follow each payment:</strong> Check
                  shipping progress and paid versus remaining installments anytime inside My Orders.
                </li>
              </ul>
            </div>
            <div className="mt-5">
              <Link to={localize('/faq')} className="inline-flex min-h-[36px] items-center text-xs font-medium text-[var(--ca-accent)] hover:underline">
                {t.home.readFaq}
              </Link>
            </div>
          </div>
        </div>

        <InstallmentCalculator products={allProducts} plans={plans} />
      </section>

      {/* Section 4: Direct Contact */}
      <section ref={contactRevealRef} id="contact" className="ca-reveal mx-auto max-w-6xl px-4 pt-2 pb-16 sm:px-6">
        <div className="glass-panel flex flex-col items-start justify-between gap-6 rounded-2xl p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <h2 className="font-display text-3xl font-semibold text-[var(--ca-text)]">
              {t.home.needHelpTitle}
            </h2>
            <p className="mt-1.5 text-sm text-[var(--ca-text-muted)]">
              {t.home.needHelpSubtitle}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={`mailto:${STORE_CONFIG.email}`}
              className="btn-press inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--ca-surface-subtle)] px-4 py-2.5 text-xs font-semibold text-[var(--ca-text)] hover:opacity-85"
            >
              <Mail className="h-3.5 w-3.5 text-[var(--ca-accent)]" />
              {t.home.emailUs}
            </a>
            <a
              href={`tel:${STORE_CONFIG.phoneDisplay}`}
              className="btn-press inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--ca-surface-subtle)] px-4 py-2.5 text-xs font-semibold text-[var(--ca-text)] hover:opacity-85"
            >
              <Phone className="h-3.5 w-3.5 text-[var(--ca-accent)]" />
              {STORE_CONFIG.phoneDisplay}
            </a>
            <a
              href={STORE_CONFIG.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-press inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--ca-text)] px-4 py-2.5 text-xs font-semibold text-[var(--ca-bg)] hover:opacity-90"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {t.home.whatsapp}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
