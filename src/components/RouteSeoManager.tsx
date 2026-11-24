import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getLocaleFromPath } from '../i18n';
import { applyRouteSeoTransition } from '../services/seoService';

const URDU_FONT_URL =
  'https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;500;600;700&display=swap';

/**
 * Keeps <title>, <meta>, <link rel="canonical">, hreflang alternates, <html lang dir>,
 * and Urdu Noto Nastaliq font stylesheet synchronized on every router transition.
 */
export function RouteSeoManager() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    const locale = getLocaleFromPath(pathname);
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ur' ? 'rtl' : 'ltr';

    if (locale === 'ur' && !document.querySelector('link[data-ca-urdu-font="true"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = URDU_FONT_URL;
      link.setAttribute('data-ca-urdu-font', 'true');
      document.head.appendChild(link);
    }

    applyRouteSeoTransition(pathname, search);
  }, [pathname, search]);

  return null;
}
