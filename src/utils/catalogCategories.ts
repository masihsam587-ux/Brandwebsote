import type { Category, Product } from '../api/types';

export interface ActiveCategoryCard {
  id: string;
  name: string;
  slug: string;
  image: string;
  productCount: number;
  latestProductTitle: string;
}

/**
 * Derives "Shop by Category" cards exclusively from real listed products.
 * Categories with zero listed products are excluded, and each card uses the
 * cover image of an actual listed product rather than static/seed stock art.
 */
export function deriveActiveCategoryCards(
  categories: Category[],
  products: Product[]
): ActiveCategoryCard[] {
  if (!Array.isArray(products) || products.length === 0) {
    return [];
  }

  const byId = new Map<string, Category>();
  const byName = new Map<string, Category>();
  for (const cat of categories) {
    byId.set(cat.id, cat);
    byName.set(cat.name.trim().toLowerCase(), cat);
  }

  const buckets = new Map<
    string,
    {
      id: string;
      name: string;
      slug: string;
      products: Product[];
    }
  >();

  for (const product of products) {
    const matched =
      byId.get(product.categoryId) ||
      byName.get((product.categoryName || '').trim().toLowerCase());

    const key = matched ? matched.id : product.categoryId || product.categoryName || 'other';
    const name = matched?.name || product.categoryName || 'Collection';
    const slug =
      matched?.slug ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') ||
      'collection';

    const existing = buckets.get(key);
    if (existing) {
      existing.products.push(product);
    } else {
      buckets.set(key, {
        id: matched?.id || product.categoryId || key,
        name,
        slug,
        products: [product],
      });
    }
  }

  const orderedCards: ActiveCategoryCard[] = [];
  const seenKeys = new Set<string>();

  for (const cat of categories) {
    const bucket = buckets.get(cat.id);
    if (!bucket || bucket.products.length === 0) continue;
    seenKeys.add(cat.id);
    orderedCards.push({
      id: bucket.id,
      name: bucket.name,
      slug: bucket.slug,
      image: bucket.products[0].coverImage,
      productCount: bucket.products.length,
      latestProductTitle: bucket.products[0].title,
    });
  }

  for (const [key, bucket] of buckets.entries()) {
    if (seenKeys.has(key) || bucket.products.length === 0) continue;
    orderedCards.push({
      id: bucket.id,
      name: bucket.name,
      slug: bucket.slug,
      image: bucket.products[0].coverImage,
      productCount: bucket.products.length,
      latestProductTitle: bucket.products[0].title,
    });
  }

  return orderedCards;
}
