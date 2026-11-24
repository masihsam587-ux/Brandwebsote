import type { BackendApi } from '../types';
import {
  supabaseAdapter as rawSupabaseAdapter,
  subscribeToUserRealtime as rawSubscribeToUserRealtime,
} from '../supabaseAdapter.js';

export const supabaseAdapter = rawSupabaseAdapter as BackendApi;

export const subscribeToUserRealtime: (userId: string, onChange: () => void) => () => void =
  rawSubscribeToUserRealtime;
