import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import {
  clearGlobalError,
  normalizeAppError,
  reportGlobalError,
} from '../services/errorHandling';
import { captureAppException } from '../services/sentry';

function handleGlobalQueryFailure(error: unknown, source: 'query' | 'mutation') {
  const normalized = normalizeAppError(error);
  if (normalized.kind === 'offline' || normalized.kind === 'timeout' || normalized.kind === 'server') {
    captureAppException(error, {
      referenceId: normalized.referenceId,
      kind: normalized.kind,
      status: normalized.status,
      source,
    });
    reportGlobalError(error, () => {
      void queryClient.refetchQueries({ type: 'active' });
    });
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError(error) {
      handleGlobalQueryFailure(error, 'query');
    },
    onSuccess() {
      clearGlobalError();
    },
  }),
  mutationCache: new MutationCache({
    onError(error) {
      handleGlobalQueryFailure(error, 'mutation');
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes CDN/client cache freshness
      gcTime: 15 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

/**
 * Wipe all cached user/admin/catalog queries and ephemeral cart/wishlist storage on logout or account deletion.
 */
export function clearAllClientCaches() {
  queryClient.clear();
  clearGlobalError();
  try {
    localStorage.removeItem('ca_cart_v1');
    localStorage.removeItem('ca_wishlist_v1');
    localStorage.removeItem('ca_mock_session_v1');
    sessionStorage.clear();
  } catch {
    // ignore storage access issues
  }
}
