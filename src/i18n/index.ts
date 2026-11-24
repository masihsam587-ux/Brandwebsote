import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { enDictionary, type TranslationDictionary } from './en';
import { urDictionary } from './ur';

export type Locale = 'en' | 'ur';

export function getLocaleFromPath(pathname: string): Locale {
  const normalized = (pathname || '/').trim();
  if (normalized === '/ur' || normalized.startsWith('/ur/')) {
    return 'ur';
  }
  return 'en';
}

export function stripLocalePrefix(pathname: string): string {
  const clean = (pathname || '/').split('?')[0].split('#')[0];
  if (clean === '/ur' || clean === '/ur/') return '/';
  if (clean.startsWith('/ur/')) {
    const rest = clean.slice(3);
    return rest.startsWith('/') ? rest : `/${rest}`;
  }
  return clean || '/';
}

export function localizePath(path: string, locale: Locale): string {
  const raw = (path || '/').trim();
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('#')) {
    return raw;
  }

  const hashIdx = raw.indexOf('#');
  const hashPart = hashIdx >= 0 ? raw.slice(hashIdx) : '';
  const beforeHash = hashIdx >= 0 ? raw.slice(0, hashIdx) : raw;

  const qIdx = beforeHash.indexOf('?');
  const pathOnly = qIdx >= 0 ? beforeHash.slice(0, qIdx) : beforeHash;
  const queryPart = qIdx >= 0 ? beforeHash.slice(qIdx) : '';

  const basePath = stripLocalePrefix(pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`);

  if (locale === 'ur') {
    const urPath = basePath === '/' ? '/ur' : `/ur${basePath}`;
    return `${urPath}${queryPart}${hashPart}`;
  }

  return `${basePath}${queryPart}${hashPart}`;
}

export function getAlternateLocalePaths(pathname: string, search = ''): {
  en: string;
  ur: string;
  xDefault: string;
} {
  const basePath = stripLocalePrefix(pathname);
  const query = search && search !== '?' ? (search.startsWith('?') ? search : `?${search}`) : '';
  const en = `${basePath}${query}`;
  const ur = `${basePath === '/' ? '/ur' : `/ur${basePath}`}${query}`;
  return { en, ur, xDefault: en };
}

export function getDictionary(locale: Locale): TranslationDictionary {
  return locale === 'ur' ? urDictionary : enDictionary;
}

export function useLocale() {
  const { pathname, search } = useLocation();
  return useMemo(() => {
    const locale = getLocaleFromPath(pathname);
    const t = getDictionary(locale);
    const otherLocale: Locale = locale === 'ur' ? 'en' : 'ur';
    return {
      locale,
      isRtl: locale === 'ur',
      dir: t.dir,
      t,
      basePath: stripLocalePrefix(pathname),
      localize: (path: string, targetLocale: Locale = locale) => localizePath(path, targetLocale),
      alternateHref: localizePath(`${stripLocalePrefix(pathname)}${search}`, otherLocale),
    };
  }, [pathname, search]);
}
