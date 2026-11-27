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
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
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
  imageAlt,
  imageWidth,
  imageHeight,
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
      imageAlt,
      imageWidth,
      imageHeight,
      type,
      noIndex,
      locale,
      productMeta,
      jsonLd,
    };
    updateDocumentHead(config);
  }, [title, description, canonicalPath, image, imageAlt, imageWidth, imageHeight, type, noIndex, locale, productMeta, jsonLd]);

  return null;
}
