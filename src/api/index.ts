import { mockAdapter } from './adapters/mockAdapter';
import { restAdapter } from './adapters/restAdapter';
import { supabaseAdapter } from './adapters/supabaseAdapter';
import type { BackendApi } from './types';

const selectedBackend = (import.meta.env.VITE_BACKEND || 'mock').toLowerCase();

function resolveAdapter(): BackendApi {
  switch (selectedBackend) {
    case 'supabase':
      return supabaseAdapter;
    case 'rest':
      return restAdapter;
    case 'mock':
    default:
      return mockAdapter;
  }
}

export const api: BackendApi = resolveAdapter();

export const {
  authService,
  productService,
  orderService,
  userService,
  notificationService,
  feedbackService,
  adminService,
  storageService,
} = api;
