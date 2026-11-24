import { useEffect } from 'react';
import {
  updateDocumentHead,
  type ProductSeoMeta,
  type SeoHeadConfig,
} from '../services/seoService';

import type { Locale } from '../i18n';

export interface SeoHeadProps {
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

export function SeoHead({
  title,
  description,
  canonicalPath,
  image,
  type = 'website',
  noIndex = false,
  locale,
  productMeta,
  jsonLd,
}: SeoHeadProps) {
  useEffect(() => {
    const config: SeoHeadConfig = {
      title,
      description,
      canonicalPath,
      image,
      type,
      noIndex,
      locale,
      productMeta,
      jsonLd,
    };
    updateDocumentHead(config);
  }, [title, description, canonicalPath, image, type, noIndex, locale, productMeta, jsonLd]);

  return null;
}
