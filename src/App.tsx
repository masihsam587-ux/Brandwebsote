/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { queryClient as defaultQueryClient } from './api/queryClient';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { IntroSplash } from './components/IntroSplash';
import { Layout } from './components/Layout';
import { PurchaseSheet } from './components/PurchaseSheet';
import { CALoader } from './components/CALoader';
import { RouteSeoManager } from './components/RouteSeoManager';
import { isValidAdminHash } from './utils/security';

// Synchronous imports for all public indexable pages -> full pre-rendered & SSR HTML
import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { CategoryPage } from './pages/CategoryPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { AboutPage } from './pages/AboutPage';
import { FaqPage } from './pages/FaqPage';
import { SizeGuidePage } from './pages/SizeGuidePage';
import { ShippingPage } from './pages/ShippingPage';
import { ContactPage } from './pages/ContactPage';
import { TermsPage, PrivacyPage } from './pages/LegalPages';
import { NotFoundPage } from './pages/NotFoundPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';

// Lazy-load private noindex routes to keep initial public storefront bundle small for CWV
const OrdersPage = lazy(() =>
  import('./pages/OrdersPage').then((m) => ({ default: m.OrdersPage }))
);
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);
const AuthPage = lazy(() =>
  import('./pages/AuthPage').then((m) => ({ default: m.AuthPage }))
);
const AdminPage = lazy(() =>
  import('./pages/AdminPage').then((m) => ({ default: m.AdminPage }))
);
const AdminModal = lazy(() =>
  import('./components/AdminModal').then((m) => ({ default: m.AdminModal }))
);

function PrivateRouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <CALoader size="lg" label="Loading view..." />
    </div>
  );
}

function PrivateShell({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PrivateRouteFallback />}>{children}</Suspense>;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

export interface AppShellProps {
  queryClient?: QueryClient;
}

export function AppShell({ queryClient = defaultQueryClient }: AppShellProps) {
  const [adminOpen, setAdminOpen] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);

  const handleCloseAdmin = () => {
    setAdminOpen(false);
    if (
      typeof window !== 'undefined' &&
      isValidAdminHash(window.location.hash)
    ) {
      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search
      );
    }
  };

  // Hidden Admin Access: #admin hash route + Ctrl+Shift+A (or Cmd+Shift+A)
  useEffect(() => {
    const syncHash = () => {
      if (isValidAdminHash(window.location.hash)) {
        setAdminOpen(true);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setAdminOpen((prev) => {
          const next = !prev;
          if (!next && isValidAdminHash(window.location.hash)) {
            window.history.replaceState(
              null,
              '',
              window.location.pathname + window.location.search
            );
          }
          return next;
        });
      }
    };
    syncHash();
    window.addEventListener('hashchange', syncHash);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('hashchange', syncHash);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const renderStoreRoutes = (prefix: string) => {
    const p = (sub: string) => (prefix ? `${prefix}${sub === '/' ? '' : sub}` : sub);
    return (
      <>
        <Route path={p('/')} element={<HomePage onNetworkError={setNetworkError} />} />
        <Route path={p('/shop')} element={<ShopPage onNetworkError={setNetworkError} />} />
        <Route path={p('/category/:slug')} element={<CategoryPage />} />
        <Route path={p('/product/:slug')} element={<ProductDetailPage />} />
        <Route path={p('/about')} element={<AboutPage />} />
        <Route path={p('/faq')} element={<FaqPage />} />
        <Route path={p('/size-guide')} element={<SizeGuidePage />} />
        <Route path={p('/shipping')} element={<ShippingPage />} />
        <Route path={p('/contact')} element={<ContactPage />} />
        <Route path={p('/terms')} element={<TermsPage />} />
        <Route path={p('/privacy')} element={<PrivacyPage />} />
        <Route path={p('/orders')} element={<PrivateShell><OrdersPage /></PrivateShell>} />
        <Route path={p('/cart')} element={<PrivateShell><OrdersPage /></PrivateShell>} />
        <Route path={p('/checkout')} element={<PrivateShell><OrdersPage /></PrivateShell>} />
        <Route path={p('/order-confirmed')} element={<OrderConfirmationPage />} />
        <Route path={p('/profile')} element={<PrivateShell><ProfilePage /></PrivateShell>} />
        <Route path={p('/auth')} element={<PrivateShell><AuthPage /></PrivateShell>} />
        <Route path={p('/admin')} element={<PrivateShell><AdminPage /></PrivateShell>} />
      </>
    );
  };

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <CartProvider>
                <RouteSeoManager />
                <ScrollToTop />
                <IntroSplash />
                <Layout
                  networkError={networkError}
                  onRetry={() => window.location.reload()}
                >
                  <Routes>
                    {renderStoreRoutes('')}
                    {renderStoreRoutes('/ur')}
                    <Route path="/ur/*" element={<NotFoundPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Layout>
                <PurchaseSheet />
                {adminOpen && (
                  <Suspense fallback={null}>
                    <AdminModal open={adminOpen} onClose={handleCloseAdmin} />
                  </Suspense>
                )}
              </CartProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
