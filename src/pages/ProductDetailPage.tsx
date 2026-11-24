import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Heart, Minus, Plus, Ruler, ShoppingBag } from 'lucide-react';
import { productService } from '../api';
import { calculateInstallmentPlan, deriveProductStockStatus, formatPKR } from '../utils/commerce';
import { urlSlugSchema } from '../utils/validation';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { ProductCard, ResilientImage } from '../components/ProductCard';
import { ProductDetailSkeleton, FriendlyErrorState } from '../components/Skeletons';
import { CAProcessButton } from '../components/CALoader';
import { SeoHead } from '../components/SeoHead';
import { useLocale } from '../i18n';
import { buildProductSeoConfig, deriveProductSku } from '../services/seoService';
import { STORE_CONFIG } from '../services/siteConfig';
import { resolveProductSlugRedirect } from '../services/slugRedirects';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

export function ProductDetailPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { t, locale, isRtl, localize } = useLocale();
  const { addItem, openBuySheet, isWishlisted, toggleWishlist } = useCart();
  const { showToast } = useToast();

  const redirectedSlug = useMemo(() => resolveProductSlugRedirect(slug), [slug]);
  const slugValid = useMemo(() => urlSlugSchema.safeParse(slug).success, [slug]);

  const {
    data,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['product', slug],
    enabled: Boolean(slug && slugValid && !redirectedSlug),
    queryFn: async () => {
      const [prod, pls, catalog] = await Promise.all([
        productService.getProductBySlug(slug),
        productService.listInstallmentPlans(),
        productService.listProducts({ sort: 'latest', limit: 12 }),
      ]);
      return { product: prod, plans: pls, catalog };
    },
  });

  const product = data?.product ?? null;
  const plans = data?.plans ?? [];
  const catalog = data?.catalog ?? [];

  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [addedStatus, setAddedStatus] = useState<'idle' | 'success'>('idle');
  const [heartPopKey, setHeartPopKey] = useState(0);

  useEffect(() => {
    if (product) {
      setSelectedImage(product.coverImage);
      setSelectedSize(product.sizes?.[0] || 'One Size');
    }
  }, [product]);

  useEffect(() => {
    if (plans.length > 0 && !selectedPlanId) {
      setSelectedPlanId(plans[0].id);
    }
  }, [plans, selectedPlanId]);

  const activePlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) || plans[0],
    [plans, selectedPlanId]
  );

  const calc = useMemo(() => {
    if (!product || !activePlan) return null;
    return calculateInstallmentPlan(product.price, quantity, activePlan);
  }, [product, activePlan, quantity]);

  const relatedProducts = useMemo(() => {
    if (!product || catalog.length === 0) return [];
    const sameCategory = catalog.filter(
      (p) => p.id !== product.id && p.categoryId === product.categoryId
    );
    const others = catalog.filter(
      (p) => p.id !== product.id && p.categoryId !== product.categoryId
    );
    return [...sameCategory, ...others].slice(0, 4);
  }, [product, catalog]);

  if (redirectedSlug) {
    return <Navigate to={localize(`/product/${redirectedSlug}`)} replace />;
  }

  if (!slugValid) {
    return (
      <>
        <SeoHead
          title={`${t.product.notFoundTitle} — ${t.brand}`}
          description={t.product.notFoundDesc}
          canonicalPath={localize('/shop')}
          locale={locale}
          noIndex
        />
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="font-display text-3xl font-semibold">{t.product.notFoundTitle}</h1>
          <p className="mt-2 text-sm text-[var(--ca-text-muted)]">
            {t.product.notFoundDesc}
          </p>
          <Link
            to={localize('/shop')}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--ca-text)] px-5 py-2.5 text-sm font-semibold text-[var(--ca-bg)]"
          >
            {t.product.backToCollection}
          </Link>
        </div>
      </>
    );
  }

  if (loading) {
    return <ProductDetailSkeleton />;
  }

  if (queryError) {
    return (
      <>
        <SeoHead
          title={`Could Not Load Product — ${t.brand}`}
          description="Unable to load product details right now. Please try again."
          canonicalPath={localize(slug ? `/product/${slug}` : '/shop')}
          locale={locale}
          noIndex
        />
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <FriendlyErrorState
            title="Could not load product"
            message={queryError instanceof Error ? queryError.message : 'Unable to load product details.'}
            error={queryError}
            onRetry={() => refetch()}
          />
        </div>
      </>
    );
  }

  if (!product) {
    return (
      <>
        <SeoHead
          title={`${t.product.notFoundTitle} — ${t.brand}`}
          description={t.product.notFoundDesc}
          canonicalPath={localize(slug ? `/product/${slug}` : '/shop')}
          locale={locale}
          noIndex
        />
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="font-display text-3xl font-semibold">{t.product.notFoundTitle}</h1>
          <p className="mt-2 text-sm text-[var(--ca-text-muted)]">
            {t.product.notFoundDesc}
          </p>
          <Link
            to={localize('/shop')}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--ca-text)] px-5 py-2.5 text-sm font-semibold text-[var(--ca-bg)]"
          >
            {t.product.backToCollection}
          </Link>
        </div>
      </>
    );
  }

  const allImages = [product.coverImage, ...(product.extraImages || [])];
  const origin =
    typeof window !== 'undefined' ? window.location.origin : STORE_CONFIG.siteUrl;
  const productSeo = buildProductSeoConfig(product, origin, locale);
  const categorySlug = product.categoryId.replace(/^cat-/i, '');
  const sku = deriveProductSku(product);
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;
  const stockStatus = deriveProductStockStatus(product);
  const maxQuantity =
    typeof stockStatus.remainingUnits === 'number' && stockStatus.remainingUnits > 0
      ? Math.min(20, stockStatus.remainingUnits)
      : 20;
  const stockBadgeLabel =
    stockStatus.level === 'out_of_stock'
      ? t.product.outOfStock
      : stockStatus.level === 'low_stock'
      ? typeof stockStatus.remainingUnits === 'number'
        ? `${t.product.lowStock} (${stockStatus.remainingUnits} left)`
        : t.product.lowStock
      : t.product.inStock;
  const stockBadgeClasses =
    stockStatus.level === 'out_of_stock'
      ? 'bg-red-500/12 text-red-700 dark:text-red-300'
      : stockStatus.level === 'low_stock'
      ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
      : 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300';

  return (
    <>
      <SeoHead {...productSeo} />

      <section className="ca-fade-in mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs
          items={[
            { label: t.nav.home, to: localize('/') },
            { label: t.nav.shop, to: localize('/shop') },
            { label: product.categoryName, to: localize(`/category/${categorySlug}`) },
            { label: product.title },
          ]}
        />

        <Link
          to={localize('/shop')}
          className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-medium text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]"
        >
          <BackIcon className="h-3.5 w-3.5" />
          {t.product.backToCollection}
        </Link>

        <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Gallery */}
          <div className="space-y-3 lg:col-span-7">
            <div className="glass-panel overflow-hidden rounded-2xl p-2 sm:p-3">
              <div className="aspect-[4/3] overflow-hidden rounded-xl bg-[var(--ca-surface-subtle)]">
                <ResilientImage
                  src={selectedImage || product.coverImage}
                  alt={`${product.title} — ${product.categoryName}`}
                  width={800}
                  height={600}
                  priority
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            {allImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedImage(img)}
                    className={`h-20 w-24 shrink-0 overflow-hidden rounded-xl p-1 transition-all ${
                      selectedImage === img
                        ? 'ring-2 ring-[var(--ca-accent)]'
                        : 'opacity-75 hover:opacity-100'
                    }`}
                  >
                    <ResilientImage
                      src={img}
                      alt={`${product.title} gallery photo ${i + 1}`}
                      width={160}
                      height={120}
                      className="h-full w-full rounded-lg object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Contiguous Purchase Module */}
          <div className="lg:col-span-5">
            <div className="glass-panel sticky top-20 rounded-2xl p-6 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--ca-text-muted)]">
                    <Link
                      to={localize(`/category/${categorySlug}`)}
                      className="hover:text-[var(--ca-text)] hover:underline"
                    >
                      {product.categoryName}
                    </Link>
                    <span className="font-mono-nums opacity-75">
                      {t.product.skuLabel}: {sku}
                    </span>
                    <span
                      data-testid="pdp-stock-badge"
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${stockBadgeClasses}`}
                    >
                      {stockBadgeLabel}
                    </span>
                  </div>
                  <h1 className="font-display mt-1.5 text-3xl font-semibold text-[var(--ca-text)]">
                    {product.title}
                  </h1>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextSaved = !isWishlisted(product.id);
                    toggleWishlist(product.id);
                    setHeartPopKey((k) => k + 1);
                    showToast(
                      nextSaved ? `Saved ${product.title} to wishlist.` : `Removed ${product.title} from wishlist.`,
                      'info'
                    );
                  }}
                  aria-label={isWishlisted(product.id) ? `Remove ${product.title} from wishlist` : `Save ${product.title} to wishlist`}
                  aria-pressed={isWishlisted(product.id)}
                  className="btn-press inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-[var(--ca-border)] bg-[var(--ca-surface-solid)] text-[var(--ca-text)] hover:bg-[var(--ca-surface-subtle)]"
                >
                  <Heart
                    key={heartPopKey}
                    className={`h-4 w-4 ${
                      heartPopKey > 0 ? 'ca-heart-pop' : ''
                    } ${
                      isWishlisted(product.id)
                        ? 'fill-[var(--ca-accent)] text-[var(--ca-accent)]'
                        : ''
                    }`}
                  />
                </button>
              </div>
              <p className="font-mono-nums mt-3 text-2xl font-bold text-[var(--ca-text)]">
                {formatPKR(product.price)}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-[var(--ca-text-muted)]">
                {product.description}
              </p>

              {/* Size & Quantity */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-2">
                {product.sizes && (
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-[var(--ca-text-muted)]">
                        {t.product.sizeLabel}
                      </span>
                      <Link
                        to={localize('/size-guide')}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--ca-accent)] hover:underline"
                      >
                        <Ruler className="h-3 w-3" />
                        {t.product.sizeGuideLink}
                      </Link>
                    </div>
                    <div className="mt-1.5 flex gap-1.5">
                      {product.sizes.map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setSelectedSize(sz)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                            selectedSize === sz
                              ? 'border-[var(--ca-text)] bg-[var(--ca-text)] text-[var(--ca-bg)]'
                              : 'border-[var(--ca-border)] text-[var(--ca-text)]'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <span className="block text-xs font-medium text-[var(--ca-text-muted)]">
                    {t.product.quantityLabel}
                  </span>
                  <div className="mt-1.5 inline-flex items-center rounded-xl border border-[var(--ca-border)]">
                    <button
                      type="button"
                      disabled={!stockStatus.isAvailable}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      aria-label="Decrease quantity"
                      className="p-2 disabled:opacity-40"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="font-mono-nums min-w-[2rem] text-center text-sm font-medium">
                      {Math.min(quantity, maxQuantity)}
                    </span>
                    <button
                      type="button"
                      disabled={!stockStatus.isAvailable}
                      onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                      aria-label="Increase quantity"
                      className="p-2 disabled:opacity-40"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Installments Preview */}
              {plans.length > 0 && calc && activePlan && (
                <div className="mt-6 rounded-xl bg-[var(--ca-surface-subtle)] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-[var(--ca-text)]">
                      Installment Plan Preview
                    </p>
                    <span className="font-mono-nums text-[11px] font-semibold text-[var(--ca-accent)]">
                      {calc.markupPercent}% Interest
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {plans.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPlanId(p.id)}
                        className={`rounded-[10px] px-2.5 py-1.5 text-xs font-medium ${
                          selectedPlanId === p.id
                            ? 'bg-[var(--ca-accent)] text-[var(--ca-accent-fg)]'
                            : 'bg-[var(--ca-surface-solid)] text-[var(--ca-text-muted)]'
                        }`}
                      >
                        {p.label} ({p.markupPercent}%)
                      </button>
                    ))}
                  </div>
                  <dl className="space-y-1 text-xs pt-2">
                    <div className="flex justify-between">
                      <dt className="text-[var(--ca-text-muted)]">Interest ({calc.markupPercent}%)</dt>
                      <dd className="font-mono-nums font-medium text-[var(--ca-accent)]">
                        + {formatPKR(calc.markupAmount)}
                      </dd>
                    </div>
                    {calc.advancePercent > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-[var(--ca-text-muted)]">Advance ({calc.advancePercent}%)</dt>
                        <dd className="font-mono-nums font-medium text-[var(--ca-text)]">
                          {formatPKR(calc.advanceAmount)}
                        </dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-[var(--ca-text-muted)]">Monthly ({calc.months} mos)</dt>
                      <dd className="font-mono-nums font-semibold text-[var(--ca-text)]">
                        {formatPKR(calc.monthlyAmount)} / mo
                      </dd>
                    </div>
                    <div className="flex justify-between pt-1">
                      <dt className="font-semibold text-[var(--ca-text)]">Total on Plan</dt>
                      <dd className="font-mono-nums font-bold text-[var(--ca-text)]">
                        {formatPKR(calc.totalPayable)}
                      </dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    disabled={!stockStatus.isAvailable}
                    onClick={() =>
                      openBuySheet(product, Math.min(quantity, maxQuantity), selectedSize, {
                        paymentMethod: 'installments',
                        planId: activePlan.id,
                      })
                    }
                    className={`w-full rounded-xl border border-[var(--ca-accent)]/40 bg-[var(--ca-accent)]/10 py-2 text-xs font-semibold text-[var(--ca-text)] ${
                      stockStatus.isAvailable
                        ? 'hover:bg-[var(--ca-accent)]/20'
                        : 'cursor-not-allowed opacity-50'
                    }`}
                  >
                    {stockStatus.isAvailable
                      ? `Buy on ${activePlan.label} Plan (${formatPKR(calc.totalPayable)})`
                      : t.product.outOfStock}
                  </button>
                </div>
              )}

              {!stockStatus.isAvailable && (
                <p
                  role="status"
                  className="mt-4 rounded-xl bg-[var(--ca-surface-subtle)] px-3.5 py-2.5 text-xs text-[var(--ca-text-muted)]"
                >
                  This piece is currently out of stock. Save it to your wishlist or message us on WhatsApp for restock timing.
                </p>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <CAProcessButton
                  type="button"
                  disabled={!stockStatus.isAvailable}
                  status={addedStatus}
                  onClick={() => {
                    if (!stockStatus.isAvailable) return;
                    addItem(product, Math.min(quantity, maxQuantity), selectedSize);
                    setAddedStatus('success');
                    showToast(`Added ${product.title} to bag.`, 'success');
                    window.setTimeout(() => setAddedStatus('idle'), 900);
                  }}
                  className={`flex-1 rounded-xl border border-[var(--ca-border)] py-3 text-sm font-medium text-[var(--ca-text)] ${
                    stockStatus.isAvailable
                      ? 'hover:bg-[var(--ca-surface-subtle)]'
                      : 'cursor-not-allowed opacity-50'
                  }`}
                >
                  {t.product.addToBag}
                </CAProcessButton>
                <button
                  type="button"
                  disabled={!stockStatus.isAvailable}
                  onClick={() => openBuySheet(product, Math.min(quantity, maxQuantity), selectedSize)}
                  className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold ${
                    stockStatus.isAvailable
                      ? 'btn-press bg-[var(--ca-text)] text-[var(--ca-bg)] hover:opacity-90'
                      : 'cursor-not-allowed bg-[var(--ca-surface-subtle)] text-[var(--ca-text-muted)] opacity-60'
                  }`}
                >
                  <ShoppingBag className="h-4 w-4" />
                  {stockStatus.isAvailable ? t.product.buyNow : t.product.outOfStock}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products for Internal Linking */}
        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="font-display text-2xl font-semibold text-[var(--ca-text)] sm:text-3xl">
              {t.product.relatedTitle}
            </h2>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
              {relatedProducts.map((rel) => (
                <ProductCard key={rel.id} product={rel} />
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
