import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  ShoppingBag,
  PackageCheck,
  User as UserIcon,
  Sun,
  Moon,
  AlertTriangle,
  RefreshCw,
  WifiOff,
  Globe,
  X,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../i18n';
import { STORE_CONFIG } from '../services/siteConfig';
import {
  clearGlobalError,
  createErrorReferenceId,
  getGlobalErrorSnapshot,
  subscribeGlobalError,
  triggerGlobalErrorRetry,
} from '../services/errorHandling';
import { triggerTapRipple } from './CALoader';

interface LayoutProps {
  children: ReactNode;
  networkError?: string | null;
  onRetry?: () => void;
}

export function Layout({ children, networkError, onRetry }: LayoutProps) {
  const { theme, toggleTheme } = useTheme();
  const { totalItems } = useCart();
  const { user, unreadNotifications } = useAuth();
  const { locale, t, localize, alternateHref, basePath } = useLocale();
  const location = useLocation();
  const [isOffline, setIsOffline] = useState(false);
  const [offlineRefId, setOfflineRefId] = useState<string>('');
  const globalError = useSyncExternalStore(
    subscribeGlobalError,
    getGlobalErrorSnapshot,
    () => null
  );

  useEffect(() => {
    const initialOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
    setIsOffline(initialOffline);
    if (initialOffline) {
      setOfflineRefId((prev) => prev || createErrorReferenceId('CA'));
    }
    const goOffline = () => {
      setIsOffline(true);
      setOfflineRefId((prev) => prev || createErrorReferenceId('CA'));
    };
    const goOnline = () => {
      setIsOffline(false);
      setOfflineRefId('');
      clearGlobalError();
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  // Delegated tap ripple on any button click across the UI
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      const btn = target?.closest('button, .btn-press') as HTMLElement | null;
      if (!btn || (btn as HTMLButtonElement).disabled) return;
      if (!btn.classList.contains('btn-press')) return;
      triggerTapRipple({
        currentTarget: btn,
        clientX: e.clientX,
        clientY: e.clientY,
      } as unknown as React.PointerEvent<HTMLElement>);
    };
    document.addEventListener('pointerdown', onPointerDown, { passive: true });
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `whitespace-nowrap shrink-0 text-sm font-medium transition-colors py-2 min-h-[44px] inline-flex items-center border-b ${
      isActive
        ? 'border-[var(--ca-accent)] text-[var(--ca-text)]'
        : 'border-transparent text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]'
    }`;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--ca-bg)] text-[var(--ca-text)]">
      {/* Top Bar */}
      <header className="glass-bar pt-safe sticky top-0 z-40 border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:h-16 sm:gap-4 sm:px-6">
          <Link
            to={localize('/')}
            className="font-display inline-flex min-h-[44px] items-center text-lg font-semibold text-[var(--ca-text)] whitespace-nowrap shrink-0 sm:text-2xl"
          >
            {t.brand}
          </Link>

          <nav aria-label="Primary Navigation" className="hidden md:flex items-center gap-7">
            <NavLink to={localize('/')} end className={navLinkClass}>
              {t.nav.home}
            </NavLink>
            <NavLink to={localize('/shop')} className={navLinkClass}>
              {t.nav.shop}
            </NavLink>
            <NavLink to={localize('/orders')} className={navLinkClass}>
              {t.nav.orders}
            </NavLink>
            <NavLink to={localize('/profile')} className={navLinkClass}>
              {t.nav.profile}{unreadNotifications > 0 ? ` (${unreadNotifications})` : ''}
            </NavLink>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Link
              to={alternateHref}
              lang={locale === 'ur' ? 'en' : 'ur'}
              hrefLang={locale === 'ur' ? 'en' : 'ur'}
              className="btn-press inline-flex min-h-[44px] items-center gap-1 rounded-xl bg-[var(--ca-surface-subtle)] px-2.5 py-2 text-xs font-medium text-[var(--ca-text)] hover:opacity-85 whitespace-nowrap sm:gap-1.5 sm:px-3"
            >
              <Globe className="h-3.5 w-3.5 text-[var(--ca-accent)]" />
              <span>{t.nav.switchLangLabel}</span>
            </Link>

            <Link
              to={totalItems > 0 ? localize('/orders') : user ? localize('/shop') : localize('/auth')}
              className="btn-press inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[var(--ca-text)] px-3 py-2 text-xs font-medium text-[var(--ca-bg)] hover:opacity-90 whitespace-nowrap shrink-0 sm:gap-2 sm:px-4"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              {totalItems > 0 ? (
                <span className="inline-flex items-center gap-1.5">
                  <span>{t.nav.bag}</span>
                  <span
                    key={totalItems}
                    className="ca-badge-pop font-mono-nums inline-flex min-w-[1.25rem] items-center justify-center rounded-md bg-[var(--ca-accent)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--ca-accent-fg)]"
                  >
                    {totalItems}
                  </span>
                </span>
              ) : user ? (
                t.nav.browseShop
              ) : (
                t.nav.signIn
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Offline Connection Notice */}
      {isOffline && (
        <div
          role="status"
          data-testid="global-offline-banner"
          className="ca-fade-in sticky top-14 z-[120] border-b border-amber-500/40 bg-amber-50 px-4 py-2 text-xs text-amber-900 shadow-sm sm:top-16 dark:bg-amber-950 dark:text-amber-100"
        >
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <WifiOff className="h-4 w-4 shrink-0" />
              <span>
                You appear to be offline. Cached catalog items remain visible; live orders require a connection.
              </span>
              {offlineRefId && (
                <span className="font-mono-nums rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold">
                  Ref: {offlineRefId}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => triggerGlobalErrorRetry(onRetry)}
              className="btn-press inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-current px-3 py-1 font-medium hover:opacity-80"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Global Network / Timeout / 500 Error Banner */}
      {(globalError || networkError) && !isOffline && (
        <div
          role="alert"
          data-testid="global-error-banner"
          className="ca-fade-in sticky top-14 z-[120] border-b border-red-500/35 bg-red-50 px-4 py-2.5 text-xs text-red-800 shadow-sm sm:top-16 dark:bg-red-950 dark:text-red-100"
        >
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="font-medium">
                {globalError?.message || networkError}
              </span>
              {globalError?.referenceId && (
                <span className="font-mono-nums rounded bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold">
                  Ref: {globalError.referenceId}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => triggerGlobalErrorRetry(onRetry)}
                className="btn-press inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-current px-3 py-1 font-medium hover:opacity-80"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </button>
              {globalError && (
                <button
                  type="button"
                  onClick={clearGlobalError}
                  aria-label="Dismiss error notice"
                  className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg hover:bg-red-500/15"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Smooth 250ms Route Page Transition */}
      <main
        key={location.pathname}
        className="ca-page-enter flex-1 pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:pb-8"
      >
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-[var(--ca-surface-subtle)] pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:pb-10">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-5">
            <div className="md:col-span-2">
              <p className="font-display text-2xl font-semibold text-[var(--ca-text)]">
                {t.brandFull}
              </p>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--ca-text-muted)]">
                {t.footer.summary}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-[var(--ca-text-muted)]">
                <a href={`mailto:${STORE_CONFIG.email}`} className="inline-flex min-h-[44px] items-center hover:text-[var(--ca-text)]">
                  {STORE_CONFIG.email}
                </a>
                <a href={`tel:${STORE_CONFIG.phoneDisplay}`} className="inline-flex min-h-[44px] items-center hover:text-[var(--ca-text)]">
                  {STORE_CONFIG.phoneDisplay}
                </a>
                <a
                  href={STORE_CONFIG.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center hover:text-[var(--ca-text)]"
                >
                  {t.home.whatsapp}
                </a>
              </div>
              <p className="mt-3 text-[11px] text-[var(--ca-text-muted)]">
                {t.footer.privacyNote}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-[var(--ca-text)]">
                {t.footer.pagesHeading}
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                <li>
                  <Link
                    to={localize('/')}
                    className="inline-flex min-h-[44px] items-center text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]"
                  >
                    {t.nav.home}
                  </Link>
                </li>
                <li>
                  <Link
                    to={localize('/shop')}
                    className="inline-flex min-h-[44px] items-center text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]"
                  >
                    {t.nav.shop}
                  </Link>
                </li>
                <li>
                  <Link
                    to={localize('/about')}
                    className="inline-flex min-h-[44px] items-center text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]"
                  >
                    {t.nav.about}
                  </Link>
                </li>
                <li>
                  <Link
                    to={localize('/contact')}
                    className="inline-flex min-h-[44px] items-center text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]"
                  >
                    {t.nav.contact}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold text-[var(--ca-text)]">
                {t.footer.guidesHeading}
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                <li>
                  <Link
                    to={localize('/faq')}
                    className="inline-flex min-h-[44px] items-center text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]"
                  >
                    {t.nav.faq}
                  </Link>
                </li>
                <li>
                  <Link
                    to={localize('/size-guide')}
                    className="inline-flex min-h-[44px] items-center text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]"
                  >
                    {t.nav.sizeGuide}
                  </Link>
                </li>
                <li>
                  <Link
                    to={localize('/shipping')}
                    className="inline-flex min-h-[44px] items-center text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]"
                  >
                    {t.nav.shipping}
                  </Link>
                </li>
                <li>
                  <Link
                    to={localize('/orders')}
                    className="inline-flex min-h-[44px] items-center text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]"
                  >
                    {t.nav.orders}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold text-[var(--ca-text)]">
                {t.footer.accountHeading}
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                <li>
                  <Link
                    to={localize('/profile')}
                    className="inline-flex min-h-[44px] items-center text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]"
                  >
                    {t.nav.profile}
                  </Link>
                </li>
                <li>
                  <Link
                    to={localize('/auth')}
                    className="inline-flex min-h-[44px] items-center text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]"
                  >
                    {t.nav.signIn}
                  </Link>
                </li>
                <li>
                  <Link
                    to={localize('/terms')}
                    className="inline-flex min-h-[44px] items-center text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]"
                  >
                    {t.nav.terms}
                  </Link>
                </li>
                <li>
                  <Link
                    to={localize('/privacy')}
                    className="inline-flex min-h-[44px] items-center text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]"
                  >
                    {t.nav.privacy}
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="btn-press inline-flex min-h-[44px] items-center gap-2 text-sm text-[var(--ca-text-muted)] hover:text-[var(--ca-text)]"
                  >
                    {theme === 'light' ? (
                      <>
                        <Moon className="h-3.5 w-3.5" /> {t.footer.darkMode}
                      </>
                    ) : (
                      <>
                        <Sun className="h-3.5 w-3.5" /> {t.footer.lightMode}
                      </>
                    )}
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-start justify-between gap-2 text-xs text-[var(--ca-text-muted)] sm:flex-row sm:items-center">
            <span>© {new Date().getFullYear()} {t.footer.rights}</span>
            <span>{t.footer.currencyNote}</span>
          </div>
        </div>
      </footer>

      {/* Mobile Native Bottom Tab Navigation */}
      <nav
        aria-label="Mobile Navigation"
        className="glass-bar pb-safe fixed inset-x-0 bottom-0 z-40 border-t md:hidden"
      >
        <div className="grid h-14 grid-cols-4 items-center">
          <Link
            to={localize('/')}
            className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium ${
              basePath === '/' ? 'text-[var(--ca-accent)]' : 'text-[var(--ca-text-muted)]'
            }`}
          >
            <Home className="h-4 w-4" />
            <span>{t.nav.home}</span>
          </Link>
          <Link
            to={localize('/shop')}
            className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium ${
              basePath.startsWith('/shop') || basePath.startsWith('/product') || basePath.startsWith('/category')
                ? 'text-[var(--ca-accent)]'
                : 'text-[var(--ca-text-muted)]'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>{t.nav.shop}</span>
          </Link>
          <Link
            to={localize('/orders')}
            className={`relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium ${
              basePath.startsWith('/orders')
                ? 'text-[var(--ca-accent)]'
                : 'text-[var(--ca-text-muted)]'
            }`}
          >
            <PackageCheck className="h-4 w-4" />
            <span className="inline-flex items-center gap-1">
              {t.nav.orders}
              {totalItems > 0 && (
                <span
                  key={totalItems}
                  className="ca-badge-pop font-mono-nums rounded bg-[var(--ca-accent)] px-1 text-[10px] font-bold text-[var(--ca-accent-fg)]"
                >
                  {totalItems}
                </span>
              )}
            </span>
          </Link>
          <Link
            to={localize('/profile')}
            className={`relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium ${
              basePath.startsWith('/profile') || basePath.startsWith('/auth')
                ? 'text-[var(--ca-accent)]'
                : 'text-[var(--ca-text-muted)]'
            }`}
          >
            <UserIcon className="h-4 w-4" />
            <span>{t.nav.profile}{unreadNotifications > 0 ? ` (${unreadNotifications})` : ''}</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
