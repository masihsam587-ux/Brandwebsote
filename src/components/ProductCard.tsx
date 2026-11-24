import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Package, Heart } from 'lucide-react';
import type { Product } from '../api/types';
import { useLocale } from '../i18n';
import { deriveProductStockStatus, formatPKR } from '../utils/commerce';
import { useCart } from '../context/CartContext';

interface ProductCardProps {
  product: Product;
  onQuickBuy?: (product: Product) => void;
}

function getModernImageSources(src: string): { avif?: string; webp?: string } {
  if (!src) return {};
  const match = /^(\/src\/assets\/images\/[^?#]+)\.(jpe?g|png)$/i.exec(src.trim());
  if (!match) return {};
  return {
    avif: `${match[1]}.avif`,
    webp: `${match[1]}.webp`,
  };
}

export function ResilientImage({
  src,
  alt,
  className = '',
  width = 400,
  height = 300,
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(priority);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[var(--ca-surface-subtle)] text-[var(--ca-text-muted)] ${className}`}
      >
        <Package className="h-7 w-7 opacity-50" />
        <span className="mt-2 px-3 text-center text-xs font-medium opacity-75">{alt}</span>
      </div>
    );
  }

  const modern = getModernImageSources(src);
  const imgElement = (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      referrerPolicy="no-referrer"
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      className={`${className} transition-opacity duration-200 ${
        loaded || priority ? 'opacity-100' : 'opacity-85'
      }`}
    />
  );

  if (modern.avif || modern.webp) {
    return (
      <picture className="block h-full w-full">
        {modern.avif && <source srcSet={modern.avif} type="image/avif" />}
        {modern.webp && <source srcSet={modern.webp} type="image/webp" />}
        {imgElement}
      </picture>
    );
  }

  return imgElement;
}

export function ProductCard({ product, onQuickBuy }: ProductCardProps) {
  const { openBuySheet, isWishlisted, toggleWishlist } = useCart();
  const { localize, t } = useLocale();
  const liked = isWishlisted(product.id);
  const stockStatus = deriveProductStockStatus(product);

  const handleBuy = () => {
    if (!stockStatus.isAvailable) return;
    if (onQuickBuy) onQuickBuy(product);
    else openBuySheet(product, 1, product.sizes?.[0]);
  };

  const stockLabel =
    stockStatus.level === 'out_of_stock'
      ? t.product.outOfStock
      : stockStatus.level === 'low_stock'
      ? t.product.lowStock
      : t.product.inStock;

  const stockBadgeStyle =
    stockStatus.level === 'out_of_stock'
      ? 'bg-red-500/12 text-red-700 dark:text-red-300'
      : stockStatus.level === 'low_stock'
      ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
      : 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300';

  return (
    <article
      data-testid={`product-card-${product.slug}`}
      className="ca-fade-in glass-panel group flex flex-col overflow-hidden rounded-2xl p-2 transition-transform duration-200 hover:-translate-y-0.5 sm:p-3"
    >
      <div className="relative">
        <Link
          to={localize(`/product/${product.slug}`)}
          className="relative block aspect-[4/3] w-full overflow-hidden rounded-xl bg-[var(--ca-surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ca-accent)]"
        >
          <ResilientImage
            src={product.coverImage}
            alt={`${product.title} — ${product.categoryName}`}
            className={`h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] ${
              !stockStatus.isAvailable ? 'opacity-65 grayscale-[25%]' : ''
            }`}
          />
        </Link>

        <button
          type="button"
          onClick={() => toggleWishlist(product.id)}
          aria-label={liked ? `Remove ${product.title} from wishlist` : `Save ${product.title} to wishlist`}
          aria-pressed={liked}
          className="btn-press absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--ca-surface-solid)]/90 shadow-sm transition-colors hover:bg-[var(--ca-surface-solid)]"
        >
          <Heart
            key={liked ? 'liked' : 'idle'}
            className={`h-4 w-4 transition-colors ${
              liked
                ? 'ca-heart-pop fill-red-500 text-red-500'
                : 'text-[var(--ca-text)]'
            }`}
          />
        </button>
      </div>

      <div className="flex flex-1 flex-col justify-between px-1 pt-3 pb-1 sm:px-1.5 sm:pt-3.5 sm:pb-1.5">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] text-[var(--ca-text-muted)] sm:text-xs">
            <span className="truncate">{product.categoryName}</span>
            <span
              data-testid="product-stock-badge"
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${stockBadgeStyle}`}
            >
              {stockLabel}
            </span>
          </div>
          <Link
            to={localize(`/product/${product.slug}`)}
            className="mt-1 line-clamp-2 block text-sm font-semibold leading-snug text-[var(--ca-text)] hover:text-[var(--ca-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ca-accent)] sm:mt-1.5 sm:text-base"
          >
            {product.title}
          </Link>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-1 sm:mt-4">
          <span className="font-mono-nums text-xs font-semibold text-[var(--ca-text)] sm:text-sm">
            {formatPKR(product.price)}
          </span>
          <button
            type="button"
            disabled={!stockStatus.isAvailable}
            onClick={handleBuy}
            aria-label={
              stockStatus.isAvailable
                ? `${t.product.buyNow} ${product.title}`
                : `${product.title} ${t.product.outOfStock}`
            }
            className={`inline-flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[10px] px-3.5 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ca-accent)] sm:px-4 ${
              stockStatus.isAvailable
                ? 'btn-press bg-[var(--ca-text)] text-[var(--ca-bg)] hover:opacity-90'
                : 'cursor-not-allowed bg-[var(--ca-surface-subtle)] text-[var(--ca-text-muted)] opacity-70'
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            {stockStatus.isAvailable ? t.product.buyNow.split(' ')[0] : t.product.outOfStock}
          </button>
        </div>
      </div>
    </article>
  );
}
